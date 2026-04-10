# n8n-nodes-syvel

[![npm version](https://img.shields.io/npm/v/n8n-nodes-syvel)](https://www.npmjs.com/package/n8n-nodes-syvel)
[![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-syvel)](https://www.npmjs.com/package/n8n-nodes-syvel)
[![license](https://img.shields.io/npm/l/n8n-nodes-syvel)](LICENSE)
[![CI](https://github.com/Syvel-io/n8n-nodes-syvel/actions/workflows/ci.yml/badge.svg)](https://github.com/Syvel-io/n8n-nodes-syvel/actions/workflows/ci.yml)

Official n8n community node for [Syvel](https://www.syvel.io) — disposable email detection API.

Detect throwaway addresses, role accounts, and undeliverable domains before they pollute your database. Works with **n8n Cloud**, **self-hosted n8n**, and **n8n Desktop**.

---

## Install

In your n8n instance, go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-syvel
```

You will need a Syvel API key. Get one for free at [syvel.io/dashboard](https://www.syvel.io/dashboard).

---

## Quick start

1. Add the **Syvel** node to your workflow.
2. Create a **Syvel API** credential with your API key.
3. Select the **Check Email** operation and map an email field from a previous node.
4. Branch on `is_risky` — block, tag, or route the item accordingly.

> **Always enable Fail Open (default: on).** If the Syvel API is temporarily unavailable, the node returns a partial result instead of failing your workflow. Never let a third-party service block a legitimate user.

---

## Credentials

| Field | Description |
|---|---|
| **API Key** | Your Syvel API key (`sv_...`). Found in the [Syvel dashboard](https://www.syvel.io/dashboard) under **API Keys**. |

Once saved, n8n will verify the credential against the Syvel API automatically.

---

## Operations

### Check Email

Checks a full email address. Passing the complete address enables local-part analysis: role account detection (`admin@`, `info@`…), random-string patterns, and other signals that can only be extracted from the local part.

| Parameter | Type | Description |
|---|---|---|
| **Email** | `string` | The email address to check, e.g. `user@example.com`. |

### Check Domain

Checks a bare domain without a local part.

| Parameter | Type | Description |
|---|---|---|
| **Domain** | `string` | The domain to check, e.g. `yopmail.com`. |

---

## Options

Both operations share the following optional settings.

| Option | Type | Default | Description |
|---|---|---|---|
| **Fail Open** | `boolean` | `true` | If `true`, returns a partial result (`is_risky: null`) on API server errors (5xx) instead of failing the node. **Recommended.** |
| **Timeout (ms)** | `number` | `3000` | Maximum time in milliseconds to wait for the API. Range: 100–30 000 ms. Keep it low — the API typically responds in under 300 ms. |

---

## Response

| Field | Type | Description |
|---|---|---|
| `is_risky` | `boolean` | `true` when `risk_score` ≥ 65. Use as your primary signal. |
| `risk_score` | `number` | 0 (safe) → 100 (confirmed disposable). |
| `reason` | `string` | `"safe"` · `"disposable"` · `"undeliverable"` · `"role_account"` |
| `deliverability_score` | `number` | 0 (unlikely) → 100 (very likely to be delivered). |
| `did_you_mean` | `string \| null` | Typo correction suggestion (e.g. `"hotmail.com"` for `"hotmial.com"`). |
| `is_free_provider` | `boolean` | `true` for consumer webmail (Gmail, Yahoo…). |
| `is_corporate_email` | `boolean` | `true` for business domains with professional MX configuration. |
| `is_alias_email` | `boolean` | `true` for privacy relay services (SimpleLogin, AnonAddy…). |
| `mx_provider_label` | `string \| null` | Human-readable name of the mail provider (e.g. `"Google Workspace"`). |

### Risk score interpretation

| Score | Category | Recommended action |
|---|---|---|
| 0 – 29 | Safe | Accept |
| 30 – 49 | Low risk | Accept with caution |
| 50 – 79 | High risk | Show a warning |
| 80 – 99 | Likely disposable | Block or require confirmation |
| 100 | Confirmed disposable | Block |

---

## Error handling

The node handles all Syvel API errors with human-readable messages in the n8n UI.

| HTTP code | Behaviour |
|---|---|
| `401` | Throws `"Authentication failed. Please check your Syvel API key."` |
| `422` | Throws `"Invalid input: … is not a valid domain or email format."` |
| `429` | Throws `"Syvel API rate limit exceeded. Please check your plan quota."` |
| `5xx` | Returns partial result if **Fail Open** is enabled; otherwise throws. |

You can also enable **Continue On Error** in the node settings to push all errors to the output instead of failing the workflow.

---

## Use cases

### Block disposable emails at sign-up

```
Webhook (form submit)
  └─ Syvel — Check Email
       ├─ is_risky = true  → Respond to Webhook (400 "Invalid email address")
       └─ is_risky = false → Create user in database
```

### Tag risky leads in your CRM

```
Schedule Trigger (daily)
  └─ Get Leads (HubSpot / Salesforce)
       └─ Syvel — Check Email
            ├─ is_risky = true  → Update Lead (tag = "disposable")
            └─ is_risky = false → no action
```

### Typo correction before sending a campaign

```
Get Contacts (Mailchimp)
  └─ Syvel — Check Email
       └─ did_you_mean ≠ null → Update Contact (email = did_you_mean)
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

```bash
git clone https://github.com/Syvel-io/n8n-nodes-syvel.git
cd n8n-nodes-syvel
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Build
npm run build

# Lint
npm run lint
```

This project uses **[Gitmoji](https://gitmoji.dev)** for commit messages. See [`.github/COMMIT_CONVENTION.md`](.github/COMMIT_CONVENTION.md) for the full reference.

---

## Documentation

Full documentation, API reference, and integration guides:  
**[syvel.io/fr/docs/integrations/n8n](https://www.syvel.io/fr/docs/integrations/n8n/)**

---

## License

[MIT](LICENSE)
