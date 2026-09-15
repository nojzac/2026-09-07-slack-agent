# RESUME — cold-start note

## Where things stand (2026-09-15)

Joestar is live. Mention `@joestar` in the SlackAgentOS workspace and it replies
in the thread with a random number. Built directly rather than from the lesson 04
page; the page in `sops/` is still the draft v3 and has not been used or chosen.

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

## Gotchas learned the hard way
- Slack's Event Subscriptions page does nothing until the green **Save Changes**
  bar at the bottom is clicked. A verified Request URL is not enough.
- `vercel link` and `vercel dev` write a `.env.local`; `vercel env pull` would
  write the real secrets there. `joestar-agent/.gitignore` blocks `.env*`.
  Never run `vercel env pull`.
- A Vercel deploy that sits at UNKNOWN forever with no build logs is usually
  blocked, not queued. The cause here: the Vercel account had no GitHub login
  connection, so it could not match the commit email nojzac@gmail.com to a
  GitHub account. Fixed 2026-09-15 by adding the GitHub App connection
  "vercel-slack-agent-nojzac" (namespace nojzac, scoped to this repo only).
  Deploys went from hanging indefinitely to Ready in 5s.

## Next step
Lesson 05 connects Claude Code in an E2B sandbox. Build its page from
`course/transcripts/05-0-to-1--connecting-claude-code.md` following
`course/LESSON-PAGE-RULES.md`, show it, get a yes, then do the lesson.
Its keys go in the `SlackAgentOS` vault; the commented `ANTHROPIC_API_KEY` and
`E2B_API_KEY` lines in `.env.op` still say `Projects` and need repointing.

## Open decisions
- Whether the Vercel project should move off the smartflowconsultants team to
  the personal account.
- Whether to fix the GitHub↔Vercel connection for push-to-deploy.
- Which lesson 04 candidate page is the template for later lessons (v3 is the
  current draft, still unreviewed).
