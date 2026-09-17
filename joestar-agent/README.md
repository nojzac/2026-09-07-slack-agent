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
- `api/_lib/mcp.js` — the MCP servers every sandbox gets (exa, deepwiki).
- `api/_lib/versions.js` — the Playwright version, shared by the image and the briefing.
- `e2b/template.mjs` — the sandbox image; built with `../bin/with-secrets node e2b/build.mjs`.
- `test/events.test.js` — `npm test` (no network, `fetch` is stubbed).
- `test/mcp.test.js` — the MCP config shape, independent of any real sandbox.

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
| `EXA_API_KEY` | exa.ai dashboard → API keys. Optional — see below |
| `CODEX_AUTH_JSON` | whole contents of a local `~/.codex/auth.json` from `codex login`. Optional — powers the Codex CLI second-opinion reviewer |

## The browser, and how files get out

Every sandbox has **Playwright with Chromium** baked into the image — no
Firefox, no WebKit, and nothing installed at run time, because the sandbox is
new every message and an install would come out of the five-minute budget.

- Version lives in `api/_lib/versions.js`, imported by both `e2b/template.mjs`
  and `api/_lib/thread.js`, so the image and the model's briefing cannot drift.
- Browsers are at `/opt/ms-playwright`; Playwright's own ffmpeg is beside them
  and is what writes video.
- **`Template.setEnvs` is build-time only**, so `PLAYWRIGHT_BROWSERS_PATH` and
  `NODE_PATH` are set *again* at run time in `SANDBOX_RUNTIME_ENVS`
  (`api/_lib/claude.js`). Remove either copy and Chromium will not start, with
  an error that sends you to reinstall browsers that are already there.
- The model is told all of this on every run by `browserCapabilities()`, which
  is unconditional — the browser is a fact about the machine, not a credential.

**Output files never pass through this function's memory.** `collectOutputs`
asks Slack for a single-use upload URL bound to one filename and one byte
length, then runs `curl` *inside the sandbox* to POST the bytes straight to
Slack; `files.completeUploadExternal` happens back here afterwards.

**No Slack token ever enters the sandbox.** Only the URL crosses, it is spent
after one use, and a test asserts the token appears in no command string and no
`envs` object. That matters more from this lesson on: a browser means the
sandbox can load arbitrary web pages, so it is the worst possible place to keep
a non-expiring, workspace-wide credential.

Uploading from inside the sandbox puts the upload on the sandbox's clock, so
`UPLOAD_BUDGET_MS` (30s) is carved out of its lifetime: `claude` gets 255s, the
sandbox lives 285s. `MAX_OUTPUT_BYTES` is 64 MiB — ours, bounded by that budget,
not by any platform limit.

## MCP servers

Every sandbox gets two MCP servers, both remote HTTP, both written into the
sandbox fresh at run time and passed to `claude` with `--mcp-config
--strict-mcp-config` — so a repo the bot happens to be working in cannot add
tools of its own via a checked-in `.mcp.json`.

- **`deepwiki`** — `https://mcp.deepwiki.com/mcp`. No credential of any kind.
- **`exa`** — `https://mcp.exa.ai/mcp`. Needs `EXA_API_KEY`, sent as an
  `x-api-key` header.

**The key is never written to a file or a command line.** `api/_lib/mcp.js`
writes the literal string `${EXA_API_KEY}` into the config; Claude Code
expands that from its own process environment only when it actually opens the
connection. The real value is passed to the `claude` command as an env var,
the same way `GH_TOKEN` already is — never at `Sandbox.create`, never baked
into the E2B template.

**If `EXA_API_KEY` is unset, `exa` is left out of the config entirely** —
`deepwiki` is unaffected. This matters because of something found while
testing this on 2026-09-17: **Exa does not check the key until `tools/call`.**
A bad key, and even the unexpanded literal `${EXA_API_KEY}`, both complete
`initialize` and `tools/list` with HTTP 200 and the full tool list — "the MCP
server connected" proves nothing about the key being real. `deepwiki` needing
no credential at all is deliberate: it is the control that tells you whether a
broken run is the Exa key or the `--mcp-config` wiring itself.

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
