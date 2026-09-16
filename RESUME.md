# RESUME — cold-start note

## Where things stand (2026-09-16)

Joestar is live and thinking. Mention `@joestar` in the SlackAgentOS workspace
and it posts a placeholder, boots an E2B sandbox, runs Claude Code headless
inside it, and edits the placeholder with the answer. Verified working in
#general and #smoke-test on 2026-09-16.

**Lessons 04, 05 and 06 are finished**, written up in `sops/lesson-04/`,
`sops/lesson-05/` and `sops/lesson-06/`. Lesson 04's `index.html` is the agreed
template for every later lesson page.

- Code: `joestar-agent/api/slack/events.js` (Vercel function), tests in
  `joestar-agent/test/` — `npm test`, no network.
- Production: https://joestar-agent-five.vercel.app/api/slack/events
  (Vercel project `smartflowconsultants/joestar-agent`). **Pushing to `main`
  deploys**: `.github/workflows/test.yml` runs the tests, then runs
  `vercel deploy --prod` from the repo root. Vercel's own git trigger is
  deliberately off (`joestar-agent/vercel.json`) so the tests gate production —
  so a push is a deploy, and needs Noj's explicit go like any other push.
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

## Lesson 06, as built

Claude Code can now test the bot itself. The Slack connector is attached to the
Claude account (claude.ai → Settings → Connectors), pointing at SlackAgentOS, so
any Claude Code session can post **as Noj** in that workspace — not just in the
test channel. Verified 2026-09-15: a mention in `#joestar-test` got `4` back
from joestar, first try.

- Test channel: `#joestar-test` (`C0C1QB5PCNB`), bot `<@U0C1T5AQ0G6>`.
  Separate from `#bot-smoke`, which is where `bin/smoke` posts.
- The procedure, including what counts as a pass: `docs/verifying.md`.
- Ray relaunches Claude Code after attaching the connector and says you must.
  Here the tools appeared mid-session with no relaunch — so check `/mcp` first,
  and relaunch only if it comes back empty.
- `CLAUDE.md` was cut down to always-on rules plus trigger lines in the same
  session; the detail moved to `docs/secrets.md`, `docs/verifying.md` and
  `docs/lessons.md`.

## Lesson 07, as built

Joestar is now conversational. Mention it, or just reply in a thread it is
already in, and it answers with 👀 while it works and ✅ when it finishes. It
reads attachments, sends files back, and formats for Slack. Verified end to end
in `#joestar-test` on 2026-09-16 by two Claude sessions and by Noj's own manual
image test — every row green: heard, answered, finished, formatted, remembered,
stopped, file out, file in.

- Built by a second Claude session working in parallel; commit `d48886c`,
  deployed by CI run 35094069610. New: `api/_lib/thread.js` (transcript replay),
  `api/_lib/mrkdwn.js` (Markdown→mrkdwn, code blocks masked first), and
  `classifyEvent()` exported pure from `events.js` so the guards are testable.
- **Transcript replay, not session resume.** The sandbox is destroyed every run,
  so there is no session to resume: each turn refetches `conversations.replies`
  and replays it as untrusted data. Ray's video says the opposite; his own
  written prompt says to pick by runtime. Proved live — asked which word it had
  put in backticks two turns earlier, it answered correctly.
- **The reinstall did NOT rotate the bot token.** `token_rotation_enabled: false`
  plus a same-workspace scope change means Slack widens the existing grant. The
  lesson page said rotation was certain; it is now a check-first branch. When it
  does rotate, the token has to go in both 1Password and Vercel.
- **The ack path now makes up to four Slack calls before the 200**, where it made
  one: `auth.test` (cached), `conversations.replies` (thread replies only),
  `reactions.add`, `chat.postMessage`. Still inside Slack's ~3s window, but this
  is where to look first if retries ever start.
- **No uploads SDK.** `files.upload` v1 is retired; the three-step v2 dance is
  hand-rolled in `api/_lib/slack.js` rather than adding `@slack/web-api`, because
  of the lesson-05 dependency failure in TRAPS.md. `callForm` exists because
  `files.getUploadURLExternal` rejects a JSON body.
- The bot now hears **every message in every channel it is in** — currently
  `#joestar-test` and `#bot-smoke`. The three loop guards are what keep that
  safe, and a second unprompted reply is an emergency: turn off the
  `message.channels` subscription in Slack immediately, then fix the guard.

## Also done 2026-09-16

- **Progressive disclosure verified.** Three read-only probes, one per `CLAUDE.md`
  pointer. All fired. `docs/verifying.md` was reached only after nine files
  because `joestar-agent/README.md` still described the lesson-04 random-number
  bot; fixing that README moved it to fourth with no source files read first.
- **`bin/preflight` was passing green while blind.** It had lesson 04's two
  scopes hard-coded and could not see the five added in lesson 07, so it
  confirmed a reinstall it had not actually checked. It now reads the required
  scopes out of `slack-app-manifest.yml` and cannot go stale again.
- Corrected here: the deploy note, which said deploys were CLI-only. A push to
  `main` runs `test.yml`, which tests and then deploys.

## Open, not blocking

- `bin/preflight` prints `secret <field> resolves — NN chars`. The rule in
  `docs/secrets.md` is never to read a secret's value, "not a prefix, not a
  length". A length is a weak leak but the tool contradicts the rule. Noj's call
  whether it becomes a bare pass/fail.

## Next step

Lesson 08, "Connecting to GitHub" — transcript at
`course/transcripts/08-0-to-1--connecting-to-github.md`. Build
`sops/lesson-08/index.html` from it following `docs/lessons.md`, show it, get a
yes, then do the lesson.

Fourteen lessons remain: 08–17 finish the "0 to 1" chapter, and 18–21 are the
"Using your agent" chapter, which `course/LESSON-PAGE-RULES.md` says get a short
page rather than the full treatment.

Open, neither blocking: rotate `claude_code_oauth_token` (about 19 characters
of it reached a transcript on 2026-09-15; it cannot be revoked, so replacing it
is the only remedy), and delete whichever of the two live 1Password service
accounts is now spare.

**Decided 2026-09-16:** the token rotation happens at the *end* of the course,
not now. Rotating it mid-course means rebuilding the E2B sandbox image and
updating Vercel in the middle of lessons that keep changing both. Don't keep
raising it — it is deferred on purpose, not forgotten.
