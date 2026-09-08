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

- Skeleton only. No code yet. Next step is lesson 04 (see RESUME.md).

## Course credit and lesson map

- Course: Ray Amjad, "Slack agents", https://www.agenticcoding.school
- Reference code (public): https://github.com/ray-amjad/slack-agent-course
  - Local clone: `~/projects/ray-amjad-slack-agent-course`
  - Repo tags run two behind video numbers: video 04 = tag `lesson-02-end`.
- Lesson pages (learning aids, one HTML file per lesson): `sops/` here, copied
  from the research project as they are finished.
- Transcripts: `~/projects/2026-09-04-ray-amjad-mcp/autonomy/transcripts/slack-agents/`

## Access

Nothing exists yet. Fill in as each is created.

| System | Name | Where the credential lives |
|---|---|---|
| Slack test workspace | (lesson 03) | browser login |
| Slack app | (lesson 04, api.slack.com/apps) | signing secret and bot token → 1Password `Projects/2026-09-07-slack-agent` |
| Vercel project | (lesson 04) | Vercel account login; env vars set in Vercel are the deploy-side copy of the 1Password values |
| GitHub repo (private) | (lesson 04) | `gh` CLI login |
| E2B | (lesson 05) | 1Password `Projects/shared-e2b` |
| Anthropic API | (lesson 05) | 1Password `Projects/shared-anthropic` |

## Topology

- MacBook `~/projects/2026-09-07-slack-agent`: edit, test, commit, push.
- Remote: private GitHub repo (created in lesson 04, needs Noj's go before first push).
- Runtime: Vercel (function) plus E2B (sandbox). Nothing runs on the Mac or the Mini.
