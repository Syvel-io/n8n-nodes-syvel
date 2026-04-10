import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SyvelApi implements ICredentialType {
	name = 'syvelApi';

	displayName = 'Syvel API';

	documentationUrl = 'https://www.syvel.io/fr/docs/guides/introduction/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			hint: 'Find your API key in the Syvel dashboard under "API Keys".',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.syvel.io',
			url: '/v1/check/gmail.com',
			method: 'GET',
		},
	};
}
