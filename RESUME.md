# RESUME — cold-start note

## Where things stand (2026-09-15)

Joestar is live. Mention `@joestar` in the SlackAgentOS workspace and it replies
in the thread with a random number. Lesson 04 is finished and written up in
`sops/lesson-04/` — `index.html` there is both the SOP and the agreed template
for every later lesson page.

- Code: `joestar-agent/api/slack/events.js` (Vercel function), tests in
  `joestar-agent/test/` — `npm test`, no network.
- Production: https://joestar-agent-five.vercel.app/api/slack/events
  (Vercel project `smartflowconsultants/joestar-agent`). GitHub login
  connection now in place; the project itself is still not linked to the repo,
  so deploys are CLI-only (`vercel deploy --prod`) until someone links it.
- Secrets: 1Password vault `SlackAgentOS`, item `2026-09-07-slack-agent`,
  fields `signing_secret` and `bot_token`. Reached through a service account
  scoped read-only to that vault; its token is in the macOS Keychain under
  service `op-slackagentos`. Run anything needing secrets with
  `bin/with-secrets <command>`.
- Slack app config: Event Subscriptions on, `app_mention` subscribed,
  scopes `app_mentions:read` and `chat:write`. Manifest kept at
  `joestar-agent/slack-app-manifest.yml`.

## Gotchas
All written up in `TRAPS.md` — read it before lesson 05. Short version: Vercel
needs a GitHub login connection or deploys hang at UNKNOWN with no error, and
Slack's Event Subscriptions page does nothing until you click Save Changes.

## Before starting a lesson
Run `bin/preflight` (about 20s, read-only). After any Slack or Vercel config
change, run `bin/smoke`. Together they cover the two failure modes that cost an
evening in lesson 04: an unmet prerequisite found late, and a silent break
somewhere in the mention → reply chain.

## Next step
Lesson 05 connects Claude Code in an E2B sandbox. Build its page from
`course/transcripts/05-0-to-1--connecting-claude-code.md` following
`course/LESSON-PAGE-RULES.md`, show it, get a yes, then do the lesson.
Its keys go in the `SlackAgentOS` vault; the commented `ANTHROPIC_API_KEY` and
`E2B_API_KEY` lines in `.env.op` still say `Projects` and need repointing.

## Open decisions
- Whether the Vercel project should move off the smartflowconsultants team to
  the personal account. Recommendation: leave it — the SlackAgentOS vault and
  its service account are on the same smartflowllc account, so moving Vercel
  alone would split the project across two identities.

Settled since: GitHub↔Vercel is connected and push-to-deploy works; the lesson
page template is `sops/lesson-04/index.html`.
