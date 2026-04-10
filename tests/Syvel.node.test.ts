import { describe, it, expect, vi } from 'vitest';
import type { IExecuteFunctions, INodeProperties, INodePropertyOptions } from 'n8n-workflow';
import { Syvel } from '../nodes/Syvel/Syvel.node';
import { SyvelApi } from '../credentials/SyvelApi.credentials';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_API_RESPONSE = {
	domain: 'yopmail.com',
	is_risky: true,
	risk_score: 100,
	reason: 'disposable',
	deliverability_score: 0,
	is_free_provider: false,
	is_corporate_email: false,
	is_alias_email: false,
	mx_provider_label: null,
	did_you_mean: null,
};

interface MockContextOptions {
	operation?: string;
	email?: string;
	domain?: string;
	options?: Record<string, unknown>;
	httpResponse?: unknown;
	httpError?: Error & { httpCode?: string };
	continueOnFail?: boolean;
}

function createMockContext({
	operation = 'checkEmail',
	email = 'test@yopmail.com',
	domain = 'yopmail.com',
	options = {},
	httpResponse = MOCK_API_RESPONSE,
	httpError,
	continueOnFail = false,
}: MockContextOptions = {}): IExecuteFunctions {
	const httpFn = httpError
		? vi.fn().mockRejectedValue(httpError)
		: vi.fn().mockResolvedValue(httpResponse);

	return {
		getInputData: () => [{ json: {}, pairedItem: 0 }],
		getNodeParameter: vi.fn((name: string, _index: number, defaultValue?: unknown) => {
			const params: Record<string, unknown> = { operation, email, domain, options };
			return name in params ? params[name] : defaultValue;
		}),
		getNode: vi.fn(() => ({
			name: 'Syvel',
			type: 'syvel',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
			id: 'test-id',
		})),
		continueOnFail: vi.fn(() => continueOnFail),
		helpers: {
			httpRequestWithAuthentication: httpFn,
		},
	} as unknown as IExecuteFunctions;
}

// ─── Node description ──────────────────────────────────────────────────────────

describe('Syvel node — description', () => {
	const node = new Syvel();

	it('has correct displayName and name', () => {
		expect(node.description.displayName).toBe('Syvel');
		expect(node.description.name).toBe('syvel');
	});

	it('requires the syvelApi credential', () => {
		expect(node.description.credentials).toContainEqual({
			name: 'syvelApi',
			required: true,
		});
	});

	it('defaults to checkEmail operation', () => {
		const operationProp = node.description.properties.find(
			(p: INodeProperties) => p.name === 'operation',
		);
		expect(operationProp?.default).toBe('checkEmail');
	});

	it('exposes both checkEmail and checkDomain operations', () => {
		const operationProp = node.description.properties.find(
			(p: INodeProperties) => p.name === 'operation',
		) as INodeProperties;
		const values = (operationProp.options as INodePropertyOptions[]).map((o) => o.value);
		expect(values).toEqual(['checkEmail', 'checkDomain']);
	});

	it('has a failOpen option defaulting to true', () => {
		const optionsProp = node.description.properties.find(
			(p: INodeProperties) => p.name === 'options',
		) as INodeProperties;
		const failOpenOption = (optionsProp.options as INodeProperties[]).find(
			(o) => o.name === 'failOpen',
		);
		expect(failOpenOption?.default).toBe(true);
	});

	it('references an SVG icon', () => {
		expect(node.description.icon).toBe('file:syvel.svg');
	});
});

// ─── Credentials description ───────────────────────────────────────────────────

describe('SyvelApi credentials', () => {
	const cred = new SyvelApi();

	it('has correct name and displayName', () => {
		expect(cred.name).toBe('syvelApi');
		expect(cred.displayName).toBe('Syvel API');
	});

	it('injects Authorization header with Bearer token', () => {
		expect(cred.authenticate).toMatchObject({
			type: 'generic',
			properties: {
				headers: {
					Authorization: expect.stringContaining('Bearer'),
				},
			},
		});
	});

	it('has a credential test pointing to the Syvel API', () => {
		expect(cred.test?.request.baseURL).toBe('https://api.syvel.io');
	});
});

// ─── Node execute — happy paths ────────────────────────────────────────────────

describe('Syvel node — execute: happy paths', () => {
	it('checkEmail: calls the API with the domain extracted from the email', async () => {
		const node = new Syvel();
		const ctx = createMockContext({ operation: 'checkEmail', email: 'user@yopmail.com' });

		const result = await node.execute.call(ctx);

		const httpFn = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpFn).toHaveBeenCalledOnce();
		expect(httpFn.mock.calls[0][1]).toMatchObject({
			method: 'GET',
			url: expect.stringContaining('yopmail.com'),
		});
		expect(result[0][0].json).toMatchObject({ is_risky: true, risk_score: 100 });
	});

	it('checkEmail: is case-insensitive and trims whitespace', async () => {
		const node = new Syvel();
		const ctx = createMockContext({ operation: 'checkEmail', email: '  User@YOPMAIL.COM  ' });

		await node.execute.call(ctx);

		const httpFn = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpFn.mock.calls[0][1].url).toContain('yopmail.com');
	});

	it('checkDomain: calls the API with the domain directly', async () => {
		const node = new Syvel();
		const ctx = createMockContext({ operation: 'checkDomain', domain: 'guerrillamail.com' });

		await node.execute.call(ctx);

		const httpFn = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpFn.mock.calls[0][1].url).toContain('guerrillamail.com');
	});

	it('checkDomain: strips http(s):// prefix if present', async () => {
		const node = new Syvel();
		const ctx = createMockContext({
			operation: 'checkDomain',
			domain: 'https://guerrillamail.com',
		});

		await node.execute.call(ctx);

		const httpFn = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		// The path segment should be the bare domain, not the original https://… string
		expect(httpFn.mock.calls[0][1].url).toMatch(/\/check\/guerrillamail\.com$/);
	});

	it('passes the configured timeout to the HTTP request', async () => {
		const node = new Syvel();
		const ctx = createMockContext({
			operation: 'checkEmail',
			options: { timeout: 5000, failOpen: true },
		});

		await node.execute.call(ctx);

		const httpFn = ctx.helpers.httpRequestWithAuthentication as ReturnType<typeof vi.fn>;
		expect(httpFn.mock.calls[0][1].timeout).toBe(5000);
	});
});

// ─── Node execute — input validation ──────────────────────────────────────────

describe('Syvel node — execute: input validation', () => {
	it('throws NodeOperationError for an email without @', async () => {
		const node = new Syvel();
		const ctx = createMockContext({ operation: 'checkEmail', email: 'notanemail' });

		await expect(node.execute.call(ctx)).rejects.toThrow('not a valid email address');
	});

	it('throws NodeOperationError for an email with @ at the end', async () => {
		const node = new Syvel();
		const ctx = createMockContext({ operation: 'checkEmail', email: 'user@' });

		await expect(node.execute.call(ctx)).rejects.toThrow('not a valid email address');
	});
});

// ─── Node execute — error handling ────────────────────────────────────────────

describe('Syvel node — execute: API error handling', () => {
	it('fail-open on 5xx: returns a partial result instead of throwing', async () => {
		const node = new Syvel();
		const serverError = Object.assign(new Error('Service Unavailable'), { httpCode: '503' });
		const ctx = createMockContext({
			operation: 'checkEmail',
			email: 'user@example.com',
			options: { failOpen: true },
			httpError: serverError,
		});

		const result = await node.execute.call(ctx);
		expect(result[0][0].json).toMatchObject({
			error: 'syvel_unavailable',
			domain: 'example.com',
		});
	});

	it('throws on 5xx when failOpen is false', async () => {
		const node = new Syvel();
		const serverError = Object.assign(new Error('Internal Server Error'), { httpCode: '500' });
		const ctx = createMockContext({
			operation: 'checkEmail',
			email: 'user@example.com',
			options: { failOpen: false },
			httpError: serverError,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow();
	});

	it('throws a human-readable error on 401', async () => {
		const node = new Syvel();
		const authError = Object.assign(new Error('Unauthorized'), { httpCode: '401' });
		const ctx = createMockContext({
			operation: 'checkDomain',
			domain: 'example.com',
			httpError: authError,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('API key');
	});

	it('throws a human-readable error on 422', async () => {
		const node = new Syvel();
		const validationError = Object.assign(new Error('Unprocessable Entity'), { httpCode: '422' });
		const ctx = createMockContext({
			operation: 'checkDomain',
			domain: '!!!invalid!!!',
			httpError: validationError,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('Invalid input');
	});

	it('throws a human-readable error on 429', async () => {
		const node = new Syvel();
		const rateLimitError = Object.assign(new Error('Too Many Requests'), { httpCode: '429' });
		const ctx = createMockContext({
			operation: 'checkDomain',
			domain: 'example.com',
			httpError: rateLimitError,
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('rate limit');
	});
});

// ─── Node execute — continueOnFail ────────────────────────────────────────────

describe('Syvel node — execute: continueOnFail', () => {
	it('returns error in output instead of throwing when continueOnFail is enabled', async () => {
		const node = new Syvel();
		const ctx = createMockContext({
			operation: 'checkEmail',
			email: 'notanemail',
			continueOnFail: true,
		});

		const result = await node.execute.call(ctx);
		expect(result[0][0].json).toHaveProperty('error');
	});
});
