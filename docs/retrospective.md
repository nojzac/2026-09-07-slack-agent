# Retrospective: if this project were done again from scratch

Written 2026-09-17, after lessons 04 to 21 of Ray Amjad's Slack agents course
were built as Joestar. The evidence is the session transcripts (six Claude Code
sessions, 2026-09-08 to 2026-09-17), the git and PR history, the `#joestar-dev`
Slack channel, and the project's own TRAPS.md and RESUME.md. See "Method" at
the end for what was and was not read.

## Summary

The course's own code was never the expensive part. The largest single cost was
one-time account state that Ray already had (a Vercel to GitHub login
connection, an unsaved Slack settings page, a 1Password token truncated by a
Keychain prompt), which turned a 4m14s video into an evening and produced two
wrong diagnoses written into the docs. The next largest were self-inflicted: a
credential detour that leaked part of an unrevocable token and exposed five
vaults before anyone asked whether 1Password was needed at all; explanations
that did not land, which cost a whole lesson-01 session and a working Slack
handler; and lesson pages rebuilt three times before a design spec existed.
Once the bot was writing its own PRs (lesson 09 on), the recurring costs were
request sizing against the sandbox budget (two of six timeouts died at a 240 s
default that should have been at the ceiling from the start; the other four
were bundled or research-first requests), a stacked PR and a "keep both sides"
merge from a shallow clone that silently deleted a feature, and checks that
reported green while blind, which happened at least ten times in the bot's own
tools, in the bot's self-reports, in the orchestrator's probes, and once in a
local suite that was green while every production request returned 500. What
went right is also clear from the record: every one of those silent failures
that was caught was caught by an independent check against live state, a
mutation test, or a diff, never by trusting a report.

## The ten findings, ranked by cost

### 1. One-time account setup was discovered by failure instead of checked first

**What happened.** Lesson 04 on 2026-09-15 (transcript 02:14 to 05:51) was
spent almost entirely on account state, not code. Vercel had no GitHub login
connection, so deploys sat at status `UNKNOWN` with no error; the assistant
diagnosed it first as "concurrent builds disabled" and then blamed the git
commit email (which Vercel's own help text suggests changing, and which
TRAPS.md calls a red herring) before the dashboard named the real cause. The
Slack Event Subscriptions page showed a green Verified endpoint that received
no events because Save Changes was never clicked; the assistant diagnosed that
as "app needs reinstalling", and Noj found the real cause himself. A 1Password
service-account token was pasted into an interactive Keychain prompt that
silently truncates at 128 characters, and the second attempt stored the
assistant's own suggested shell command instead of the token. The Vercel project
Root Directory defaulted to the repo root and was caught one step before
push-to-deploy would have taken the bot down.

**What it cost.** An evening against a 4m14s video. Three attempts to store one
token (03:00 to 03:06, inside about 25 minutes of credential handling from
02:40). About 15 to 20 minutes and one misdiagnosis on the silent bot, then two
further deploys stuck 6 minutes or more each that Noj had to cancel by hand in
the Vercel UI. Two false diagnoses were written into
RESUME.md and corrected later. `bin/preflight` and `bin/smoke` were built
afterwards (about 50 minutes) to stop the same class of problem recurring.

**The alternative.** Before any lesson-04 code: a checklist of account state run
in seconds, not hours. Vercel login connection present (`vercel link` refuses
without it); Slack app created from the manifest with the real domain, then
Save Changes confirmed by a hand-signed `app_mention` posted at production;
service-account token created with `--raw` and piped straight into Keychain,
never pasted; Vercel Root Directory checked immediately after `vercel link`.
That is `bin/preflight`, built first instead of last.

**The rule.** Run a read-only preflight of every account and dashboard setting a
lesson depends on before writing its first line of code, and when a platform
stays silent, read its dashboard before inventing a hypothesis.

**Evidence.**
- TRAPS.md: "Where the time actually went" (Vercel connection the largest
  share, unsaved Slack settings second, 1Password third).
- session ef382fd2 part 1 @ 03:00:44–03:06:42 (three token attempts).
- session ef382fd2 part 1 @ 05:20:33–05:34:54, correction at 05:46:26 (wrong
  "concurrent builds" diagnosis written to docs).
- TRAPS.md: "Vercel must have a GitHub login connection before anything else"
  ("The email is a red herring").
- session ef382fd2 part 1 @ 05:04:58–05:21:13 (the silent bot misdiagnosed as
  needing an app reinstall) and @ 05:21:13 ("it works now. I didn't save after
  adding the url.").
- session ef382fd2 part 1 @ 05:48:03–05:50:31 (Root Directory caught before
  enabling git connect).
- session ef382fd2 part 2 @ 2026-09-15T06:03:28 (the assistant's own accounting:
  254 s video, an evening here, "blamed concurrent builds, then your git email").

### 2. The credential detour: five vaults exposed, a token partly leaked, a hook that failed open, a private key inside the checkout, and none of the 1Password work needed

**What happened.** On 2026-09-16 at 02:05 the assistant piped a 1Password read
into `od -c` "to check only length", which printed about 19 characters of the
Claude OAuth token and 8 of the E2B key into the transcript, the exact thing
CLAUDE.md forbids. Noj asked for a hook to block secret reads; it was built,
unit-tested 16/16, registered with `$CLAUDE_CONFIG_DIR` (unset in the Bash
environment) and therefore never fired. A live item fetch with `--format json`
reached 1Password two minutes later and was stopped only because Noj dismissed
the auth popup. Then, prompted by Noj's "so it is better to use .env files than
1password because at least i don't expose all my passwords", the assistant
checked its own shell and found it was riding the 1Password desktop CLI
integration, signed in as the whole account with all five vaults including a
client's, rather than the scoped service account. Untangling that (`.zshrc`
versus `.zshenv`, a blocked "Credential Exploration" action, deny rules, a
research subagent) took most of the session. At 03:27 Noj asked whether the
project needed 1Password at all; the answer was no, the deployed bot reads
Vercel env vars and only local tooling touches the vault. Later the same day,
in lesson 08, the GitHub App's `.pem` private key was downloaded into a folder
inside the repo checkout and sat there untracked for about two minutes, with
`git add -A` the next command in the lesson, in a repo that pushes to GitHub
and was later flipped public. Nothing was staged; `.gitignore` was extended to
`*.pem`, `*.key`, `*.p12` and `id_rsa*` as a backstop.

**What it cost.** Most of a 1.5-hour window on 2026-09-16: the `od -c` leak and
the hook from 02:05 to about 02:22, untangling the desktop integration from
02:26 to 03:01, and the documentation pass from 03:23 to 03:31, about an hour
in all (the E2B template build, the `e2b` ESM/CJS fix and the lesson-05
close-out sit in the gaps), on top of the 25 minutes of token handling on
2026-09-15. Five files rewritten and two lesson pages patched to mark 1Password
optional. Two partial secrets in a transcript; the OAuth token cannot be
revoked and is still on the list to rotate at the end of the course. One
security control that reported installed while doing nothing. One private key
that existed as a file inside the checkout, protected only by a pattern match.

**The alternative.** Ask "what does the deployed system actually read secrets
from?" before choosing a local secret store; the answer (Vercel) makes 1Password
a convenience for three scripts, to be set up once with a service account and
`op vault list` as the whole verification. Prove a credential works by running
the real command through the wrapper and reporting the exit code, never by
reading bytes. Verify any hook or deny rule with a live canary through the
actual tool path, since 16/16 passing unit tests said nothing about whether the
harness ever called the script. Treat a credential that arrives as a downloaded
file differently from one that arrives as a string to paste: it goes into
Vercel and 1Password and is then deleted, and it never lands inside a checkout.

**The rule.** Never read a secret's value, prefix, length or bytes; never let a
downloaded key land inside the working tree; prove a credential works by exit
code, and prove any guard works by firing a live canary at it before reporting
it installed.

**Evidence.**
- session ef382fd2 part 3 @ 2026-09-16T02:05:13–02:06:46 (the `od -c` leak,
  self-reported).
- session ef382fd2 part 3 @ 2026-09-16T02:11:52–02:14:35 (hook silently failed
  open; the live item fetch stopped only by the dismissed popup).
- session ef382fd2 part 4 @ 02:27:17 (desktop CLI integration gave all five
  vaults).
- session ef382fd2 part 4 @ 02:26:48–03:01:20 (the detour, from Noj's ".env
  files" remark to the `.zshrc` decision) and @ 03:23:00–03:31:06 (the
  documentation pass).
- session ef382fd2 part 4 @ 03:27:05–03:27:29 ("do we need 1password for this
  project?" answered "No").
- TRAPS.md: "The 1Password desktop CLI integration hands an agent your whole
  account".
- TRAPS.md: "A private key inside the repository (lesson 08)" (the `.pem`
  untracked in the checkout for about two minutes before a planned
  `git add -A`; "`.gitignore` ... A backstop, not a control").
- docs/secrets.md: "1Password is a convenience here, not a dependency".

### 3. Explanations that did not land cost a lesson, a working handler and a five-hour return trip

**What happened.** Two separate sessions. On 2026-09-15 the lesson-01 session
built a page and a shared notes widget (about 1400 lines of assets plus a
677-line page), then answered Noj's first widget question in chat for about 70
minutes with invented "step 5 / step 6" jargon and no page update, until Noj
wrote "should i just watch the videos directly? if can't be bother to actually
teach this to me, I can watch the videos" and then "you know what. nevermind."
Everything from the session was deleted, and on the same one-line request
("I didn't create it") so was the untracked, working, secret-clean
`api/slack/events.js` from lesson 04. On 2026-09-16 the lesson-07 session
finished 828 lines of code, Noj went away for 4h38m, and when he came back the
first 30 minutes were spent on "Explain the long prompt", "I have no idea the
purpose", and "I know there is a point... it's going over my head" before the
assistant said its point in one sentence; then a second 59-minute gap before
"go". The same pattern recurs as "I have no idea what you just did", "what does
go ahead mean?" and "use simple human English, and a metaphor".

**What it cost.** The lesson-01 session: about 70 minutes of chat, one page and
three asset files deleted, one working Slack handler deleted with only a
session-scoped scratchpad backup. The lesson-07 session: about 5.5 hours of
elapsed time with reviewed code uncommitted, of which 30 minutes were an
explanation cycle that should have been a go or no-go.

**The alternative.** Put every answer into the lesson page as soon as it is
given, since the page is the deliverable and chat scrollback is not. Never
introduce numbered steps or names that are not in the source without saying
they are scaffolding. Before Noj leaves, write the one-sentence version of what
he needs to decide and what will happen after "go", so the return trip converts
directly. Commit finished untracked work promptly so that a "did I want this?"
objection is a revert, not a destruction.

**The rule.** Lead with the one-sentence conclusion and the decision being asked
for, put the explanation in the page rather than the chat, and commit finished
work before waiting on a human.

**Evidence.**
- session f46cda7d part 1 @ 01:35:19 (Noj's pushback) and @ 01:35:58 (the
  assistant's self-diagnosis: invented step numbers, referenced screenshots
  never discussed).
- session f46cda7d part 1 @ 01:42:50–01:43:07 (page and three asset files
  deleted) and @ 01:48:35–01:48:55 (working `events.js` deleted).
- session e4985974 part 1 @ 05:28:25 / 10:06:54 (4h38m idle) and @ 10:35:31 /
  11:34:46 (59 min idle).
- session e4985974 part 1 @ 10:11:16, 10:20:50, 10:35:14 (three corrections
  before the one-sentence restatement).
- session ef382fd2 part 5 @ 04:45:49 ("I have no idea what you just did") and
  @ 04:46:36 ("what does go ahead mean?").
- session ef382fd2 part 4 @ 02:30:44 ("use simple human English, and a
  metaphor").

### 4. Lesson pages were built for the author, not the reader, and rebuilt three times before a spec existed

**What happened.** The lesson-04 SOP page was written on 2026-09-15 in the voice
of someone who had just lived the lesson ("the random number doesn't matter" as
a section title, "five services" undefined), which drew "are you trying to be
funny?... Did you put any forethought into what you are producing?... do I have
to put you into plan mode?" and a plan-mode restructure. It was then reworked
for colour, nesting and a nav widget across the afternoon, a design spec was
finally written at 20:34, and on 2026-09-16 six consecutive colour and tint
rounds ("add 5% to each", "add another 5%") were needed before the visual
design stuck, followed by a checkbox feature built on the wrong element and
rebuilt. In lesson 05 the backend code was built and credentials were requested
before the lesson page existed, drawing "are you planning on doing the project
entirely by yourself and not bring me along".

**What it cost.** Three full rewrites of one page (git fc35268, 8aa856b,
28639b9) before the spec (980fca6). Two subagent round-trips to recover SVG
markup that was left in an intermediate message. Six uncommitted design
iterations on 2026-09-16 (01:26 to 01:35) plus a full feature rewrite for the
section checkboxes. A verbal nav-depth estimate (20/60/90 rows) that measured
out at 17/25/44 once counted. The lesson-05 page had to be written after the
code, out of order.

**The alternative.** Write `sops/DESIGN-SPEC.md` and `LESSON-PAGE-RULES.md`
before the first page, from a single conversation about Noj's viewing
conditions (brightness, nesting, colour by depth). Run a cold-reader pass (a
subagent told nothing about the lesson) on every page before showing it. Count
before quoting a number. Build the page before asking Noj to do anything
manual, since the page is where he learns what he is doing.

**The rule.** The lesson page comes before the code and before any request for
Noj's hands, is written against a spec that already exists, and is read once by
someone who knows nothing before Noj sees it.

**Evidence.**
- session ef382fd2 part 2 @ 2026-09-15T11:47:17 (the pushback) and @ 11:47:48
  ("I wrote a page in the voice of someone who'd just lived through the
  lesson").
- session ef382fd2 part 2 @ 2026-09-15T12:10:17 (estimate) vs 12:11:06–12:11:44
  (real counts).
- session ef382fd2 part 2 @ 2026-09-15T11:32:20, 11:35:25 (subagents left the
  SVG markup out of the final report, twice).
- session ef382fd2 part 3 @ 2026-09-16T01:26:41–01:35:15 (six colour rounds)
  and @ 01:40:07–01:40:53 (checkbox feature rebuilt).
- session ef382fd2 part 3 @ 2026-09-15T21:15:26 ("not bring me along") and
  @ 21:15:42 ("building ahead of you instead of alongside you").
- git fc35268, 8aa856b, 28639b9, 980fca6 (three rewrites, then the spec).

### 5. Bot requests were sized by trial and error against the sandbox budget

**What happened.** From lesson 09 the bot ran inside a Vercel function with a
hard `maxDuration = 300`. Six of roughly 35 requests in `#joestar-dev` timed
out with nothing pushed. The first two, channel topic as repo and a live typing
indicator, sent a minute apart at 22:35 on 2026-09-16, were separate
single-change requests that died at `runClaude`'s original 240 s default while
the bot was still working; raising the default to 285 s and telling the model
its budget was enough, and Noj's retry "now that the timeout is raised"
succeeded 18 minutes later. The other four were each a single message bundling
a whole lesson, several independent changes, or a research step, against the
255 s `claude` has had since the upload budget was carved out in lesson 11:
Playwright setup with the upload-URL relay and a cap change in one go, Postgres
and Redis with the bot "researching Debian's Postgres packaging instead of
implementing", lessons 13 and 14 together, and four runtime fixes bundled after
the memory-runtime restore. Each split retry succeeded. The "push a `wip:`
commit first" rule was added to the task-lifecycle skill at 08:38 EDT on
2026-09-17, after five of the six timeouts, and the sixth (the four-fix bundle)
timed out anyway nine minutes later, because the request was still too big for
a wip push to save it.

**What it cost.** Six lost sandbox runs of about 4 minutes each plus the retry
latency (18 minutes between the first failure and its retry, spent raising the
default and opening PR #1). PR #20 alone took about 42 minutes from the restore
to merge with 3 timeouts, and the four fixes that one message could not do took
five sequential single-purpose messages. The lesson-05 "known unknown" about
the budget was written down on 2026-09-15 and not acted on until the two
22:35 failures.

**The alternative.** Set the run budget to the ceiling before the first
dogfooding request, since the 300 s cap was known from lesson 05. Then do the
thinking outside the sandbox: paste the design, name the files to read, say
"no research", and ask for one change per message with a push after each
step. RESUME.md records the measured pattern: a request that asks the bot to
research times out at 255 s; one that spells out the design finishes in 60 to
120 s.

**The rule.** The run budget is at its ceiling before dogfooding starts; then
one change per request, design included and research forbidden, a wip push
before anything passes, and any request touching more than two independent
file groups is split before sending, not after it times out.

**Evidence.**
- slack C0C2FES3UGJ @1789612520.210019, @1789612530.483259 (the 22:35 pair:
  single-change requests that died at the 240 s default).
- RESUME.md: "The bottleneck dogfooding found immediately" ("Raising
  `runClaude`'s default from 240s to 285s ... was enough — the retry
  succeeded"); session ef382fd2 part 7 @ 02:40:16–02:41:06 (root-caused to the
  240 s default against the 300 s ceiling) and @ 02:41:20–02:42:44 (raised in
  PR #1).
- slack C0C2FES3UGJ @1789613607.648949 ("Retry of the earlier request, now
  that the timeout is raised").
- slack C0C2FES3UGJ @1789619333.883969, @1789644385.875169,
  @1789645027.046259, @1789649224.910269 (the four bundled or research-first
  timeouts).
- slack C0C2FES3UGJ @1789619697.537369 ("That ran out of time. Let's split it").
- slack C0C2FES3UGJ @1789648702.884379 (wip-first rule added at 08:38 EDT).
- session ef382fd2 part 10 @ 11:31:06 (255 s spent researching) and @ 11:31:45
  (retry "do not research: the design is below, apply it" opened PR #11 about
  90 s later).
- session ef382fd2 part 12 @ 12:54:47–12:55:10 ("the third timeout on this
  file", then one step per request) and @ 13:42:15 (PR #20: about 42 min, 3
  timeouts, 6 reviews).

### 6. Checks and reports that said green without having looked

**What happened.** The same shape at least ten times. In lesson 05 the local
suite was green while every production request returned 500:
`import { Sandbox } from 'e2b'` resolved to the package's CommonJS build, which
`require()`s ESM-only chalk; a modern local Node tolerates that and Vercel's
runtime does not, so the module failed to load before any routing. It was
caught only because a preflight probe asserted that a GET returns 405, not by
any test. `bin/preflight` itself then reported
15/15 after the lesson-07 reinstall while hard-coded to check 2 of 7 scopes.
`bin/smoke` probe 5 asserted HTTP 200 on a handler whose seven code paths,
including the dead-token path, all return 200, and it is still unfixed. A
push-refusal probe piped `git push` into `tail` and reported `tail`'s exit code.
The secret-read hook passed 16/16 unit tests and never fired. A mutation check
on PR #4 silently failed to apply and would have read as a pass but for a stray
`SyntaxWarning`. PR #4's test named "never reads process.env" called the path
where the leak could not happen. PR #7 rewrote the whole upload path and
reported "57/57 pass" without touching a test file. The bot claimed each new
test in PR #10 was mutation-tested; two of three were vacuous. It claimed full
mutation coverage on PR #12; three of six mutations were not caught, one of
them a credential-leak path. PR #20's suite was 91/91 green while `events.js`
never passed `memoryRepo`, so the whole memory feature was dead code. The
general rule ("when a check passes after a change, ask what it would have had
to see to fail") was written down on 2026-09-16 only after the third instance.

**What it cost.** A production outage on every request until the `e2b` import
was fixed, and about an hour of investigation; false confidence across at
least one lesson for preflight; a smoke probe that is wrong exactly when the
bot is dead; six review-fix rounds
on PRs #10 to #17 in one stretch; a feature that would have shipped never
called. Each instance was found by accident or by a deliberately adversarial
reviewer, not by the check itself.

**The alternative.** Assert on an observed outcome (a message under `rootTs`, a
remote ref unchanged, a file's byte count), never a proxy (a status code, a
count, a name, a self-report). Derive check inputs from the source of truth
(the manifest) rather than a list that goes stale. Confirm a mutation landed by
diffing before reading its result. Treat "tests pass" as meaningless until the
diff shows which tests changed. Require the mutation-testing review before any
"ready to merge" signal.

**The rule.** A green check is a claim about a specific scope; before accepting
it, name what it would have had to observe to go red, and if the answer is
"nothing", the check does not count. A local green is not a deployed green: the
deploy runtime loading the module is checked against the deployed endpoint.

**Evidence.**
- session ef382fd2 part 4 @ 03:02:40–03:05:14 (preflight's 405 probe returned
  500; "every prod request 500'd until fixed"; ~1 hour of investigation);
  TRAPS.md: "A dependency that works locally and dies on Vercel (lesson 05)".
- session e4985974 part 1 @ 12:06:15 (preflight 15/15 while checking 2 of 7).
- session e4985974 part 2 @ 12:55:48–12:56:19 (probe 5 cannot distinguish a
  reply from a skip; auth.test failure path also returns 200).
- session ef382fd2 part 7 @ 01:41:00 (`git push` piped to `tail`; "the third
  instance today of the same shape").
- session ef382fd2 part 8 @ 2026-09-17T03:54:52–03:54:59 (decorative test) and
  @ 03:57:49–03:57:54 (mutation that never landed).
- session ef382fd2 part 10 @ 11:34:26 (PR #10: two of three tests vacuous) and
  @ 11:39:33 (PR #12: 3 of 6 mutations not caught).
- session ef382fd2 part 11 @ 12:23, lines 817-856 (PR #20: "the feature is never
  switched on").
- TRAPS.md: "Checking tools that pass green while blind" and "'All tests pass'
  measuring the wrong suite (lesson 11)".

### 7. A stacked PR and a "keep both sides" merge from a shallow clone that deleted a feature

**What happened.** On 2026-09-17 the orchestrator based PR #12 (Codex CLI) on
PR #11's branch for parallelism; when #11 was squash-merged, #12 went
CONFLICTING because the squash gave the same content a new commit identity.
Later the same day, the instruction to PR #20 was "`git merge origin/main`
(never rebase). If anything conflicts, keep both sides." The bot works in a
sparse shallow clone, because every request tells it to; a shallow clone can
make git report unrelated histories, and the bot then resolves whole-file
conflicts by taking one side. Its merge commit `6f1b577` took main's side of
`claude.js` and `claude.test.js`, deleting `setUpMemory`, `pushMemory`,
`MEMORY_BUDGET_MS` and their tests, although main had never touched those
files. Nothing signalled it. It was found when the orchestrator diffed against
the pre-merge commit `81ffa73`.

**What it cost.** One extra bot run (about 2 minutes) plus a merge-not-rebase
detour for PR #12, and Noj asking "would that conflict have happened if i
waited to do the merge?" (answer: no, it was the stacking). For PR #20: a
restore request, a restore review (about 33.8k tokens), and the start of the
42-minute cycle in finding 5. PR #13's merge of main had also produced conflicts
in three files resolved by "keep both sides", which is the same instruction
that later lost the runtime.

**The alternative.** Base every request on `main` and send the next one only
after the previous merge lands; the extra latency is smaller than a conflict
round. Do not have the bot merge main from its shallow clone at all: do the
merge locally from a full clone, or tell the bot to `git fetch --unshallow`
before merging. When a bot merges anyway, end the step with a content-presence
check on the branch's own feature files (`grep -c setUpMemory` was the eventual
fix) and have the reviewer diff those files against the pre-merge tip before
anything else.

**The rule.** One PR at a time on main, never stacked; a merge of main into a
bot branch is done locally or from an unshallowed clone; and after any bot-run
merge the branch's own feature files are diffed against the pre-merge tip
before the step is called done.

**Evidence.**
- session ef382fd2 part10 @ 11:43:02–11:44:42 (PR #12 CONFLICTING after #11's
  squash) and @ 11:44:28–11:44:35 (the assistant's own root cause: the
  stacking, not the timing).
- slack C0C2FES3UGJ @1789648422.637469 ("never rebase... keep both sides").
- slack C0C2FES3UGJ @1789648937.984399 (restore from `81ffa73`, confirm
  `grep -c` prints 9).
- session ef382fd2 part 12 @ 12:41:44–12:42:11 (merge commit took main's side,
  memory runtime gone) and @ 12:47:11–12:48:52 (restore review, byte-identical).
- slack C0C2FES3UGJ @1789645742.618139 (PR #13: "conflicts in 3 files
  (`.env.op`, `template.mjs`, `claude.test.js`), all resolved by keeping both
  sides").
- slack C0C2FES3UGJ @1789646174.821689 ("Sparse shallow clone of
  `joestar-agent/` only", the standing instruction in every request).
- TRAPS.md: "A shallow clone can make a bot-driven 'merge and keep both sides'
  silently delete work" ("A shallow clone can make git report unrelated
  histories, and the bot resolves whole-file conflicts by taking one side";
  prevention: diff after, "or do merges locally").
- TRAPS.md: "Squash-merging a base PR breaks anything stacked on it".

### 8. Course and platform claims shipped on trust

**What happened.** Ray's prompt called Slack's upload step a PUT (it is a POST),
which went into code, tests and comments before a self-review caught it. Ray
says a reinstall always rotates the bot token; the assistant repeated it to Noj
and the lesson page asserted it, until Noj said "the token is the same" and a
direct scope query confirmed no rotation (twice, across lessons 07 and 09). Ray
says the App "becomes the commit author" (the App is the PR author; the commit
author is git config). Ray's "8 MB Vercel limit" was the project's own lesson-07
constant. Ray says relaunch Claude Code after attaching a connector; the tools
appeared mid-session. Branch rulesets were assumed to work on a private repo;
they silently stop on the free plan, found only by pushing after a routine
visibility flip. PR #6's own comment claimed `setEnvs` fixed the runtime env
problem; the SDK's types say build-time only. A RESUME.md claim about why Ray
skips dogfooding in lesson 12 came from a keyword scan, not the transcript.

**What it cost.** Corrections to already-shown docs each time; one lesson page
section rewritten; the smoke and preflight design that rested on the rotation
claim; a sandbox-repo decision reworked (private, public briefly, then public
for the course) after the ruleset finding; a live-sandbox probe cycle to prove
the `setEnvs` bug both ways. The rule "treat Ray's platform claims as a
hypothesis" was added to `LESSON-PAGE-RULES.md` on 2026-09-16 after two live
corrections in one day, with 14 lessons still to go.

**The alternative.** From lesson 04: every platform claim on a lesson page
carries "verified here" or "untested here"; verification is a live read-only
probe (`auth.test`, `gh api`, a push that should be refused, the package's own
`.d.ts`), not the video, not a subagent's summary, not a PR's own comment.

**The rule.** A claim about how a platform behaves is a hypothesis until a
live probe in this environment confirms it, and pages and PRs mark which of
their claims have been probed.

**Evidence.**
- session e4985974 part 1 @ 05:16:40 (PUT versus POST) and @ 12:05:36, 12:06:26
  (token did not rotate; "correcting its own earlier claim (from repeating
  Ray's prompt as fact)").
- session ef382fd2 part 6 @ 2026-09-16T12:55:43–12:55:58 ("BOTH OF TODAY'S
  ERRORS WERE COURSE CLAIMS TAKEN ON TRUST"; rule added).
- session ef382fd2 part 7 @ 01:49:38 (PR author versus commit author) and
  @ 01:53:29–01:54:24 (ruleset silently stops on private).
- RESUME.md: "Lesson 11, as built" ("Ray's '8 MB Vercel limit' is wrong on
  both counts ... The 8 MiB was our own constant from lesson 07"); slack
  C0C2FES3UGJ @1789619333.883969 ("That 8 MiB is our own constant, not a
  Vercel limit").
- session ef382fd2 part 5 @ 03:57:39–03:58:10 (lesson-06 page corrected: the
  tools appeared mid-session, no relaunch).
- session ef382fd2 part 9 @ line 41 (PR #6's comment claimed to prevent the bug
  it had).
- TRAPS.md: "A second confirmation: scope changes do not rotate the bot token";
  "Build-time environment variables are not run-time ones (lesson 11)".
- RESUME.md @ fecf322b (lesson-12 claim sourced from a keyword scan, corrected).

### 9. Two Claude sessions in parallel added relay overhead and nearly laundered an approval

**What happened.** On 2026-09-08 a coordinator session read the lesson-04 page
itself to decide how to split it, assigned the worker half the lesson, was told
by Noj "You shouldn't have to check anything. You should just tell it to do
lesson four otherwise you're going to bloat your context window", and reversed
the assignment one message later; the worker meanwhile started writing
`events.js` and was interrupted twice ("No, I don't want you to make anything
yet. We gotta do this together"). On 2026-09-16 two sessions built lesson 07
together; a peer session arrived calling the same work "lesson 08", and one
session relayed a "hold released" to the other as if it were Noj's approval.
The peer refused ("won't treat a peer relay as approval") and asked Noj
directly. Both sessions later agreed the setup's value (independent
verification caught the rotation myth, the 2-of-7 preflight and a 5-versus-7
contradiction) did not justify the relay cost, and consolidated to one session
before lesson 08's privilege increase.

**What it cost.** One discarded delegation and one extra round-trip on
2026-09-08; an interrupted file write; a multi-message reconciliation over
which lesson was which; a near-miss in which a deploy-adjacent action could
have proceeded on a relayed "go"; and the wind-down itself, with three
findings handed over undocumented.

**The alternative.** One orchestrating session, which spawns read-only probe
subagents when it wants an independent check on a claim, and which never reads
lesson material it is about to delegate whole. Approval is only ever Noj's own
message to the session doing the action.

**The rule.** Run one orchestrator; get independent verification from probe
subagents rather than a peer session; and treat any relayed approval as no
approval.

**Evidence.**
- session 185514e6 part 1 @ 2026-09-08T02:39:00 (coordinator read the page) and
  @ 2026-09-08T02:39:42 (Noj's correction) and @ 02:39:48 (assignment reversed).
- session a04ca969 part 1 @ 02:40:49–02:41:36 (writing started, interrupted,
  second tool call rejected).
- session ef382fd2 part 5 @ 05:04:09–05:05:54 (lesson 07 versus "lesson 08")
  and @ 05:07:50 (peer refuses the relayed approval).
- session ef382fd2 part 6 @ 2026-09-16T12:51:38 ("approval nearly got
  laundered"; recommend ending the two-session setup).
- session e4985974 part 2 @ 12:52:41 ("the failure mode only existed because
  there were two of us") and @ 12:53:35 (three items handed over undocumented).

### 10. Role boundaries were learned by correction instead of set at the start

**What happened.** Across the project Noj had to correct who does what at least
six times: the coordinator reading material instead of delegating (finding 9);
"We gotta do this together" when a session started coding; "are you planning on
doing the project entirely by yourself and not bring me along" when lesson-05
code preceded the page; "what are you talking about. do it correctly" when the
assistant asked permission again for a diagnostic it had already been told to
run; "Why does it need to be in my personal account" after repeated
over-reporting of a non-problem; and on 2026-09-17, "and have joestar do as
much work as it can and should. confirm you understand this" followed an hour
later by "you seem to be doing most of the work, not subagents", after which
the orchestrator tallied 15 subagents against its own hand-run test reruns,
boot probes and screenshots and committed to delegating those too. A memory
file capturing "coach, don't build" was written from a misread of "I need to
go through this process 3 or 4 times" and rejected; Noj meant the opposite,
build fast now and redo later.

**What it cost.** Six corrections, each with a discarded action or a rewrite; a
persistent memory file written wrong and rewritten; an unknown amount of
orchestrator context spent on one-to-three-minute checks that a subagent could
have run. The final split that worked (Joestar writes every product PR, review
subagents verify with mutation tests, page subagents write lesson pages, the
orchestrator only briefs and reads results, Noj merges and runs template
builds) was reached on 2026-09-17, on the last day.

**The alternative.** Agree the role split with Noj before lesson 04 and write it
where a fresh session reads it: what Noj does by hand, what the orchestrator
never does by hand, what the bot must do itself, what a subagent is for. Ask
one clarifying question before writing any persistent instruction about how
to work.

**The rule.** The role split is written down before the first lesson and
re-read after every compaction; the orchestrator briefs and verifies but does
not build, research or run repeatable checks by hand.

**Evidence.**
- session 185514e6 part 1 @ 2026-09-08T02:39:42 and session a04ca969 part 1
  @ 02:40:54.
- session ef382fd2 part 3 @ 2026-09-15T21:15:26 and part 1 @ 05:18:58.
- session ef382fd2 part 2 @ 2026-09-15T10:44:48–10:44:59 (over-reporting
  retracted).
- session ef382fd2 part 7 @ 02:01:20–02:02:39 (memory file written from a
  misread, rejected, rewritten).
- session ef382fd2 part10 @ 11:25:16 and part 11 @ 12:24, lines 912-926 ("you
  seem to be doing most of the work, not subagents"; the tally).
- session ef382fd2 part 12 @ 13:31:46 (the "Delegate checks to subagents"
  memory note, written on the last day).

## What to keep

1. **Verify against live state, not against a report.** The peer session
   queried Slack for granted scopes instead of trusting preflight or Ray, which
   is how the rotation myth and the 2-of-7 blindness were found; the GitHub
   chain was verified with `gh pr view` and `gh api` rather than the bot's
   Slack reply, and a hook was proven by checking the remote ref server-side.
   (session e4985974 part 1 @ 12:06:26; session ef382fd2 part 7 @ 01:46:31–01:49:38
   and @ 01:49:41–01:52:42.)
2. **Adversarial review subagents with mutation testing.** They caught a
   fail-open token mint (PR #18), a feature never wired up (PR #20), a
   decorative security test (PR #4), a credential prefix leaking through
   `err.message` (PR #12), and a cross-channel privacy gap at the merge gate.
   Every one of these had a green suite. (session ef382fd2 part 11 @ 12:05,
   lines 165-198 and @ 12:23, lines 817-856; part 8 @ 03:54:52–03:54:59; part 10
   @ 11:39:33; part 12 @ 13:17:05.)
3. **Live-test a platform before writing its verification step.** Exa's MCP
   endpoint returned a full tool list for a bogus key and for the literal
   `${EXA_API_KEY}`, so "connected means the key works" was disproved before it
   was shipped as a lesson step, and a keyless server (DeepWiki) was kept as a
   permanent debugging instrument. (session ef382fd2 part 8 @ 2026-09-17T03:46:17
   and @ 03:47:51–03:48:19; TRAPS.md: "A connected MCP server proves nothing
   about its credential (lesson 10)".)
4. **One step per request with a wip push, once adopted, ended the timeouts.**
   After the switch every remaining PR #20 step landed green, and a run that
   timed out mid-task still left a `wip:` commit to resume from. (session
   ef382fd2 part 12 @ 12:55:10; part 11 @ 12:14, lines 610-646.)
5. **Measure the docs the way an agent uses them.** Three read-only probe
   subagents (about 125k tokens) showed a stale README sending a fresh agent
   through nine files; fixing it moved the target from ninth to fourth with no
   source files read first, and the re-probe surfaced a real RESUME.md
   contradiction about deploys. (session ef382fd2 part 5 @ 04:06:00–04:06:54,
   @ 04:08:28–04:10:04 and @ 04:10:21–04:10:25.)

## Method

Read in full: the 21 extract files under `retro/extracts/` (session timelines
185514e6 part 1, a04ca969 part 1, dc4b82c3 part 1 which contains only a
`/clear`, e4985974 parts 1 and 2, ef382fd2 parts 1 to 12, f46cda7d part 1; the
git and PR history extract; the `#joestar-dev` channel extract; the docs history
extract covering TRAPS.md, `git log -p --follow RESUME.md`, docs/lessons.md,
docs/verifying.md, docs/secrets.md and CLAUDE.md), plus the raw `#joestar-dev`
message export beside them, and TRAPS.md, RESUME.md, CLAUDE.md and the three
docs files on `main` at commit 7e0425d.

Not read: the session JSONL transcripts themselves (only the extracts made from
them, so timestamps and quotations are as the extractors recorded them); Vercel
function logs and deployment history (no CLI or token is kept locally, and the
extracts note the `[memory]` log lines were never read); E2B build logs beyond
what the transcripts quote; GitHub PR review data (every PR's `reviews` array
is empty, so review happened in Slack threads and chat, not on GitHub); the
course videos and transcripts; `#joestar-test` and `#bot-smoke` channel
history; and the 1Password, Slack and Vercel dashboards. Minutes and counts
are taken from the extracts where they state them; where an extract gives a
range or an approximation, this document repeats it as such.
