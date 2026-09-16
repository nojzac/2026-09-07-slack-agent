# RESUME — cold-start note

## Where things stand (2026-09-16)

Joestar is live and thinking. Mention `@joestar` in the SlackAgentOS workspace
and it posts a placeholder, boots an E2B sandbox, runs Claude Code headless
inside it, and edits the placeholder with the answer. Verified working in
#general and #smoke-test on 2026-09-16.

**Lessons 04 and 05 are both finished**, written up in `sops/lesson-04/` and
`sops/lesson-05/`. Lesson 04's `index.html` is the agreed template for every
later lesson page.

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

## Known unknown

Claude can run for minutes and the function is capped at `maxDuration = 300`.
A trivial prompt answered in about 15 seconds; long ones are untested. If
answers start truncating, the work has to move off the Vercel function, which
is a larger change.

## Open decisions
- Whether the Vercel project should move off the smartflowconsultants team to
  the personal account. Recommendation: leave it — the SlackAgentOS vault and
  its service account are on the same smartflowllc account, so moving Vercel
  alone would split the project across two identities.

Settled since: GitHub↔Vercel is connected and push-to-deploy works; the lesson
page template is `sops/lesson-04/index.html`.

## Lesson 05, as built

- Sandbox image: `joestar-agent/e2b/template.mjs`, built with
  `bin/with-secrets node e2b/build.mjs`. Registered as `joestar-claude`.
  The CLI's `e2b template build` is deprecated and reads a Dockerfile, so it
  cannot build this; the build goes through `Template.build()` in
  `e2b/build.mjs`.
- Runner: `joestar-agent/api/_lib/claude.js`. Imports
  `e2b/dist/index.mjs` deliberately — see TRAPS.md, the bare `e2b` specifier
  500s on Vercel.
- Secrets: `e2b_api_key` and `claude_code_oauth_token` in the same 1Password
  item, and as Vercel production env vars (set by hand in the dashboard).
- Known behaviour: a cold start can exceed Slack's 3-second window, so Slack
  retries. The `x-slack-retry-num` check drops the retries, so it is harmless —
  it shows up in the logs as `retry: '2'`, not as a duplicate reply.

## Security posture (changed 2026-09-16)

**The 1Password desktop CLI integration is off, and must stay off.** It signs
in every shell on the machine as the whole account, agent shells included. With
it on, Claude could reach five vaults — Employee, Developer, Shared,
SlackAgentOS and UUAC — when one was intended. It is a single switch covering
both a human's terminal and an agent's; there is no way to split them.

**Access is a service account, scoped read-only to `SlackAgentOS`, and nothing
else.** Its token is in the login Keychain under service `op-slackagentos`, and
`bin/with-secrets` reads it for one command at a time. Claude can run that
wrapper, so Claude does have that one vault, read-only, without prompting —
state it that way, not as "no access".

**Claude never reads a secret's value.** Enforced in order by auto-mode's
classifier, `permissions.deny` in `~/.claude/settings.json`, and the hook
`~/.claude/hooks/block-secret-reads.py`. Guidance:
`~/.claude/instructions/onepassword-access.md`. Register hooks with absolute
paths — `$CLAUDE_CONFIG_DIR` is unset, and a hook whose script is missing fails
open silently, which is how the first version of that hook did nothing while
appearing installed.

**1Password is not on the critical path.** The deployed bot reads
`SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `E2B_API_KEY` and
`CLAUDE_CODE_OAUTH_TOKEN` from Vercel's own environment variables and never
contacts 1Password. The vault serves only local tooling — `bin/preflight`,
`bin/smoke`, `e2b/build.mjs`. Set the four values by hand in Vercel's dashboard
and the bot runs with no vault, no service account and no `op` installed.

**What this does not do.** All of it assumes a careless agent, not a hostile
one. Deny rules and hooks are files Claude can edit; the real boundaries are
the OS user Claude runs as, root-owned config it cannot write, and 1Password's
own approval dialog. Anything stronger means putting the agent in a separate
Unix user or container and exposing operations rather than keys.

## Next step

Lesson 06. Find it in `course/transcripts/DOWNLOADS.md`, build
`sops/lesson-06/index.html` from the transcript following
`course/LESSON-PAGE-RULES.md` and `sops/DESIGN-SPEC.md`, show it, get a yes,
then do the lesson.

Open, neither blocking: rotate `claude_code_oauth_token` (about 19 characters
of it reached a transcript on 2026-09-15; it cannot be revoked, so replacing it
is the only remedy), and delete whichever of the two live 1Password service
accounts is now spare.
