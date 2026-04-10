/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
	root: true,
	env: {
		es2019: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	plugins: ['@typescript-eslint', 'n8n-nodes-base'],
	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:n8n-nodes-base/community',
	],
	rules: {
		// n8n community node conventions
		'n8n-nodes-base/node-dirname-against-convention': 'error',
		'n8n-nodes-base/node-param-default-missing': 'error',
		'n8n-nodes-base/node-param-description-excess-final-period': 'error',
		'n8n-nodes-base/node-param-description-missing-final-period': 'error',

		// TypeScript
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
	},
	ignorePatterns: ['dist/', 'node_modules/', '*.js', '!.eslintrc.js'],
};
