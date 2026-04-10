# n8n-nodes-syvel

## Testing

- Unit tests (offline, no API key needed): `npm test`
- Watch mode: `npm run test:watch`
- With coverage: `npm run test:coverage`

## Formatting & Linting

- Format: `npm run format` (uses Prettier)
- Lint: `npm run lint` (uses ESLint with `eslint-plugin-n8n-nodes-base`)

## Build

- Compile TypeScript + copy SVG to dist: `npm run build`
- Watch mode: `npm run dev`

## Key Locations

- `credentials/SyvelApi.credentials.ts` — credential definition (Bearer token + test request)
- `nodes/Syvel/Syvel.node.ts` — node logic: operations, parameters, execute, error handling
- `nodes/Syvel/syvel.svg` — node icon displayed on the n8n canvas
- `tests/Syvel.node.test.ts` — unit tests (HTTP mocked, no API key needed)
- `.github/workflows/ci.yml` — CI: lint + test + build on every push and PR
- `.github/workflows/publish.yml` — publishes to npm on GitHub Release
- `.github/dependabot.yml` — weekly automated dependency updates

## Conventions

- n8n community node: follows `n8n-nodes-base` ESLint plugin rules
- Commits use **Gitmoji** — see `.github/COMMIT_CONVENTION.md`
- No runtime dependencies (n8n's built-in `httpRequestWithAuthentication` only)
- TypeScript strict mode — no `any`, consistent type imports
- Fail-open by default: API server errors (5xx) must never block a user workflow
- Dependencies installed via `npm`
- Node.js 18+ required

## Comments

- Comments MUST only be used to:
    1. Document a function
    2. Explain the WHY of a piece of code
    3. Explain a particularly complicated piece of code
- Comments NEVER should be used to:
    1. Say what used to be there. That's no longer relevant!
    2. Explain the WHAT of a piece of code (unless it's very non-obvious)

It's ok not to put comments on/in a function if their addition wouldn't meaningfully clarify anything.
