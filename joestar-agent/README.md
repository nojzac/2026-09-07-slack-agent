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
