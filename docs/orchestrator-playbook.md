# Orchestrator playbook: running the Slack agents course again

How to run Ray Amjad's course from scratch with one Claude Code session
orchestrating, the deployed bot (Joestar) writing its own product code,
subagents reviewing and writing pages, and Noj doing only what needs his hands
or his authority. Every rule below cites the event on 2026-09-08 to 2026-09-17
that produced it; the citations use the same form as the retrospective
extracts. Read `docs/retrospective.md` for the costs behind these rules.

## Roles

### Noj

Noj does the things that need a human's account, a human's dashboard, or a
human's authority, and nothing else.

- Creates credentials and pastes them into 1Password and Vercel: the E2B key,
  `claude setup-token`, the Vercel deploy token, the GitHub App key, Codex
  auth. Claude cannot mint or edit these; the auto-mode classifier denied even a
  10-second field edit as a "Secret-Store Write" (session ef382fd2 part 3 @
  2026-09-16T02:06:06; part 3 @ 21:14:09; part 2 @ 2026-09-15T05:55:21).
- Clicks the dashboards: Slack manifest paste and Save Changes, Vercel login
  connection and Root Directory, GitHub App installation, channel topic. The
  instructions to him say exactly which control, because "set the topic" was
  once done as a rename (session ef382fd2 part 7 @ 02:27:24–02:33:48; part 1 @
  05:21:13).
- Merges every PR with `gh pr merge N --squash --admin`; the App cannot approve
  its own PR and the orchestrator has no push to main (TRAPS.md: "A one-person
  repo cannot satisfy '1 approval' (lesson 09)"; session ef382fd2 part 8 @
  2026-09-17T04:13:07).
- Runs the E2B template build, from a checkout of `main`, because
  `E2B_API_KEY` never enters a sandbox and a direct build from the orchestrator
  was blocked as "Production Deploy" (session ef382fd2 part 9 @ line 164-166;
  part 10 @ 11:47:16–11:47:46).
- Decides exceptions: repo visibility, the GitHub plan, a private repo getting
  write access, a new MCP server (session ef382fd2 part 7 @ 01:54:47–01:55:14;
  part 11 @ 12:18; part 8 @ 2026-09-17T04:03:31).
- Gives every "push" and every "go" himself, to the session that will act. A
  relayed go is not a go (session ef382fd2 part 5 @ 05:07:50; part 6 @
  2026-09-16T12:27:18).

### The orchestrator (one Claude Code session)

- Writes the request to the bot with the design already decided, reads the
  reviewer's verdict, sends the fix request, tells Noj what is mergeable,
  verifies live after a deploy, and keeps RESUME.md true. It does not write
  product code after lesson 09 ("have joestar do as much work as it can and
  should", session ef382fd2 part10 @ 11:25:16 and @ 11:25:25).
- Does not read lesson material it is about to delegate whole; that bloats its
  context and was corrected on the first day (session 185514e6 part 1 @
  2026-09-08T02:39:42).
- Does not run repeatable checks by hand. Test reruns, boot probes, render
  screenshots and page validation go to subagents, because doing them itself
  drew "you seem to be doing most of the work, not subagents" (session ef382fd2
  part 11 @ 12:24, lines 912-926; part 12 @ 13:31:46).
- Builds the lesson page before the code and before asking for any credential,
  so Noj learns what he is about to do (session ef382fd2 part 3 @
  2026-09-15T21:15:26–21:16). The exception is Noj's standing instruction from
  lesson 12 on: get the bot running "with minimal interaction", lesson pages
  "still written but don't gate the work" (session ef382fd2 part10 @
  11:23:16), which is how lessons 12–17 ran. The page-first rule holds for any
  lesson that needs his hands.
- Runs alone. Two cooperating sessions caught real bugs but cost relay
  round-trips, a duplicated lesson and an approval near-miss, and were
  consolidated before lesson 08 (session ef382fd2 part 6 @ 2026-09-16T12:51:38;
  session e4985974 part 2 @ 12:52:41).

### Subagents

- **Review agents** (opus): one per PR, in a worktree with `node_modules`
  symlinked in, with a mutation-testing brief (see "The review gate"). They
  found the fail-open mint in PR #18, the unwired memory in PR #20 and the
  decorative test in PR #4 (session ef382fd2 part 11 @ 12:05 and @ 12:23; part
  8 @ 2026-09-17T03:54:52–03:54:59).
- **Page agents**: one per lesson page, splicing from the committed HEAD of the
  template page rather than the working copy when a sibling is editing it
  (session ef382fd2 part 11 @ 12:24, lines 929-938). A lesson page costs on the
  order of 124k tokens and 8 minutes (part 11 @ 12:05, lines 217-241).
- **Probe agents** (read-only): to check a docs pointer fires, a claim holds, or
  a hook fires; given a natural question and told to log every file read
  (session ef382fd2 part 5 @ 04:05:19–04:06:54).
- **Research agents**: research only, no file writes, no vault commands, and
  every load-bearing claim must come with the command that verifies it, because
  one report recommended `--bare` with an OAuth token, which `claude --help`
  says are incompatible (session ef382fd2 part 3 @ 2026-09-15T21:12:53–21:13:39;
  @ 2026-09-16T02:21:29–02:22:12).
- The brief's first line says the final report must contain the complete
  deliverable, not a summary of it; two SVG agents left the markup in an
  intermediate message and each cost a round-trip (session ef382fd2 part 2 @
  2026-09-15T11:32:20, 11:35:25).

### The bot (Joestar)

- Writes every product PR: template changes, prompt changes, skills, memory,
  tooling, bug fixes (RESUME.md: "How lessons 12–17 were built": "Joestar
  itself wrote **every product PR**"). It wrote PRs #2, #4, #6–#8, #10–#20 and
  #22; the orchestrator opened the docs and lesson-page PRs (#3, #5, #9, #21,
  #23) and PR #1, the timeout raise that made the bot's runs fit (`gh pr list`
  authors: `app/joestar-slack-bot` versus `nojzac`; session ef382fd2 part 7 @
  02:41:20–02:42:44; part 8 @ 2026-09-17T04:05:22–04:05:41).
- Is given a design, not a research task; is told which files to read, to
  sparse-clone `joestar-agent/` only and shallow, to skip `sops/` and
  `course/`, and to push a wip commit first (see "Request sizing"). The shallow
  clone is why merging main is not its job (see "Merging").
- Cannot build the template, cannot merge, cannot see Vercel logs, and its
  self-reports ("mutation-tested each") are checked, not believed (session
  ef382fd2 part 10 @ 11:34:26 and @ 11:39:33).
- Is asked to verify what it shipped with a concrete number (a byte size, a page
  title, `gh repo list` output), and the orchestrator confirms the number
  server-side (slack C0C2FES3UGJ @1789614835.514499; session ef382fd2 part 9 @
  lines 374-398).

## Request sizing for the bot

**The ceiling.** The Vercel function has `maxDuration = 300`. The sandbox lives
285 s, `UPLOAD_BUDGET_MS` takes 30 s, memory takes 25 s when on, so `claude`
gets 255 s or less. A run that hits it dies with `[deadline_exceeded]` and
nothing pushed; it does not truncate (RESUME.md: "The bottleneck dogfooding
found immediately"; "Lesson 11, as built"). The run budget starts at the
ceiling: `runClaude` defaulted to 240 s and the first two dogfooding requests
died at it while the bot was still working; "Raising `runClaude`'s default
from 240s to 285s ... was enough — the retry succeeded" (RESUME.md: "The
bottleneck dogfooding found immediately"; session ef382fd2 part 7 @
02:40:16–02:41:06).

**What a request that finishes looks like.** Names the repo and branch, names
the files to read and forbids reading others, pastes the design, says "no
research", asks for one change, and asks for a push after each step and a
reply with the sha and the test line. Real examples:

- Postgres and Redis, retry: "do not research: the design is below, apply it",
  exact files listed. Opened PR #11 about 90 s later (slack C0C2FES3UGJ
  @1789644707.748079; session ef382fd2 part 10 @ 11:31:45).
- "ONE change only, in `joestar-agent/api/_lib/claude.js`. Do not read any
  other file except `joestar-agent/test/claude.test.js`. No research." Moving
  `pushMemory` into `finally`, with the code pasted (slack C0C2FES3UGJ
  @1789649712.261099).
- ELEVENLABS passthrough, "Read only api/_lib/claude.js around the per-command
  `envs` block", three numbered items (slack C0C2FES3UGJ @1789646178.980289).
- Codex skill, "One new file, no code changes", body limits stated (slack
  C0C2FES3UGJ @1789645766.094469).

**What a request that times out looks like.** A whole lesson or several
independent changes in one message, or a message that asks the bot to search
or research first. Four of the six timeouts fit; the first two did not:

- The first two, "load the channel topic as the GitHub repo" and, the same
  minute, a live typing indicator, were separate single-change requests that
  died at the 240 s default while the bot was still working; the retry after
  the raise, "now that the timeout is raised", succeeded (slack C0C2FES3UGJ
  @1789612520.210019, @1789612530.483259, retry @1789613607.648949; RESUME.md:
  "The bottleneck dogfooding found immediately"; session ef382fd2 part 7 @
  02:40:16–02:41:06). Nothing about their size would have saved them.
- Playwright plus Chromium plus the upload-URL relay plus a cap change in one
  message (slack C0C2FES3UGJ @1789619333.883969), split by Noj: "this message
  is part 1 of 2, and I only want the small half" (@1789619697.537369).
- Postgres and Redis with the design described in prose; the bot spent 255 s
  reading Debian packaging (slack C0C2FES3UGJ @1789644385.875169; session
  ef382fd2 part 10 @ 11:31:06).
- Lessons 13 and 14 together (slack C0C2FES3UGJ @1789645027.046259); Part A
  and Part B each succeeded first time (@1789645323.039779,
  @1789645591.255769).
- Four runtime fixes bundled, nine minutes after the wip rule was written; it
  timed out with nothing pushed anyway (slack C0C2FES3UGJ @1789649224.910269),
  then landed as five single-purpose messages (@1789649712.261099 to
  @1789651045.313039).

**Rules.**

1. The run budget is at the ceiling before the first dogfooding request.
   `runClaude` shipped at 240 s against a 300 s function; two requests died
   before it was raised to 285 s (RESUME.md: "Raising `runClaude`'s default
   from 240s to 285s"; session ef382fd2 part 7 @ 02:40:16–02:42:44, PR #1).
2. One change per request. If a request touches more than two independent file
   groups, split it before sending; every split retry in the record succeeded
   (slack-joestar-dev extract, "Request tally"; session ef382fd2 part 12 @
   12:55:10).
3. The design is in the message. "A Joestar request that asks it to research
   something times out at 255s; one that spells out the design finishes in
   60–120s. Do the thinking before the request, not inside it" (RESUME.md:
   "Next step").
4. Wip push first. The task-lifecycle skill says push a `wip:` commit as soon
   as the branch exists and the first file changes, then after every step that
   compiles, with the step number in the commit message; a run that times out
   after a wip push loses only the last step (slack C0C2FES3UGJ
   @1789648702.884379; session ef382fd2 part 11 @ 12:14, lines 610-646, where a
   timed-out run resumed from its wip commit on the same branch).
5. A wip push does not rescue an oversized request; the four-fix bundle had the
   rule and still pushed nothing (slack C0C2FES3UGJ @1789649224.910269). Size
   first, wip second.
6. Name the traps the bot should avoid instead of letting it find them: the
   Postgres request listed three known traps up front (slack C0C2FES3UGJ
   @1789644385.875169, "Three traps, known from lesson 11").
7. Say which existing tests assert the old behaviour and must change, or the
   step comes back with a red suite (session ef382fd2 part 12 @
   13:00:19–13:02:14).
8. Ask for "whether any test covers this change; if none does, say so rather
   than quoting the suite count", because "57/57 pass" on PR #7 meant nothing
   (slack C0C2FES3UGJ @1789644385.875169; TRAPS.md: "'All tests pass' measuring
   the wrong suite (lesson 11)").
9. Base on `origin/main`, never on another open branch (see "Merging").
10. Continue a timed-out run on the same branch; do not restart (session
    ef382fd2 part 11 @ 12:15).

## The review gate per PR

Every PR the bot opens gets a review subagent before Noj hears the word
"mergeable". No PR in the project carries a GitHub review record, so the
review lives in the Slack thread and the orchestrator's transcript
(git-history extract: "every `reviews` field returned `[]`"); posting the
verdict as a PR comment would make the record self-contained.

**What the reviewer does.**

1. Checks out the PR in a worktree, symlinks `node_modules`, runs the full
   suite from `joestar-agent/` (session ef382fd2 part 8 @ 2026-09-17T03:54:41).
2. Reads the diff and lists which test files changed. A PR that touches `_lib`
   and no test file is not verified by its test count (session ef382fd2 part 9 @
   line 466-478).
3. Mutation-tests every new test and every security guard: break the thing
   the test names, run, require red, restore. Confirm the mutation landed by
   diffing before reading the result; one mutation silently failed to apply and
   looked like a pass (session ef382fd2 part 8 @ 2026-09-17T03:57:49–03:57:54).
   The bot's own "mutation-tested" claims were wrong on PR #10 (two of three
   vacuous) and PR #12 (three of six not caught) (session ef382fd2 part 10 @
   11:34:26, @ 11:39:33).
4. Checks the feature is wired end to end, not only correct in isolation. PR
   #20's memory runtime was 91/91 green and never called, because `events.js`
   never passed `memoryRepo` (session ef382fd2 part 11 @ 12:23, lines 817-856).
5. Checks credential paths: no `err.message` or raw stderr logged where a
   credential could be in it (PR #12 leaked about 10 characters; PR #20 logged
   `err.message` on two memory paths); the token appears in no command string
   and no `envs` object (session ef382fd2 part 10 @ 11:36:47; part 12 @
   13:17:05; part 9 @ lines 522-539).
6. Checks fail-closed on malformed input for anything that gates a scoped
   credential; a malformed `AGENT_MEMORY_REPO` was silently filtered and minted
   an unscoped token (session ef382fd2 part 11 @ 12:05, lines 165-198; slack
   C0C2FES3UGJ @1789646740.735979).
7. Checks `.env.op` for any new `op://` reference that does not resolve today;
   one unresolved line breaks every `bin/with-secrets` call (session ef382fd2
   part 10 @ 11:45:11).
8. Checks the change against CLAUDE.md's invariants, in particular "there is no
   such thing as the bot can see it but people cannot"; the memory briefing
   called a directory "private" when every channel could read it (session
   ef382fd2 part 12 @ 13:17:05).
9. Where an external API is involved, calls it with a fake key to verify the
   endpoint, headers and field names, as was done for ElevenLabs (session
   ef382fd2 part 10 @ 11:53:09).
10. Reports PASS, NEEDS FIX, DO NOT MERGE or MERGE with the test counts, the
    mutations tried and which were caught, and one line per finding, as the
    PR #18, #20 and re-review reports did (session ef382fd2 part 11 @ 12:05,
    "NEEDS FIX — one real fail-open ... 4/4 planted mutations caught; 76→88";
    part 12 @ 13:17:05, "104/104 tests pass, but verdict DO NOT MERGE"; @
    13:22:23–13:23:20, "verdict MERGE").

**Two cases where review caught a silent loss.**

- PR #20, after the bot merged main into its branch from its sparse shallow
  clone: a shallow clone can make git report unrelated histories, and the bot
  resolved the whole-file conflicts by taking main's side of `claude.js` and
  `claude.test.js`, deleting the memory runtime with no error. Found by
  diffing against the pre-merge commit `81ffa73`; restored verbatim and
  confirmed with `grep -c` (session ef382fd2 part 12 @ 12:41:44–12:42:11;
  slack C0C2FES3UGJ @1789648937.984399; TRAPS.md: "A shallow clone can make a
  bot-driven 'merge and keep both sides' silently delete work").
- PR #20, the feature itself: reviewed as functionally sound, never switched on
  (session ef382fd2 part 11 @ 12:23).

**What to re-review after a bot merge of main into its branch.** First, do
not ask for one: merge `origin/main` locally from a full clone, or have the
bot run `git fetch --unshallow` before it merges (TRAPS.md: "A shallow clone
can make a bot-driven 'merge and keep both sides' silently delete work",
prevention "or do merges locally"). If the bot merged anyway, before anything
else: diff the branch's own feature files against the branch tip
before the merge, and `grep -c` the feature's symbols; then check RESUME.md
and other docs for merge artifacts (duplicated sections, stale paragraphs),
which PR #20 also carried (session ef382fd2 part 12 @ 13:17:05); then re-run
the full suite. Only then re-review the diff.

**Findings go back to the bot in its thread**, not fixed by the orchestrator
(session ef382fd2 part 8 @ 2026-09-17T03:55:17). A fix request that changes a
tested behaviour names the tests that must change (session ef382fd2 part 12 @
13:00:19).

## Merging

- One PR at a time on `main`, each based on `origin/main`. Stacking PR #12 on
  PR #11 for parallelism made #12 CONFLICTING the moment #11 was squash-merged;
  the assistant's own root cause was "the choice to stack, not merge timing"
  (session ef382fd2 part10 @ 11:43:02–11:44:42; TRAPS.md: "Squash-merging a
  base PR breaks anything stacked on it"). Send the next request only after
  the previous merge lands.
- Noj merges: `gh pr merge N --squash --admin`. The PR shows
  `BLOCKED / REVIEW_REQUIRED` beforehand because the status ignores bypass
  actors (TRAPS.md: "A one-person repo cannot satisfy '1 approval'"; session
  ef382fd2 part 8 @ 2026-09-17T03:58:23).
- The orchestrator answers "what prs can be merged" with the list that has a
  PASS or MERGE verdict and nothing else (session ef382fd2 part 11 @ 12:07).
- If a branch must take `main`, it is `git merge origin/main`, never rebase;
  the push guard blocks the force-push a rebase needs (slack C0C2FES3UGJ
  @1789648422.637469). The merge is done locally from a full clone, or the bot
  unshallows first: from its sparse shallow clone, git can report unrelated
  histories and the bot resolves whole-file conflicts by taking one side, which
  is how PR #20 lost its runtime and how PR #13 came back with three files
  "resolved by keeping both sides" (TRAPS.md: "A shallow clone can make a
  bot-driven 'merge and keep both sides' silently delete work"; slack
  C0C2FES3UGJ @1789645742.618139). "Keep both sides" is not a safe instruction
  on its own; the post-merge re-review above is mandatory either way.
- After a merge: pull `main`, delete the local branch, remove the review
  worktree (session ef382fd2 part 8 @ 2026-09-17T04:13:07–04:13:19).
- If the merged PR changed `e2b/template.mjs`, Noj rebuilds from a checkout of
  `main`; the first lesson-12 build was a no-op because his shell was on a docs
  branch, and the boot probe then measured the old image (session ef382fd2
  part 10 @ 11:47:16–11:47:46 and @ 11:56:53–11:57:12). Say the branch in the
  instruction.
- Docs and lesson pages ship as their own PR after the feature PR, so the page
  records what happened rather than what was planned (session ef382fd2 part 8
  @ 2026-09-17T04:03:58–04:05:41).

## Verification

Cheap checks first, always after the deploy, never instead of it
(docs/verifying.md).

1. **CI green and the endpoint alive.** Watch the run to completion, then `GET`
   the events URL and require 405; a 500 on a GET means the module failed to
   load, which is how the `e2b` ESM/CJS crash was caught after local tests
   passed: every production request 500'd until fixed, and no test could have
   seen it, because a modern local Node tolerates `require()` of an ESM module
   and Vercel's runtime does not. A local green says nothing about the deploy
   runtime (session ef382fd2 part 4 @ 03:02:40–03:05:14; TRAPS.md: "A
   dependency that works locally and dies on Vercel (lesson 05)"; session
   e4985974 part 1 @ 12:11:13).
2. **`bin/preflight`** after any manifest change or reinstall; it reads required
   scopes from the manifest since 2026-09-16 (session e4985974 part 1 @
   12:11:47). Know that `bin/smoke` covers the lesson-04 chain only and probe 5
   asserts a status, not a reply (TRAPS.md: "Checking tools that pass green
   while blind").
3. **Live Slack end to end** in `#joestar-test` via the connector, with a
   question only the transcript can answer ("which word did you put in
   backticks earlier?"), then a thread reply without a mention (session
   ef382fd2 part 6 @ 2026-09-16T12:11:25–12:16:03; docs/verifying.md).
4. **Server-side confirmation** of anything the bot claims: `gh pr view` and
   `gh api` for a PR, the remote ref for a blocked force-push,
   `conversations.replies` for an uploaded file's byte count (session ef382fd2
   part 7 @ 01:46:31–01:49:38 and @ 01:49:41–01:52:42; part 9 @ lines 374-398).
5. **Template rebuilds** get a boot probe after the rebuild, and again after
   any follow-up fix, because the first probe can be measuring the old image
   (session ef382fd2 part 11 @ 12:00–12:02 and @ 12:11–12:12).
6. **Negative tests** count as proof: a bad signature returns 401, a broken
   token fails, the same image without the runtime envs cannot launch Chromium
   (session ef382fd2 part 1 @ 05:25:38–05:26:24; part 9 @ lines 293-310).
7. **Keyless before keyed.** Test DeepWiki before Exa so a failure isolates to
   the credential (session ef382fd2 part 8 @ 2026-09-17T03:47:51–03:48:19).
8. **Guards are proven live.** A hook is verified with a canary through the
   actual tool path, not by unit tests of its script (session ef382fd2 part 3
   @ 2026-09-16T02:13:15–02:13:30); branch protection is verified by a push that
   should be refused, and re-verified after any visibility change (session
   ef382fd2 part 7 @ 01:53:16–01:53:50 and @ 02:23:01–02:23:57).
9. **No pipes in a check.** `git push | tail` reports `tail`'s exit code
   (session ef382fd2 part 7 @ 01:41:00–01:41:33).

**What counts as proof.** An observed side effect in the system under test: a
message under the root timestamp, a PR on GitHub with the expected author, a
commit in the memory repo, a file of the stated byte size in the thread, a
remote ref unchanged. Not proof: an HTTP 200, a test count without a diff of
the tests, a test's name, the bot's own report, a peer session's summary, a
"connected" status (session e4985974 part 2 @ 12:55:48–12:56:19; session
ef382fd2 part 8 @ 2026-09-17T03:46:17). Before accepting any green, name what it
would have had to see to go red (TRAPS.md: "Checking tools that pass green
while blind").

**Vercel logs** are read only in the dashboard by hand; there is no CLI or
token locally, and the `[memory]` lines were never read for that reason
(docs/verifying.md: "Where the logs are"; session ef382fd2 part 12 @ 13:28:01).
If a verification depends on a log line, ask Noj to read it.

## When to stop and ask Noj

These are the decisions that actually needed him. Ask once, with the exact
command or click, and batch related asks into one message.

- **Credentials.** Creating any token or key, pasting it into 1Password or
  Vercel, editing a vault field (even removing a leading space): Noj's hands
  only (session ef382fd2 part 3 @ 2026-09-16T02:06:06 and @ 02:07:08; part 3 @
  2026-09-15T21:14:09). A credential that arrives as a downloaded file (the
  GitHub App `.pem`) never lands inside the working tree: tell Noj where it
  may go (Vercel and 1Password, then deleted), not only what to do with it;
  `.gitignore`'s `*.pem` is a backstop, not the control. The lesson-08 key
  sat untracked in the checkout for about two minutes before a planned
  `git add -A` (TRAPS.md: "A private key inside the repository (lesson 08)").
- **Pushes and deploys.** A push to `main` is a production deploy; commit and
  push are separate decisions and each push gets its own "go" (session ef382fd2
  part 5 @ 04:00:13; session e4985974 part 2 @ 12:27:37, 12:48:42).
- **Merges.** Every PR, after the review verdict (session ef382fd2 part 11 @
  12:07 "so do #19"; @ 12:11 "gh pr merge 18 done").
- **Template builds.** Noj runs `bin/with-secrets node e2b/build.mjs` from
  `main` (session ef382fd2 part 9 @ line 164-166; part 10 @ 11:47:16).
- **Repo visibility and plan.** Flipping a repo public was blocked as "Create
  Public Surface" and handed to Noj; making a sandbox repo public to route
  around the free plan drew "why public" and a rejected tool call. State the
  tradeoff before the action (session ef382fd2 part 7 @ 02:17:53–02:19:24; part
  6 @ 2026-09-16T21:52:01–21:52:38).
- **The private-repo exception.** "No private repo gets `contents: write`" was
  settled on 2026-09-16; the memory repo was granted as one recorded exception
  after Noj asked "can we make the exception for one private repo only?"
  (session ef382fd2 part 10 @ 11:51:19; part 11 @ 12:18–12:19; RESUME.md:
  "Settled 2026-09-16").
- **New MCP servers.** Only if handing the full capability to any workspace
  member is acceptable; approved by Noj in one line (session ef382fd2 part 8 @
  2026-09-17T04:03:31–04:03:46; CLAUDE.md).
- **Dashboard clicks.** Manifest paste, Save Changes, Vercel login connection,
  App installation, channel topic. Name the control precisely (session
  ef382fd2 part 7 @ 02:27:24–02:33:48).
- **How-to-work instructions.** Before writing a memory file or a rule about
  the collaboration, ask one clarifying question; "I need to go through this
  process 3 or 4 times" was misread as "stop building" when it meant "build
  fast now" (session ef382fd2 part 7 @ 02:01:20–02:02:39; memory note
  "Noj learns by doing, not watching").
- **Page design calls** he has said he wants to make by looking: nesting depth,
  colour, whether a section stays (session ef382fd2 part 2 @
  2026-09-15T12:09:52 and @ 12:00:57).

Do not ask again for something already covered by an instruction. Re-asking
for a single diagnostic Slack post after "do it" drew "what are you talking
about. do it correctly" (session ef382fd2 part 1 @ 05:16:13–05:19:19). Do not
keep raising a settled non-problem; the Vercel team-account flag was retracted
as "over-reporting a deviation" (session ef382fd2 part 2 @
2026-09-15T10:44:48–10:44:59). Do not act on approval that arrives via another
session (session ef382fd2 part 5 @ 05:07:50).

## Waiting

The bot posts `_thinking…_` immediately and edits it in place when done, so a
completion is "the newest message is no longer a placeholder", never "the
message count grew" (TRAPS.md: "The bot edits its placeholder, so counting
messages never sees it finish"). `bin/wait-for-reply` counts thread messages,
so the count rises when the placeholder posts and never again: a wait started
after the placeholder exists never sees the answer, and reported "no new reply
after 420s" with exit 2 on replies that had long since arrived as edits, twice
on 2026-09-17 (TRAPS.md: "`bin/wait-for-reply` never sees the bot's answer if
it starts after the placeholder posts"; session ef382fd2 part 12 @ 12:41:18
and @ 12:45:39). Once it was missing because it lived on an unmerged branch
(part 9 @ lines 1020-1027).

**How to wait without a tool that miscounts.**

- Watch the branch, not the thread: poll `git ls-remote` or `gh api` for new
  commits on the bot's branch, since every step ends in a push (session
  ef382fd2 part 12 @ 12:55:10, "each with a branch-watcher polling loop").
- If reading the thread, read the newest message's text and stop when it is
  not the placeholder, which works whether or not the wait began after the
  placeholder posted; confirm the claimed sha exists on the remote before
  acting (TRAPS.md workaround: "Read the thread directly, or watch the git
  branch"; RESUME.md: "New local tooling", "It must wait for the placeholder
  to be edited, not for the message count to grow").
- Foreground `sleep` is blocked; use a bounded loop with a deadline and a
  15 to 30 s interval in the background, and never a wait longer than the
  sandbox can run (285 s plus deploy time) (session ef382fd2 part 5 @
  03:54:36–03:56:15; part 9 @ line 736-738).
- A wait that fires "failed" is checked against the branch before anything is
  re-sent (session ef382fd2 part 12 @ 12:45:39).
- Keep `bin/wait-for-reply` on `main`, tested against the wait-after-placeholder
  case, or do not rely on it; it once had to be copied out of an unmerged
  branch and `chmod`'d before a wait could start (session ef382fd2 part 9 @
  lines 1020-1027).

**What to run in parallel while waiting.** Two to four items were routinely in
flight at once (session ef382fd2 part10 @ 11:37:39):

- The review subagent for the previous PR (session ef382fd2 part 11 @ 12:02).
- The lesson page for the current lesson, by a page agent (session ef382fd2
  part 11 @ 12:05).
- The docs branch assembly, RESUME.md update, or TRAPS.md entry for what was
  just learned (session ef382fd2 part 11 @ 12:09).

Not in parallel: a second product request to the bot on a branch that depends
on the first (see "Merging"), or a template build while a template PR is still
open.

## Session hygiene

- **Compact only when the tree is clean and RESUME.md is current.** The
  pattern that worked: commit everything, update RESUME.md, then `/compact`
  (session ef382fd2 part 3 @ 2026-09-16T01:39:13–01:41:43; part 4 @ 03:39:05;
  part 5 @ 04:31:52–04:33:19).
- **Write decisions to a file before they are lost.** `sops/DESIGN-SPEC.md` was
  written so the colour, nav and accordion decisions survived a compaction
  (session ef382fd2 part 2 @ 2026-09-15T20:34:33–20:35:38).
- **RESUME.md states what is true now, not what was planned.** It claimed "no
  code" while a finished handler existed, "CLI-only" deploys while CI deployed
  on every push, and full smoke coverage after five untested features shipped;
  each was corrected only when someone tripped on it (session f46cda7d part 1 @
  01:44:06; session ef382fd2 part 5 @ 04:10:21–04:10:25; session e4985974 part
  2 @ 12:53:35).
- **The first file a stranger reads must describe the current bot.**
  `joestar-agent/README.md` still said "random-number bot" two lessons later and
  sent a probe through nine files (session ef382fd2 part 5 @
  04:06:54–04:08:22).
- **CLAUDE.md stays short.** Always-on rules plus "BEFORE doing X read Y"
  pointers; the detail lives in `docs/`. It was cut from 89 to 22 lines after
  "the claude.md file is far too long", and the pointers were then verified by
  probe (session ef382fd2 part 5 @ 03:58:53–04:00:13 and @ 04:05:19).
- **Memory files** hold only what Noj has confirmed about how to work; one was
  written from a misread and had to be rewritten and indexed (session ef382fd2
  part 7 @ 02:01:39–02:02:39).
- **Before closing a session**, check `git status` for uncommitted work that
  belongs to a subagent or another process, and production health (session
  e4985974 part 2 @ 13:01:51–13:02:04).
- **Record traps the day they are found**, as their own commit or PR, with the
  general rule and not only the instance (session ef382fd2 part 7 @ 01:43:47;
  git ef7e812, PR #23).
- **Edits in auto mode**: the Edit tool refuses files read via Bash; use a
  scripted replace with a uniqueness assertion instead (session ef382fd2 part 5
  @ 03:57:45).
- **Two agents, one file**: splice from the committed HEAD, not the working copy
  (session ef382fd2 part 11 @ 12:24, lines 929-938).
- **Leave open items explicitly open** in RESUME.md with the first change to
  make, rather than silently deferring (RESUME.md: "Open items" under lesson
  15; session ef382fd2 part 9 @ line 1049-1051).
