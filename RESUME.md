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

## Where lesson 05 stands (2026-09-15)

Code written, tested and pushed; not live. `api/_lib/claude.js` boots an E2B
sandbox and runs Claude Code, `api/slack/events.js` posts "thinking…" inside
Slack's three-second window and edits it with the answer via `waitUntil`.
10 tests pass. The learning page is `sops/lesson-05/index.html`.

**Blocked on two credentials only Noj can create**, both then stored in the
1Password item `SlackAgentOS/2026-09-07-slack-agent`:

| Field | How to get it |
|---|---|
| `e2b_api_key` | e2b.dev → sign up → Dashboard → API Keys → Create |
| `claude_code_oauth_token` | `claude setup-token` in a terminal (needs a Claude subscription; cannot be revoked afterwards) |

Then, in order: uncomment the two lines in `.env.op`; `bin/with-secrets npx e2b
template build`; pipe both into Vercel with `op read … | vercel env add …
production`; push; mention the bot. Steps 3–6 of the lesson 05 page.

Known unknown: Claude runs for minutes and the function is capped at
`maxDuration = 300`. If answers truncate, the work has to move off the Vercel
function, which is a larger change.

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

## Where lesson 05 stands (2026-09-15, end of session)
Both credentials now exist in `SlackAgentOS/2026-09-07-slack-agent` as
`e2b_api_key` and `claude_code_oauth_token`, and `.env.op` references both —
the two lines are uncommented. The Claude token was pasted with a leading
space; Noj removed it, and the fix is unverified because verification now goes
through `op run`, not `op read`.

Next, in order:
1. `op run --env-file=.env.op -- npx e2b template build` (from `joestar-agent/`)
2. Pipe both keys into Vercel production
3. Push, then mention `@joestar` in `#bot-smoke`
Steps 3–6 of `sops/lesson-05/index.html`.

New rule, enforced by a hook: Claude never reads a secret's value. See
`~/.claude/hooks/block-secret-reads.py` and
`~/.claude/instructions/onepassword-access.md`. Secrets reach commands only via
`op run --env-file=.env.op -- <command>`; verification is the exit code of a
real command, never an inspection of the value.
