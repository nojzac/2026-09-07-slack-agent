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
change, run `bin/smoke`.

**Know what smoke does not cover.** It was written for the lesson-04 bot and
tests the mention → reply chain only. Since lesson 07 the bot does six things,
and smoke tests none of the new five: no thread reply, no reaction, no file in
either direction, no mrkdwn conversion. Delete every reaction call and smoke
still passes 5/5. The end-to-end table in `docs/verifying.md` is what covers
those, by hand.

**And probe 5 is weaker than its name.** It asserts the endpoint returned 200 —
but `events.js` returns 200 for every event including ones it skips, so the probe
cannot distinguish a handler that replied from one that ignored the event, while
printing "posted into the thread above". It also forges the mention text as the
literal `<@bot>` rather than the real `U0C1T5AQ0G6`; that is harmless only
because the `app_mention` path never checks the text.

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

## Lesson 08, as built

Joestar can do GitHub work: clone, branch, commit, push, open pull requests.
Verified live in `#joestar-test` on 2026-09-16 — it opened
`nojzac/joestar-sandbox#2` as `app/joestar-slack-bot`.

- **The separation is the design.** `api/_lib/github.js` runs in the Vercel
  function and holds the App's private key, which mints tokens. The sandbox only
  ever sees an installation token, valid one hour, passed **per command** rather
  than at `Sandbox.create`. Leak the token and you lose an hour on one repo;
  leak the key and you lose the App.
- **GitHub App:** ID `4970890`, installation `162319448`, installed on
  `nojzac/joestar-sandbox` only. `contents` and `pull_requests` read+write,
  `metadata` read. **`workflows` and `administration` deliberately withheld** —
  the first would let injected code rewrite CI and reach Actions secrets, the
  second would let it remove branch protection.
- **The test repo stays public for the rest of the course**, deliberately: a
  ruleset only enforces on a public repo on this plan. Nothing real goes in it.
- No JWT dependency — `node:crypto` signs the RS256 assertion in ~15 lines.
- `gh` is installed in the E2B template from GitHub's own apt repo. **Rebuild
  after any template change**, or a stale image of the same name shadows it.
- The one `PreToolUse` hook blocks destructive push refspecs. It fires (see
  TRAPS.md) but it is a nudge, not a control — `G=push; git $G -f` defeats it.

Three things found by testing that the course states otherwise or not at all,
all in TRAPS.md: a reinstall-style **ruleset silently stops enforcing when a repo
goes private**; **PreToolUse hooks do fire** under
`--dangerously-skip-permissions` on claude-code 2.1.274; and the **PR** author is
the App while the **commit** author is whatever `git config user.name` says.

## Lesson 09, as built

Dogfooding works: the bot now changes its own code on request, opens a PR, takes
review feedback, and fixes what it got wrong. Done in `#joestar-dev`
(`C0C2FES3UGJ`), whose **topic names the repo** — that topic is now an access
boundary, not a label.

- **Shipped by the bot itself:** channel topic → repo. `repoFromTopic` parses
  `owner/repo` or a github.com URL from the topic; the installation token is
  minted **scoped to that one repo**; no repo in the topic means **no GitHub
  access at all**, even though the App is installed on two repos. Verified:
  `gh repo list` inside the sandbox returns exactly one repo.
- **It also took a code review.** First version discarded the owner half of
  `owner/repo` when scoping, so another account's repo name would have minted a
  token for ours. Asked in-thread to fix it; it now looks up the installation's
  account and refuses to mint on mismatch, with tests. 49 tests pass.
- **`main` is protected and the bot cannot merge.** `protect-main`: PR + 1
  approval, force-push blocked, deletions restricted, bypass = Repository admin
  only. Noj merges with `gh pr merge N --squash --admin`; the App has no bypass
  and cannot approve its own PR. **Nobody can push to main any more, including
  Claude** — every change is a branch and a PR.
- The repo is **public** for the rest of the course, so that ruleset enforces.

### The bottleneck dogfooding found immediately

The first two requests both died at the sandbox timeout while Claude was still
working. Raising `runClaude`'s default from 240s to 285s, plus telling the model
its budget (shallow clone, skip `sops/` and `course/`, push partial work), was
enough — the retry succeeded.

**The real limit is unchanged and now proven:** `maxDuration = 300` is a hard
ceiling, so work needing more than five minutes cannot run inside the Vercel
function. This was the lesson-05 "known unknown"; it does not truncate, it fails
outright. Moving the work out is a deliberate architectural decision, not
another constant to bump.

## Lesson 10, as built

Joestar has tools. Two MCP servers are written into every sandbox at run time and
passed with `--mcp-config --strict-mcp-config`. Verified live in `#joestar-dev`
on 2026-09-17: it called DeepWiki and quoted back real documentation.

- **Shipped by the bot itself** as PR #4, reviewed in-thread, one fix taken.
  `api/_lib/mcp.js` builds the config; `deepwiki` always, `exa` only when
  `EXA_API_KEY` is set. 55 tests pass.
- **The key never touches a file or a command line.** The config holds the
  literal `${EXA_API_KEY}`; Claude Code expands it from the process environment
  at connect time. The value rides in the per-command `envs` beside `GH_TOKEN` —
  never at `Sandbox.create`, never in the E2B template.
- **`--strict-mcp-config` is not optional here.** Without it, a repository the
  bot clones can add tools via its own `.mcp.json` — the checkout would be
  choosing the agent's capabilities.
- **Remote HTTP, not `npx` stdio.** Most vendor docs show stdio first. A fresh
  sandbox every message means stdio pays an npm install every run, out of the
  five-minute budget.
- **DeepWiki is a debugging instrument, not padding.** Keyless, so its success
  rules out every config-side fault at once. Keep it.
- **The rule, now in `CLAUDE.md`:** a server is addable only if handing its full
  capability to any workspace member would be acceptable. Ray connects his
  production application databases at this point in the video; this workshop
  deliberately does not.

Three findings in TRAPS.md, all from testing rather than the video: "invalid API
key" names three different faults; a connected MCP server proves nothing about
its credential; and a test named as a guard that was not guarding.

**Exa is configured and currently out of quota.** The account hit its monthly
limit mid-lesson, so `web_search_exa` returns 401. Nothing to fix — the code path
is identical and it starts working when the limit resets.

## Lesson 11, as built

Joestar has a browser. It drives a headless Chromium in its sandbox, records
what happens, and sends the recording back. Verified live in `#joestar-dev` on
2026-09-17: a 20,025,522-byte (19.10 MiB) recording arrived in the thread, 2.4x
the old cap, in 224s of a 285s budget.

- **Shipped by the bot as three PRs** (#6 template, #7 upload path, #8 briefing),
  each reviewed in-thread with fixes taken. 66 tests pass.
- **Chromium lives in the E2B template**, pinned via `api/_lib/versions.js`,
  which `e2b/template.mjs` and `api/_lib/thread.js` both import so the version in
  the image and the version in the model's briefing cannot drift.
- **`Template.setEnvs` is build-time only.** The browsers install to
  `/opt/ms-playwright` at build time and the variable is gone at run time, so the
  image looks perfect and fails at first launch. `SANDBOX_RUNTIME_ENVS` in
  `api/_lib/claude.js` sets both variables again at `Sandbox.create`. Proved both
  ways: withhold them from the finished image and Chromium will not start.
- **Output files no longer pass through the function.** `collectOutputs` mints a
  single-use Slack upload URL per file and runs `curl` inside the sandbox; the
  bytes go straight to Slack. **No Slack token ever enters the sandbox** — a test
  asserts it appears in no command string and no `envs` object.
- **`UPLOAD_BUDGET_MS` (30s) is carved out of the sandbox lifetime.** Uploading
  from inside the sandbox puts the upload on the sandbox's clock, so `claude` now
  gets 255s and the sandbox lives 285s. Without that split a long run drops every
  output file.
- **`MAX_OUTPUT_BYTES` is 64 MiB**, and the comment says honestly that it is ours
  and bounded by time, not by any platform limit.
- **The model is told it has a browser on every run**, via `browserCapabilities()`
  in the prompt — unconditional, unlike the GitHub block, because the browser is
  a fact about the machine rather than a credential. Verified in `#joestar-test`,
  which has no repo in its topic: it correctly stated the 64 MiB and 5-file caps,
  which exist only in the Vercel function and cannot be discovered from inside
  the sandbox.

**Ray's "8 MB Vercel limit" is wrong on both counts.** Vercel's documented 4.5 MB
limit governs the function's own request and response bodies, not files it
uploads elsewhere; memory is 2 GB on Hobby. The 8 MiB was our own constant from
lesson 07. Verified against Vercel's Functions Limits page.

**WebM plays inline in Slack**, so no `ffmpeg` and no MP4 conversion was needed —
though Playwright brings its own ffmpeg at `/opt/ms-playwright/ffmpeg-1011` if
that question returns.

Four findings in TRAPS.md, all from testing rather than the video.

### New local tooling

`bin/wait-for-reply` blocks until a Slack thread gets a real answer, so an agent
session stops sleeping guesses and polling. Run it through `bin/with-secrets`.
**It must wait for the placeholder to be edited, not for the message count to
grow** — the bot posts `_thinking…_` immediately and edits it in place, so the
count rises when a run starts and never again.

## How lessons 12–17 were built (2026-09-17)

Noj asked for the remaining "0 to 1" lessons with minimal interaction, and the
work was split by who holds what. Claude orchestrated; **Joestar itself wrote
every product PR**, in `#joestar-dev` (`C0C2FES3UGJ`); subagents reviewed each PR
with mutation tests and wrote the lesson pages; Noj merged with
`gh pr merge N --squash --admin` and ran the two template builds, because
`E2B_API_KEY` still never enters a sandbox. `bin/wait-for-reply` carried every
Joestar round trip — no sleeping guesses.

## Lesson 12, as built

Joestar's sandbox has a database. Postgres 15 and Redis are in the E2B image and
**neither starts on boot**; the bot starts what it needs. Verified live in
`#joestar-test` on 2026-09-17: Postgres, Redis, a Node server and a Playwright
recording in one run — 4 rows back, hits 4 (the favicon), Postgres up in 0.72s.

- **PRs #11 and #19; the template was rebuilt twice.** The cluster is initialised
  at build time as `user` in `/home/user/pgdata`, `POSTGRES_MAJOR` joins
  `api/_lib/versions.js`, and `PGDATA` / `PGHOST=/tmp` / `PGUSER` / `PGDATABASE`
  are runtime envs. The briefed start commands are
  `pg_ctl -l /home/user/pgdata/server.log -o "-k /tmp -c listen_addresses=127.0.0.1" -w start`
  and `redis-server --daemonize yes --save "" --appendonly no --bind 127.0.0.1`.
- **The sandbox boots `/sbin/init`**, which honours Debian's rc/systemd links, so
  Redis autostarted in every sandbox until PR #19 removed them. Only a boot shows
  this — the build log looks perfect. TRAPS.md.
- **`pg_ctl -w start` without `-l` holds the SDK call open until timeout.** The
  server inherits the command's stdout and the call never returns. TRAPS.md.
- Measured: create median 543ms (baseline 519), first command 150ms (696),
  Postgres start 1.3s, Redis 0.5s. The database costs the run almost nothing.
- **The first template build was a no-op** because the checkout sat on a docs
  branch: the build ships whatever branch is checked out. Check before building.

## Lesson 13, as built

Joestar has a persona. `api/_lib/sandbox-files.js` writes `~/.claude/CLAUDE.md`
— persona plus machine facts — into **every** sandbox, in one batched
`files.write`, before `claude` runs. Verified live: asked for it, the bot quoted
the first line back exactly.

- **PR #13.** Ray writes his file once, by hand, because his sandbox is paused
  and persists. Ours is destroyed every run, so "write it once" would write it to
  a machine that no longer exists — it has to be part of every boot.
- The review fixed the toolkit-directory candidate order, added a test that the
  writer never throws (a persona failure must not take the run down), and wrapped
  the `Buffer` in a `Blob` for the E2B files API.
- This is the first thing in the system that shapes *how* the bot answers rather
  than what it can reach, and it costs one batched call per run.

## Lesson 14, as built

Joestar has skills. `toolkit/skills/<name>/` lives in the `joestar-agent` repo,
ships to Vercel through `vercel.json`'s
`functions.api/slack/events.js.includeFiles: "toolkit/**"`, and is written into
`~/.claude/skills/` on every run. Verified live: the bot listed the skill and all
8 of its steps — which also proved `includeFiles` was working.

- **PRs #14 and #15.** Two skills so far: `task-lifecycle` and `codex`.
- **Changing a skill is a PR and a deploy, not an image rebuild.** That is the
  point of shipping them from the repo rather than baking them into the template:
  the slow path (rebuild, ~minutes, needs `E2B_API_KEY`) is reserved for binaries.
- `includeFiles` is easy to get wrong silently — the function deploys fine and the
  directory is simply absent. Listing a skill from inside the sandbox is the
  cheapest proof that it shipped.

## Lesson 15, as built — and not finished

Joestar is growing a memory: a git repo, `nojzac/joestar-memory`, cloned into the
sandbox before `claude` and pushed after it. **PR #18 is merged; PR #20 is open
with fixes in progress**, so this is the one lesson in the chapter that is not
done.

- **The memory repo is private, and is the one deliberate exception** to "no
  private repo gets App write access". Recorded as an exception on purpose: it
  holds only the bot's own notes, and the bot writing its `main` is the design,
  not a risk to be protected against. The App is installed on it and
  `AGENT_MEMORY_REPO` is set in Vercel Production — unset means memory is off.
- **Token minting now takes a repo *list*** — topic repo plus memory repo — and
  every entry is owner-checked, with malformed entries refused before any network
  call. A review found the first version **failed open**: a typo'd env var minted
  an unscoped token. That is exactly the lesson-09 bug class, caught earlier.
- Runtime: shallow clone to `/home/user/memory`, `autoMemoryEnabled` and
  `autoMemoryDirectory` merged into `settings.json`, a briefing appended, push
  after `claude`. `MEMORY_BUDGET_MS` is carved out of `claude`'s time, the same
  split `UPLOAD_BUDGET_MS` introduced in lesson 11.
- **Unverified until PR #20 lands and a live test runs:** that Claude Code honours
  auto-memory at all in `-p` mode. Everything else here is code that runs; this is
  the assumption the feature rests on.

## Lesson 16, as built

Joestar can call a second model. Codex CLI 0.154.0 is in the image (339 MB) and
`setUpCodex` writes `~/.codex/auth.json` and `config.toml` from `CODEX_AUTH_JSON`
**as files only, never as environment variables**. Verified live on 2026-09-17: a
bug was planted, `codex review` returned FAIL with the `[P1]` at the right line,
in 45s.

- **PRs #12 and #15.** The credential is Noj's ChatGPT login, pasted into Vercel
  and stored in 1Password as `codex_auth_json`.
- **The review caught a `console.warn(err.message)` that leaked the credential's
  prefix into the logs**, and a test that missed `SANDBOX_RUNTIME_ENVS`. Both are
  the ordinary shape of this failure: a credential escaping through an error path
  nobody reads until it has already run a hundred times.
- The `.env.op` line **had to ship commented out**, because `op run` refuses to
  start at all when any reference in the file is unresolvable — one absent secret
  otherwise breaks every local command.
- Files-not-envs is the rule that matters here: envs are visible to every command
  in the sandbox and to anything that dumps the environment.

## Lesson 17, as built

Joestar can take a voice note. A `voice-notes` skill plus `transcribe.mjs`
(ElevenLabs Scribe v2, zero dependencies, one retry on 429/5xx, exit codes
0/1/2), with `ELEVENLABS_API_KEY` passed **per command**, the same way `EXA_API_KEY`
has been since lesson 10.

- **PRs #16 and #17.**
- **Not verified live.** No key is set, and a genuine test needs a human to record
  an actual voice note — which is the first thing in the course that Claude cannot
  test for itself.
- **Ray's tag also contains a Slack read proxy, deliberately not built.** It gives
  the bot cross-channel search on behalf of whoever is talking to it, which under
  this project's MCP rule means handing cross-channel search to every workspace
  member. Same reasoning as the production databases declined in lesson 10.

### What working this way taught us

- **PR #10 fixed the bolded-URL bug** (`*<url>*`), verified live — the
  known-and-unfixed item from lesson 11 is closed. While fixing it, `mrkdwn.js`'s
  NUL sentinel turned out to make the file **binary to git**, so diffs and reviews
  were useless; it is now a space.
- **Squash-merging a PR that a later PR was stacked on makes the later one
  CONFLICTING.** The fix is to merge `main` in — **never rebase**, because the push
  guard blocks the force-push a rebase needs. Later requests were all based on
  `main` instead of stacked.

## Known and unfixed

- ~~**Bolded URLs come out broken.**~~ **Fixed 2026-09-17 by PR #10**, written by
  the bot and verified live: `toMrkdwn` no longer collapses `**https://…**` into
  an asterisk Slack swallows, so the PR links it posts now open. Left here so the
  fix is findable from where the bug was recorded.
- **`#joestar-test` has no topic, so the bot now has no GitHub access there.**
  Intended, and stricter than before, but any GitHub test must happen in a
  channel whose topic names a repo.

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
- **Recordings accumulate in Slack and nothing prunes them.** Output files go
  sandbox → Slack directly and stay there; the sandbox copy dies with the
  machine, so Slack's file store is the only copy. The cap is now 64 MiB per
  file and 5 files per run, and Ray's framing for this feature is that *every*
  task ends with a recording — so this is unbounded growth driven by anyone who
  can message the bot. As of 2026-09-17 the bot has uploaded 6 files totalling
  19.2 MiB, of which one 19.1 MiB test artefact is 99.4%. No retention policy,
  no cleanup, and the course never raises it. Worth a decision before
  recordings become routine. `bin/bot-files` lists everything the bot has
  uploaded, newest first, with the delete command for each — **Slack's folders
  are UI-only, there is no folder method in the Web API**, so asking Slack for
  the inventory is the only approach that a script can take.

  **Decided 2026-09-17: deletion is human-in-the-loop, always.** Do not add
  auto-pruning, an upload-time TTL, an age-based sweep, or a cron — whatever a
  future storage decision looks like, it is not that. The point of a recording
  is that Noj watches it, and anything that deletes on a schedule will
  eventually delete one before he has. `bin/bot-files` reflects this: it lists,
  it requires ids named explicitly, it has no `--all` and no `--older-than`,
  and without `--yes` it only shows what the ids refer to.

- **The browser briefing duplicates one line the prompt already has.**
  `browserCapabilities()` says "write it into /tmp/outputs" and the `outputDir`
  block below it says the same thing. Costs ~15 words of context on every run.
  Noticed during the PR #8 review and deliberately not sent back for another
  round trip; trim it next time something touches `buildPrompt`.


- **`bin/smoke` needs extending to the lesson-07 bot** — see TRAPS.md. Probe 5
  should assert an outcome rather than a status: read the thread afterwards and
  check a new message from the bot appeared under `rootTs` (one
  `conversations.replies` call — smoke already has the token and the timestamp). Not urgent: `docs/verifying.md` covers the same ground by
  hand, and smoke is not lying about the chain it does test, only about the
  bot it was written for.
- **A 1Password → Vercel sync would make two-place updates cheap.** Every
  credential here lives in both, and updating means two manual copy-pastes with
  the value on screen. One command would do it without the value touching a
  screen or a disk:
  `bin/with-secrets sh -c 'printf %s "$SLACK_BOT_TOKEN" | vercel env add SLACK_BOT_TOKEN production'`.
  Raised twice, never taken up or declined. Lesson 08 adds a GitHub App private
  key that lives in both places too, so the cost grows.
## Next step

**Lessons 18–21, the "Using your agent" chapter.** The "0 to 1" chapter is
finished as of 2026-09-17 — lessons 04–17 are built, and every page but 15’s is
written. What remains is a different kind of work: `course/LESSON-PAGE-RULES.md`
calls 18 and 21 short orientation lessons, and the whole chapter gets **a short
page rather than the full treatment** — no code walk, no template rebuild, no
deploy. Only the grounding section, Steps and Done are mandatory; omit the empty
sections rather than render shells. Nothing in 18–21 changes the image or the
Vercel function, so for the first time since lesson 05 there is no slow path in
the way.

**Open items, roughly in the order they will bite:**

- **Lesson 15 is not done.** PR #20 is open with fixes in progress, and the
  premise — that Claude Code honours auto-memory in `-p` mode — is still
  unverified. Land #20, run a live test, then write `sops/lesson-15/index.html`;
  it is the one gap in the chapter.
- **Set `ELEVENLABS_API_KEY`** if voice notes are actually wanted. Until then
  lesson 17 ships code that has never run, and verifying it needs Noj to record a
  real voice note — Claude cannot test this one for him.
- **Codex token expiry.** Ray says the ChatGPT credential lasts about 10 days;
  unverified here. When `codex` starts failing, this is the first thing to check,
  and the fix is a fresh paste into both Vercel and 1Password.
- **Pages for 18–21** still to build, per the short-page rules above.
- **The placeholder/timeout pattern, now consistent enough to plan around.** A
  Joestar request that asks it to *research* something times out at 255s; one that
  spells out the design finishes in 60–120s. Do the thinking before the request,
  not inside it — the sandbox clock is not a place to think.

**Settled 2026-09-16: stay on the GitHub free plan until the end of the course.**
Not an open question — don't re-raise it each lesson. What follows from it, and
must be respected for the rest of the course:

- **The bot gets write access to `nojzac/joestar-sandbox` and nothing else.**
  That repo is public, so its ruleset actually enforces, and it holds nothing
  real.
- **No private repo gets `contents: write`.** On the free plan a private repo's
  branch protection does not enforce, and does not say so — so "private" here
  means "unprotected", which is the opposite of how it reads.
- If a lesson wants the bot writing to a real private repo, the choice at that
  point is: use the public sandbox instead, do the work by hand, or revisit the
  plan. Do not quietly install the App on a private repo. (Lesson 09 was the
  likely one and did not need it — it wrote to this repo, which is public for
  the duration of the course.)

**One exception exists, added 2026-09-17:** the private memory repo
`nojzac/joestar-memory` (lesson 15). It was taken deliberately and recorded as an
exception rather than a revision — it holds only the bot's own notes, and the bot
writing its `main` is the design. The rule above still stands for everything else.

Open, neither blocking: rotate `claude_code_oauth_token` (about 19 characters
of it reached a transcript on 2026-09-15; it cannot be revoked, so replacing it
is the only remedy), and delete whichever of the two live 1Password service
accounts is now spare.

**Decided 2026-09-16:** the token rotation happens at the *end* of the course,
not now. Rotating it mid-course means rebuilding the E2B sandbox image and
updating Vercel in the middle of lessons that keep changing both. Don't keep
raising it — it is deferred on purpose, not forgotten.
