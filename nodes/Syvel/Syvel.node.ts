import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

const SYVEL_API_BASE = 'https://api.syvel.io';

/**
 * Reason codes returned by the Syvel API.
 */
type SyvelReason = 'safe' | 'disposable' | 'undeliverable' | 'role_account';

interface SyvelResponse {
	email?: string;
	domain?: string;
	is_risky: boolean;
	risk_score: number;
	reason: SyvelReason;
	deliverability_score: number;
	is_free_provider: boolean;
	is_corporate_email: boolean;
	is_alias_email: boolean;
	mx_provider_label: string | null;
	did_you_mean: string | null;
}

interface SyvelOptions {
	failOpen?: boolean;
	timeout?: number;
}

export class Syvel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Syvel',
		name: 'syvel',
		icon: 'file:syvel.svg',
		group: ['transform'],
		version: 1,
		subtitle:
			'={{$parameter["operation"] === "checkEmail" ? "Check Email" : "Check Domain"}}',
		description: 'Detect disposable and risky email addresses with Syvel',
		defaults: {
			name: 'Syvel',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'syvelApi',
				required: true,
			},
		],
		properties: [
			// ─── Operation ────────────────────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Check Email',
						value: 'checkEmail',
						description:
							'Check whether an email address is disposable, risky, or undeliverable',
						action: 'Check an email address',
					},
					{
						name: 'Check Domain',
						value: 'checkDomain',
						description: 'Check whether a domain is disposable or risky',
						action: 'Check a domain',
					},
				],
				default: 'checkEmail',
			},

			// ─── Check Email ──────────────────────────────────────────────────────────
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'user@example.com',
				default: '',
				required: true,
				displayOptions: {
					show: { operation: ['checkEmail'] },
				},
				hint: 'The full email address to check. Only the domain part is sent to the API.',
			},

			// ─── Check Domain ─────────────────────────────────────────────────────────
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				placeholder: 'example.com',
				default: '',
				required: true,
				displayOptions: {
					show: { operation: ['checkDomain'] },
				},
				hint: 'The domain to check, e.g. yopmail.com.',
			},

			// ─── Options ──────────────────────────────────────────────────────────────
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Fail Open',
						name: 'failOpen',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'If the Syvel API returns a server error (5xx), return a partial result instead of failing the node. Recommended to avoid blocking legitimate users during API outages.',
					},
					{
						displayName: 'Timeout (ms)',
						name: 'timeout',
						type: 'number',
						default: 3000,
						description:
							'Maximum time in milliseconds to wait for the Syvel API to respond.',
						typeOptions: {
							minValue: 100,
							maxValue: 30000,
						},
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const options = this.getNodeParameter('options', i, {}) as SyvelOptions;
				const failOpen = options.failOpen ?? true;
				const timeout = options.timeout ?? 3000;

				// ── Resolve the domain to check ────────────────────────────────────────
				let domain: string;

				if (operation === 'checkEmail') {
					const raw = (this.getNodeParameter('email', i) as string).trim().toLowerCase();
					const atIndex = raw.lastIndexOf('@');

					if (atIndex === -1 || atIndex === raw.length - 1) {
						throw new NodeOperationError(
							this.getNode(),
							`"${raw}" is not a valid email address.`,
							{ itemIndex: i },
						);
					}

					domain = raw.slice(atIndex + 1);
				} else {
					domain = (this.getNodeParameter('domain', i) as string)
						.trim()
						.toLowerCase()
						.replace(/^https?:\/\//, '');
				}

				if (!domain) {
					throw new NodeOperationError(this.getNode(), 'Domain cannot be empty.', {
						itemIndex: i,
					});
				}

				// ── Call the Syvel API ─────────────────────────────────────────────────
				try {
					const response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'syvelApi',
						{
							method: 'GET',
							url: `${SYVEL_API_BASE}/v1/check/${encodeURIComponent(domain)}`,
							headers: { Accept: 'application/json' },
							timeout,
						},
					)) as SyvelResponse;

					returnData.push({
						json: response as unknown as IDataObject,
						pairedItem: { item: i },
					});
				} catch (apiError) {
					const err = apiError as Error & { httpCode?: string; statusCode?: number };
					const httpCode =
						err.httpCode ?? String(err.statusCode ?? '');

					// Fail-open: server errors must not block legitimate users
					if (failOpen && (httpCode.startsWith('5') || httpCode === '')) {
						returnData.push({
							json: {
								domain,
								is_risky: null,
								error: 'syvel_unavailable',
								error_message: 'Syvel API is temporarily unavailable.',
							},
							pairedItem: { item: i },
						});
						continue;
					}

					if (httpCode === '401') {
						throw new NodeOperationError(
							this.getNode(),
							'Authentication failed. Please check your Syvel API key.',
							{ itemIndex: i },
						);
					}

					if (httpCode === '422') {
						throw new NodeOperationError(
							this.getNode(),
							`Invalid input: "${domain}" is not a valid domain or email format.`,
							{ itemIndex: i },
						);
					}

					if (httpCode === '429') {
						throw new NodeOperationError(
							this.getNode(),
							'Syvel API rate limit exceeded. Please check your plan quota.',
							{ itemIndex: i },
						);
					}

					throw new NodeOperationError(this.getNode(), apiError as Error, {
						itemIndex: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
