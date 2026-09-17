# joestar — the bot's code

Mention `@joestar` in Slack and it replies in the thread with an answer from
Claude Code, run in a throwaway E2B sandbox. It posts a `_thinking…_`
placeholder within Slack's 3-second window, then edits that message in place
once Claude has finished.

**This folder is only the code.** The project it belongs to is the parent
directory, and that is where the rules live:

- `../CLAUDE.md` — how to work here, and pointers to the rest
- `../docs/secrets.md` — 1Password rules; read before touching any credential
- `../docs/verifying.md` — how to check the bot still works after a change
- `../docs/lessons.md` — how a course lesson is followed
- `../RESUME.md` — where things stand; `../TRAPS.md` — what has bitten before

Files here:

- `api/slack/events.js` — the Slack Events API endpoint (Vercel function). POST only; anything else gets 405.
- `api/_lib/slack.js` — signature verification, `chat.postMessage`, `chat.update`.
- `api/_lib/claude.js` — boots the E2B sandbox and runs Claude Code headless.
- `e2b/template.mjs` — the sandbox image; built with `../bin/with-secrets node e2b/build.mjs`.
- `test/events.test.js` — `npm test` (no network, `fetch` is stubbed).

## Environment variables (set in the Vercel project, Production)
| Name | Where it comes from |
| --- | --- |
| `SLACK_SIGNING_SECRET` | Slack app → Basic Information → App Credentials |
| `SLACK_BOT_TOKEN` | Slack app → OAuth & Permissions → Bot User OAuth Token (`xoxb-…`) |
| `E2B_API_KEY` | e2b.dev → dashboard → API keys |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude setup-token` (cannot be revoked — treat as highly sensitive) |
| `GITHUB_APP_ID` | GitHub App → General tab (numeric) |
| `GITHUB_INSTALLATION_ID` | the number ending `github.com/settings/installations/…` — **not** the App ID |
| `GITHUB_APP_PRIVATE_KEY` | the App's `.pem`, **base64-encoded, single line** — see below |

### The GitHub App

The bot does GitHub work with an installation token minted per request, valid one
hour. `api/_lib/github.js` runs in the Vercel function and holds the private key;
the sandbox only ever sees the expiring token. That separation is the design:
leak the token and you lose an hour, leak the key and you lose the App.

**`GITHUB_APP_PRIVATE_KEY` holds base64, not raw PEM.** The name does not say so.
The `.pem` is multiline and multiline values do not survive the trip into an
environment variable reliably, so encode it first — the `tr` matters, because
`base64` wraps at 76 characters and the wrapping breaks the decode:

```bash
base64 -i your-app.private-key.pem | tr -d '\n' | pbcopy
```

The code decodes it and throws if the result is not a PEM; without that check the
failure is an opaque `error:1E08010C:DECODER routines::unsupported`.

**App permissions.** Grant `contents` read+write, `pull_requests` read+write,
`metadata` read. Deliberately **not** `workflows` (would let injected code rewrite
CI and reach Actions secrets) and **not** `administration` (would let it remove
the branch protection below). Install on **selected repositories only** — that
selection is the blast radius for writes. Note GitHub also grants read-only access
to public repositories regardless of the selection.

**Branch protection is required, not optional.** Add a ruleset on each default
branch: PR required with 1 approval, force pushes blocked, deletions restricted,
empty bypass list. Rulesets need GitHub Pro on private repos; they are free on
public ones.

**Rebuild the sandbox image after changing `e2b/template.mjs`.** `gh` is installed
from GitHub's own apt repository, and a stale template of the same name silently
shadows a new one:

```bash
../bin/with-secrets node e2b/build.mjs
```

Both secrets also live in 1Password (`SlackAgentOS/2026-09-07-slack-agent`) and are
referenced from `../.env.op`. Never write them into a file.

## Slack app setup
1. Create the app at https://api.slack.com/apps (from scratch).
2. OAuth & Permissions → Bot Token Scopes: `app_mentions:read`, `chat:write`.
   The current set is whatever `slack-app-manifest.yml` says — that file is the source of truth.
3. Install to the workspace, copy the bot token.
4. Event Subscriptions → Request URL: `https://<deployment>/api/slack/events`
   (Slack sends a `url_verification` challenge; the endpoint answers it).
5. Subscribe to bot event `app_mention`, save, reinstall if prompted.
6. Invite the bot to a channel: `/invite @<bot name>`.
