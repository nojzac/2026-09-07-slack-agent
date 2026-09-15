# Slack random-number bot

Mention the bot in Slack, it replies in the thread with a random number.

- `api/slack/events.js` — the Slack Events API endpoint (Vercel function).
- `api/_lib/slack.js` — signature verification and `chat.postMessage`.
- `test/events.test.js` — `npm test` (no network, `fetch` is stubbed).

## Environment variables (set in the Vercel project, Production)
| Name | Where it comes from |
| --- | --- |
| `SLACK_SIGNING_SECRET` | Slack app → Basic Information → App Credentials |
| `SLACK_BOT_TOKEN` | Slack app → OAuth & Permissions → Bot User OAuth Token (`xoxb-…`) |
| `RANDOM_MIN` / `RANDOM_MAX` | optional, default 1 and 100 |

Both secrets also live in 1Password (`SlackAgentOS/2026-09-07-slack-agent`) and are
referenced from `../.env.op`. Never write them into a file.

## Slack app setup
1. Create the app at https://api.slack.com/apps (from scratch).
2. OAuth & Permissions → Bot Token Scopes: `app_mentions:read`, `chat:write`.
3. Install to the workspace, copy the bot token.
4. Event Subscriptions → Request URL: `https://<deployment>/api/slack/events`
   (Slack sends a `url_verification` challenge; the endpoint answers it).
5. Subscribe to bot event `app_mention`, save, reinstall if prompted.
6. Invite the bot to a channel: `/invite @<bot name>`.
