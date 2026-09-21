# The build package: standing up a Slack agent for yourself or a client

Written 2026-09-17, after Joestar was built across six Claude Code sessions
from 2026-09-08 to 2026-09-17. `docs/retrospective.md` says what went wrong
and what it cost; `docs/orchestrator-playbook.md` says how to run the course
again. This document answers a different question: **if you have to stand up
several of these agents, for yourself and for clients, what do you decide
before you start, what do you build once and reuse, where does a human have to
act, and what does the client need to know?**
Section 9 adds the course's own answer to what the agent is *for* once it
exists: ownership, not tasks.

The car metaphor from the conversation that prompted this: Noj is the mechanic
who builds and maintains the bot. A client is the driver. The driver needs to
know how to start it, where it can take them, what the warning lights mean,
and when to call the mechanic. The driver never needs to know how the engine
was assembled.

## 1. What a second build should look like

The first build took about ten working days of sessions. Most of that was not
building; it was learning. The retrospective ranks the costs, and only three
of the ten findings are about code. Applied to a second build:

| Cost in the first build | Second build |
|---|---|
| One-time account state discovered by failure (Vercel login connection, unsaved Slack page, Keychain truncation): an evening | A read-only preflight run **before** any code, from a checklist the client fills in. Minutes. |
| The credential detour (desktop CLI integration, leaked token bytes, a key inside the checkout): about 1.5 hours and a token to rotate | Secrets go straight to Vercel. 1Password is a convenience for three scripts. A credential proves itself by exit code, never by being read. |
| Explanations that did not land, pages rebuilt three times: two sessions | No lesson pages at all. The course is done; the client gets a driver's guide, not a curriculum. |
| Request sizing by trial and error against the 300 s ceiling: six lost runs | The bot ships with the ceiling set, the wip-first skill installed, and the request rules in its briefing on day one. |
| Checks that reported green while blind, at least ten times | The review gate and the "what would it have had to see to go red" rule are part of the package, not learned. |
| Stacked PR and a shallow-clone merge that deleted a feature | One PR at a time on main, bot never merges main. Already in the playbook. |
| Roles learned by correction | The role split is in the intake form. The client agrees to it before anything is provisioned. |

The realistic target for a second instance built from this package is **one
afternoon of Noj's time plus whatever the client's account waits cost**
(workspace admin approval, a paid Vercel plan, a card on E2B). The code is
unchanged. Everything that took time the first round was either a decision or
a click, and both are now listed.

## 2. Decision sheet: fill in before provisioning anything

Every item below either changes what gets built or who owns something
afterwards. Decide all of them in one sitting with the client. Defaults are
what Joestar does today.

### Identity

| Decision | Default | Why it matters |
|---|---|---|
| Bot name (Slack display name, git author, persona line) | `joestar` | Appears in six places in the code (see section 4). Pick once. |
| Persona sentence | "You are Joestar, Noj's Slack agent." | The first line of the sandbox CLAUDE.md. Sets tone for every reply. |
| Which Slack workspace, and who administers it | SlackAgentOS, Noj | App creation and installation need workspace admin. If the client's admin is not the client, add a day. |

### Who can talk to it

| Decision | Default | Why it matters |
|---|---|---|
| Channels the bot is invited to | `#joestar-dev`, `#joestar-test`, `#bot-smoke` | Everyone in a channel where the bot is present gets every tool it has. There is no per-user scoping. |
| DMs | Off (no `im:history` scope) | Keep off unless the client accepts that DMs are untraceable by other members. |
| Private channels | Allowed (`groups:history`) | Same rule: anyone in the channel gets everything. |

### What it can touch

This is the section that decides the security posture. The CLAUDE.md rule
holds for every instance: **an integration is added only if handing its full
capability to every workspace member who can message the bot is acceptable.**

| Decision | Default | Options |
|---|---|---|
| GitHub access | On, via a GitHub App installed on exactly the work repos | Off (bot cannot push or open PRs). On: list the repos. The App is never installed on a repo holding secrets or customer data. |
| Which repos, mapped how | Channel topic names `owner/repo` | One channel per repo is the simplest thing a driver understands. |
| Private repo with write access | No, except the memory repo | Recorded exception per instance, with the reason written down. |
| MCP servers | DeepWiki (keyless), Exa (keyed, optional) | Any read-only public-data server qualifies. A production database, a payment dashboard, a CRM with customer records does not, read-only or not. |
| Long-term memory | On, private memory repo, per-channel write, cross-channel read | Off is one unset variable. If on, the client must understand every channel can read every other channel's notes. |
| Voice-note transcription | Optional (ElevenLabs key) | Audio goes to a third party. Ask. |
| Codex second opinion | Optional (OpenAI auth) | Code goes to a second vendor. Ask. |
| Browser (Playwright) | Baked in | Cannot log in anywhere without credentials, which the bot is never given. Screenshots and public pages only. |

### Who owns what

| Decision | Default | Why it matters |
|---|---|---|
| Whose Vercel account | Noj's team account | Whoever owns the project sees the logs and pays. Logs are only in the Vercel dashboard. |
| Whose E2B account | Noj's | Sandbox minutes are billed here. Per-message cost is a few cents; the client should see the bill or agree to a cap. |
| Whose Anthropic subscription | Noj's, via `claude setup-token` | The token cannot be revoked, only replaced, and it is the client's usage against that subscription. A client with their own subscription should mint their own. |
| Whose GitHub App | Noj's, installed on the client's org | Or the client creates the App in their org and hands over the ID, installation ID and key. Cleaner exit if the engagement ends. |
| Where secrets live | Vercel (runtime) plus a 1Password vault (local tooling) | Vercel is the only thing the bot reads. 1Password is optional and is per instance: one vault or item per client, never shared. |
| Who merges | Noj, with `--admin` | Or the client's engineer. Whoever merges is the human gate on everything the bot writes. |
| Who rebuilds the sandbox image | Noj | Needs the E2B key. A client cannot do this without it. |

### Budget and limits

| Decision | Default | Notes |
|---|---|---|
| Run ceiling | 300 s Vercel function, 285 s sandbox, about 230 s for Claude | Fixed by the Vercel plan. Every task must finish in one run; the driver's guide explains why. |
| Attachment caps | 8 MiB per file in, 64 MiB per file out, 5 files each way | Project's own constants (`MAX_INPUT_BYTES`, `MAX_OUTPUT_BYTES`). |
| Memory budget | 25 s per run | Only when memory is on. |
| Monthly cost ceiling | None set | Set one and check the three bills (Vercel, E2B, Anthropic) monthly. |

### Support model

| Decision | Default | Notes |
|---|---|---|
| Who reads the warning lights | Noj | "I can't reach Claude", a run that times out, a PR the bot could not open. The driver's guide names each and who to call. |
| Rotation schedule | None | The OAuth token, bot token and E2B key should be replaced on a schedule you agree with the client. |
| Exit plan | Not written | What happens to the memory repo, the GitHub App installation and the Vercel project when the engagement ends. Decide now. |

### What it owns

The course's last three lessons (on-call agents, task versus ownership
delegation, feedback channels) say that a bot which only acts when mentioned
is task delegation, and the value comes from ownership: a standing
responsibility with an input stream and no end state. Section 9 explains the
model. These rows capture what the client has to decide for it. None of this
is built in Joestar yet; the rows are here so the conversation happens before
the build, not after.

| Decision | Default | Why it matters |
|---|---|---|
| Alert feeds the client already has | None listed | CI failures, deploy failures, uptime, security plugins, error trackers, form submissions, new leads. Each one that can post to Slack is an input stream an agent can own. List them all, even the ones nobody reads. |
| First on-call channel | None | One alert feed, one channel, one fixed prompt run on every message. This is the first ownership to set up because it is the most verifiable. |
| Ownership briefs | None | For each: territory, input stream, standing mandate, boundary. One channel per brief. Write them with the client in their words. |
| Boundary line for autonomous fixes | Propose only | What the bot may change without a yes. Start at "open a PR, never merge" for code and "draft, never send" for anything outward-facing, and widen per brief as trust builds. |
| When to wake a human | Tag in thread, always | The on-call rulebook: page now, or investigate and leave a report for the morning. Real paging is an integration to decide per client. |
| Feedback channel | None | A channel where the bot posts what it needs to do its job better. The client decides who reads it and who says yes. |
| Schedules | None | For briefs with no natural alert feed (a weekly dependency check, a monthly renewals pass). The bot may adjust its own interval within a range you set. |

## 3. Build order, with the human steps marked

Everything marked **HUMAN** needs a person's account, dashboard or authority.
Everything else a Claude Code session does from the package. The order is
chosen so that no human step is blocked on a later one, and so the bot can be
proven alive at the earliest point.

### Phase 0: before any account is touched

1. Fill in the decision sheet (section 2) with the client.
2. Clone the template repo (section 4) into a new repo named for the client.
3. Run the name substitution and check `git grep -i joestar` returns nothing.
4. Write the client's `README.md` Access table with blanks for every credential.

### Phase 1: accounts and credentials

Batch all of these into one message to the human. Each is a click or a paste
that Claude cannot do.

5. **HUMAN** Slack: create the app from the manifest, with the production URL
   left as a placeholder. Install to the workspace. Copy the signing secret
   and bot token into Vercel and, if used, 1Password.
6. **HUMAN** Vercel: create the project with Root Directory set to the app
   folder, confirm the GitHub login connection exists, set the Production
   variables. Create the deploy token and put the three deploy values into the
   repo's Actions secrets.
7. **HUMAN** E2B: create the account, create the key, put it in Vercel.
8. **HUMAN** Anthropic: run `claude setup-token` under the subscription that
   will pay, put the token in Vercel. Note that it cannot be revoked.
9. **HUMAN** GitHub App: create it in the owning org, install it on the work
   repos only, base64 the key, put ID, installation ID and key in Vercel.
   Delete the downloaded key file; it must never sit inside a checkout.
10. **HUMAN** Optional: Exa, ElevenLabs, Codex auth, memory repo. Each is one
    variable and can be added later without a redeploy of anything else.

### Phase 2: first deploy and the smoke test

11. Push the repo. CI deploys. A GET on the events URL must return 405; a 500
    means the module did not load in Vercel's runtime, which local tests
    cannot see.
12. **HUMAN** Slack: paste the real events URL, wait for Verified, click Save
    Changes. Both. The first build lost 20 minutes to the second click.
13. Run `bin/preflight`: it reads required scopes from the manifest and checks
    every dashboard setting above.
14. **HUMAN** Invite the bot to its channels and set each channel's topic to
    `owner/repo`.
15. Post one mention with a question only the thread can answer. Then a thread
    reply without a mention. This is the "engine turns over" moment.

### Phase 3: sandbox image and capabilities

16. **HUMAN** Build the E2B template from a checkout of `main`, with the
    instance's template name set. The first build was a no-op because the
    shell was on the wrong branch; say the branch in the instruction.
17. Boot probe: one message that asks the bot to report Node, Postgres and
    Playwright versions. Compare to the pinned versions file.
18. GitHub proof: ask the bot for a one-line PR on the work repo. Confirm on
    GitHub that the author is the App and the branch exists. Confirm a
    force-push is refused.
19. Memory proof, if on: tell the bot something in one channel, ask for it
    back in a new thread, then check the commit landed in the memory repo.

### Phase 4: hand over

20. Write the client's driver's guide (section 5) with the real channel names
    and the real bot name.
21. Walk the client through three tasks live: a question, a research task, a
    PR. Let them type.
22. Record the exit plan and rotation schedule in the client's README.

## 4. What to turn into the template

The code needs no feature changes to be reusable. It needs the instance-specific
values pulled to one place. The inventory of every knob is below; the work is
about an hour.

### The one seam that already exists

`config.env` at the repo root holds `AGENT_NAME`, `VERCEL_PROJECT` and
`SLACK_WORKSPACE`, and nothing reads it. Make it the source of truth: a small
`bin/rename` script reads it and rewrites the six hard-coded name sites, the
manifest and the scripts' defaults. Then a new instance is "edit config.env,
run rename, grep for the old name."

### Hard-coded values to lift into config

| Where | What | Becomes |
|---|---|---|
| `api/_lib/sandbox-files.js` | The persona line "You are Joestar, Noj's Slack agent." | `AGENT_NAME` and `OWNER_NAME` |
| `api/_lib/thread.js`, `git-guard.js`, `claude.js` | Speaker label and git author `joestar` | `AGENT_NAME` |
| `api/_lib/mcp.js`, `git-guard.js` | Sandbox paths under `/tmp/.joestar/` | Cosmetic; rename or leave |
| `api/_lib/claude.js`, `e2b/build.mjs` | Template default `joestar-claude` in two places | One shared constant, read from `E2B_TEMPLATE`, with no default. A missing value should fail loudly rather than share an image between two clients. |
| `slack-app-manifest.yml` | Name, display name, request URL | Rendered from config |
| `bin/preflight`, `bin/smoke.mjs` | Production URL, vault, item, app dir | Read from config |
| `bin/with-secrets` | Keychain service name and vault grant | Per instance: `op-<client>` |
| `.env.op` | `op://` references and the cleartext App and installation IDs | Per instance file, generated |
| `.vercel/project.json` | Local only (already gitignored), holds Joestar's project and org IDs | Never copy it into a second instance's checkout. An instance that keeps it deploys into the wrong project. |
| `.project.yaml` | Says vault `Projects`, scripts say `SlackAgentOS` | Fix the inconsistency while templating. |

### Package contents

A client build kit is a repo plus four documents:

1. **The template repo**: the code as it is, with the rename seam above,
   `.vercel/` already ignored, and the three toolkit skills (task-lifecycle,
   voice-notes, codex).
2. **The intake form**: section 2 of this document as a fillable checklist.
3. **The provisioning runbook**: section 3, with each HUMAN step expanded to
   the exact control name and the exact place the value goes. The first build's
   TRAPS.md is the source; every entry there is a step that was missed once.
4. **The driver's guide**: section 5, client-facing.
5. **The mechanic's runbook**: section 6, for Noj.

## 5. The driver's guide (what the client needs to know)

Short, one page, no engine parts. The version for a client is written with
their bot's name and channels substituted.

**What it is.** A colleague in Slack. Mention it in a channel it is in, and
it reads the whole thread, does the work in a fresh cloud machine, and replies
in the thread. Reply in the thread without a mention to continue.

**What it can do.**
- Answer questions and research from public sources, with links.
- Read files and images posted in the thread; transcribe voice notes.
- Write, run and test code in a disposable machine, and upload results
  (files, screenshots, PDFs) back into the thread.
- Open a pull request on the repo named in the channel topic. It never merges.
- Remember what it was told in a channel and use it in later threads.

**What it cannot do.**
- Anything longer than about four minutes in one go. Ask for one step at a
  time and it finishes; ask for a whole project and it runs out of time. When
  it runs out, its reply says so and its partial work is on a branch.
- Log in to anything as you. It has no passwords and cannot be given any in
  Slack. Never paste a credential to it.
- Send email, post to other channels, or act outside the thread.
- Merge its own PRs, or push to main. A person always does that.
- Keep secrets between channels. Every channel it is in can read what any
  other channel taught it.

**How to ask well.**
- One request, one outcome. "Add a test for X in file Y" beats "improve the
  tests."
- Say what done looks like: a PR, a number, a file in the thread.
- If it needs to read something, post it or link it. It cannot see your
  screen or your other channels.
- If a task is big, say "step 1 of 3 is..." and send the next step after the
  first reply.

**Warning lights.**

| What you see | What it means | Who fixes it |
|---|---|---|
| "I can't reach Claude" | A credential is missing or expired | Mechanic |
| No reply at all, not even the thinking placeholder | Slack is not delivering events or the deploy is down | Mechanic |
| "That ran out of time" | The request was too big for one run | Driver: split the request and send the first half |
| A PR it says it opened is not on GitHub | GitHub access is broken | Mechanic |
| It answers about the wrong repo | Channel topic is wrong or missing | Driver: set the topic to `owner/repo` |

**What it costs.** Every message you send it runs a cloud machine for a few
minutes. Roughly cents per message. Treat it like a colleague's time, not a
search box.

## 6. The mechanic's runbook (what Noj maintains)

Recurring work per instance, none of it more than a few minutes.

- **Rotation.** The Claude OAuth token cannot be revoked, so rotation means
  minting a new one and replacing it in Vercel. Same for the bot token and
  the E2B key. Put a date on each in the client README.
- **Reinstall after scope changes.** Adding a scope to the manifest does
  nothing until the app is reinstalled, and a reinstall does not rotate the
  bot token (verified twice; Ray's course says otherwise).
- **Image rebuild.** Any change under `e2b/` needs a rebuild from a checkout
  of `main` with the instance's template name. Boot-probe after.
- **Deploy health.** After every merge, GET the events URL and require 405.
  Then one live mention.
- **Logs.** Only in the Vercel dashboard. Ask the client to read a line if
  the instance is theirs.
- **Bills.** Three: Vercel, E2B, Anthropic. Monthly.
- **Memory hygiene.** The memory repo is the bot's notebook. Read it
  occasionally. If a channel taught it something wrong, fix the file and
  push; it reads main on every run.
- **Adding a capability.** Ask the CLAUDE.md question first: would giving this
  to every member of every channel the bot is in be acceptable? If yes, it is
  one env var and possibly one image rebuild. If no, the answer is no until
  per-channel scoping exists, which this design does not have.
- **When the bot writes code for its own repo.** Use the playbook: one change
  per request, design in the message, wip push first, review subagent with
  mutation tests before "mergeable", human merges, never stacked, never let
  the bot merge main from its shallow clone.

## 7. Where a human is always in the loop

Collected from sections 3 and 6, this is the whole list. Nothing else needs a
person.

| Step | Why a human | Once or recurring |
|---|---|---|
| Creating any credential and pasting it into Vercel or 1Password | Account ownership; Claude is denied secret-store writes | Once, then on rotation |
| Slack app creation, install, Save Changes | Workspace admin | Once, then on scope changes |
| Vercel project, login connection, Root Directory, Actions secrets | Account ownership | Once |
| GitHub App creation and installation | Org ownership | Once per repo added |
| E2B template build | Needs the E2B key, which never enters a sandbox | Every image change |
| Merging a PR | The human gate on everything the bot writes | Every PR |
| Deciding an exception (private repo write, a new MCP server, a new channel) | Trust boundary | Each time |
| Deleting the bot's uploaded files | Deletion is never automatic | On request |
| Reading Vercel logs | No CLI or token kept locally | On incident |

## 8. What would make the next build faster still

Not done, and not needed for a second instance, but each would remove a
human step or a class of mistake.

- **Preflight as the intake form.** `bin/preflight` already checks most of the
  decision sheet. Extending it to print a filled-in section 2 from live state
  would make the client conversation a diff, not a form.
- **A per-channel allowlist of tools.** The design today gives every channel
  every tool. A `channels/<id>.json` that names which MCP servers and which
  repos a channel gets would let one instance serve a client's engineering
  and marketing channels with different reach. This is the single change that
  would widen the set of acceptable integrations.
- **Paused sandboxes.** Lifting the "one run, one turn" limit means a
  thread-to-sandbox map, locking, and machines that outlive the request. It
  is the biggest architectural change on the list and the only one that
  changes what the driver can ask for.
- **Bells.** Triggers other than a mention: a channel listener, a schedule,
  a feedback relay. Each is a new entry point into the same run function.
  Section 9 says what they are for and in what order.

## 9. The operating model: from tasks to ownership

The three closing lessons of the course (19 on-call agents, 20 task versus
ownership delegation, 21 feedback channels; transcripts under
`course/transcripts/`) describe how the agent is used once it exists. This
section is the summary, and the gap between that model and Joestar as built.
Nothing here is implemented; the build is deliberately deferred until the
uses are clear.

### Task delegation is the floor

Everything Joestar did in this project was task delegation: a person notices a
problem, mentions the bot, the bot does the task, the thread goes quiet. The
person is the trigger for every piece of work, and when they are away the bot
does nothing. Ray's phrase for this is "a glorified Claude Code inside Slack".
It is where every client starts and it is fine for the first two weeks.

### Ownership delegation is the goal

The bot is given a standing responsibility with no end state. Every ownership
brief has four parts (Ray's own test-coverage brief left the boundary out and
ran; the other three are not optional):

1. **Territory.** What it owns: a module, a site, a dependency, a metric, a
   customer segment.
2. **Input stream.** What keeps arriving: an alert channel, a log, a schedule,
   an inbox. Without a stream there is nothing to own.
3. **Standing mandate.** What it does every time, without being asked:
   investigate, reproduce, open a fix PR, post a summary, draft the email.
4. **Boundary.** Where autonomy stops: propose first for billing, never
   merge, never send.

Ray's examples: own the P95 latency and fix regressions; own the Stripe
integration and update it on breaking-change announcements; own test
coverage and add tests when it drops below 80 percent; own churn signals and
draft the outreach; own trial users and make sure they reach the product's
magic moment. His selection rule: delegate ownership where the result is
**easily verifiable** by the agent itself, with tests, logs or a browser.
Put ownership in public channels so teammates can see and adjust it, and
shrink the mandate if the agent overreaches.

The brief ends with a question: "What do you need from me to take ownership
of this properly? I will give you credentials or MCP servers if needed."

### On-call is the simplest input stream

Most alert services post to Slack. A bot that runs a fixed prompt on every
message in a chosen channel, without a mention, turns any alert feed into an
inbox. Anthropic's internal version, which the course summarises:

- **Threshold tuning.** The bot reads alert history and proposes better
  thresholds instead of a guessed 1 percent, and adjusts them over time.
- **An on-call rulebook** (`on-call.md`): when to page a human now, when to
  investigate and leave a report for the morning.
- **Incident channels.** On a real incident, create a channel, post the
  report, find the responsible people from git, invite them, page one.
- **Parallel investigation.** Several subagents read different logs and
  metrics at once.

### Feedback channels are how the tool set grows

A channel, `#agents-feedback`, where the bot posts whenever it lacked a tool,
connection or permission to finish a job well, with the reason. The owner
answers yes or no in the thread; on yes, the bot is told to add the ability
to itself. Ray's bot asked for Google Tag Manager access and a way to
download a Slack file by ID. This replaces guessing the integration list up
front: the list comes from the bot's own blocked attempts, one at a time,
each passed through the CLAUDE.md question before it is granted.

### Multiple agents means multiple channels

Ray runs one bot in many channels, one territory per channel. Joestar is
already shaped for that: memory is per channel, the repo comes from the
channel topic, and the channel is where teammates see the mandate. A new
"agent" is a new channel with a pinned four-part brief. A second bot is only
needed where trust differs, for example a client whose channel must never be
able to read another client's memory.

### The gap in Joestar as built

| Ability the model needs | Joestar today |
|---|---|
| Reply in a thread without a mention | Built (lesson 07) |
| Run a fixed prompt on every new message in a listed channel | Missing. The handler receives channel messages and acts only on mentions and replies in its own threads. One PR. |
| Post to a feedback channel | Missing. No Slack token in the sandbox, so the bot writes a `feedback.md` in its output and the Vercel function relays it. One PR. |
| Run on a schedule | Missing. A Vercel cron posting a standing prompt into a channel. One PR. |
| Create a channel and invite people | Missing. Two Slack scopes and a reinstall; passes the CLAUDE.md test. |
| Page a human | Tag in thread is enough to start. Real paging is per client. |
| Read its data sources | Per feed. GitHub Actions, Vercel and most site plugins post to Slack natively, so the channel is the source. |
| Write its own triage skill | The skills mechanism exists; the skill is a PR. |

Build order when the time comes: the channel listener first, because it
makes every other brief possible; the on-call rulebook as a skill plus the two
scopes; the feedback relay, because it tells you what to build next; the
scheduler last.

### Briefs worth writing, extrapolated to this practice

Verifiable ones first.

- **A client's WordPress site.** Territory: the site. Stream: daily schedule
  plus the site's security and uptime alerts. Mandate: uptime, broken links,
  plugin security updates, SEO meta audit, report in channel. Boundary: no
  plugin update or content change without a yes. Needs the site's read-only
  MCP tools in a channel that only that client's people are in.
- **This repo's own CI.** Stream: GitHub Actions failures posted to a
  channel. Mandate: investigate, reproduce, open a fix PR. Boundary: nothing
  touching credentials or the GitHub token path without sign-off. The
  cheapest one to set up and the Anthropic pattern exactly.
- **Test coverage** on any repo the GitHub App is installed on.
- **Inbound leads.** Stream: a channel where a form or CRM posts new leads.
  Mandate: research the company and person, post a brief and a suggested
  first email. Boundary: never send. Needs Exa, already present.
- **Renewals and costs** across client sites. Stream: monthly schedule.
  Mandate: list what is due in 30 days, draft each client note. Drafts only.
- **One dependency.** Stream: its release feed, weekly. Mandate: PR the
  upgrade when a security release lands.
