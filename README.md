# slack-agent

My own Claude-in-Slack agent: a bot you @mention in a Slack channel that reads
the thread, does work in a cloud sandbox, and replies in the thread.

Built by following Ray Amjad's "Slack agents" course lesson by lesson, then
extended for my own needs. This folder is the agent's code. It is not the
research about the course; that lives in `~/projects/2026-09-04-ray-amjad-mcp`.

## What this is

- A Vercel serverless function that receives Slack events (lesson 04 onward).
- From lesson 05, an E2B cloud sandbox running Claude Code that does the real work.
- Later lessons add GitHub access, MCP servers, Playwright, a database, memory,
  skills, and Codex.

## Why

To learn how an always-on coding agent is wired, by building one I own and can
change, rather than by using someone else's.

## Current status

- Lessons 04–17 are built and deployed; lesson 15 (memory) is in PR #20,
  pending merge and a live test.
- Lessons 18–21 ("Using your agent") are short, concept-only pages — no code,
  image or deploy changes.
- See RESUME.md for where things stand and what's next.

## Course credit and lesson map

- Course: Ray Amjad, "Slack agents", https://www.agenticcoding.school
- Reference code (public): https://github.com/ray-amjad/slack-agent-course
  - No local clone kept; clone to a temp folder when needed. Tags `lesson-02-end` to `lesson-15-end`; look each lesson up in `course/transcripts/DOWNLOADS.md`.
- Lesson pages (learning aids, one folder per lesson: `sops/lesson-NN/index.html`): `sops/` here, copied
  from the research project as they are finished.
- Transcripts: `~/projects/2026-09-04-ray-amjad-mcp/autonomy/transcripts/slack-agents/`

## Scripts
| Command | What it does |
|---|---|
| `bin/preflight` | Checks every prerequisite (tooling, 1Password, Slack scopes, Vercel, CI). Read-only. Run it before starting a lesson. |
| `bin/smoke` | Probes the deployed bot end to end. Posts two real messages — set `SLACK_SMOKE_CHANNEL`, default `#bot-smoke`. |
| `bin/with-secrets <cmd>` | Runs a command with the secrets injected from 1Password. |

## Traps
Setup traps that cost real time, and the prerequisites Ray's videos assume
you already have: `TRAPS.md`. Read it before starting a new lesson.

## Access

Everything below exists and is in use.

| System | Name | Where the credential lives |
|---|---|---|
| Slack workspace | SlackAgentOS (slackagentos.slack.com) | browser login |
| Slack app | joestar (api.slack.com/apps) | signing secret and bot token → 1Password `SlackAgentOS/2026-09-07-slack-agent` |
| Vercel project | smartflowconsultants/joestar-agent → joestar-agent-five.vercel.app | Vercel account login; env vars set in Vercel are the deploy-side copy of the 1Password values |
| GitHub repo (private) | nojzac/2026-09-07-slack-agent | `gh` CLI login |
| 1Password service account | read-only on SlackAgentOS only (smartflowllc account) | token in macOS Keychain, service `op-slackagentos`; used by `bin/with-secrets`. **The desktop CLI integration is off and stays off** — it authenticates every shell as the whole account. Service accounts only |
| E2B | e2b.dev, template `joestar-claude` | 1Password `SlackAgentOS/2026-09-07-slack-agent` field `e2b_api_key`; also a Vercel production env var |
| Claude Code (headless) | OAuth token from `claude setup-token` | 1Password `SlackAgentOS/2026-09-07-slack-agent` field `claude_code_oauth_token`; also a Vercel production env var. **Cannot be revoked** — replace it rather than revoking |
| Slack connector for Claude | claude.ai → Settings → Connectors → Slack, attached to SlackAgentOS | no stored credential — an OAuth grant on the Claude account. Lets any Claude Code session **post as Noj** in that workspace, not just in `#joestar-test`. One workspace per Claude account; revoke by removing the connector on claude.ai |

## Topology

- MacBook `~/projects/2026-09-07-slack-agent`: edit, test, commit, push.
- Remote: private GitHub repo (created in lesson 04, needs Noj's go before first push).
- Runtime: Vercel (function) plus E2B (sandbox). Nothing runs on the Mac or the Mini.
