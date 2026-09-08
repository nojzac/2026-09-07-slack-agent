# Plain-English summary

Added 2026-09-06. An Opus subagent read the full report below and wrote this in everyday language. The report itself, with locators and the claims ledger, starts at "01 — Baseline".

# What Ray says he runs

## - **Kickoff**
  - He posts a top-level message in a Slack channel and @-mentions his bot, Percy.
  - Each channel maps to one repo; the repo URL lives in the channel topic.
  - A new top-level message starts a fresh Claude session; replies in that thread continue the same one.
## - **The harness**
  - A Node backend on Vercel receives the Slack event, deployed straight from a private GitHub repo.
  - It holds the secrets: a Claude Code OAuth token, an e2b key, Slack tokens, and a GitHub App key.
  - It boots a sandbox, mints a short-lived GitHub token, runs Claude, relays output, then kills the sandbox.
  - He says it rotates between several Claude accounts when one hits its weekly limit.
  - Percy can edit and redeploy its own harness from a dedicated Slack channel.
## - **In the sandbox**
  - One fresh e2b container per top-level message, running `claude --dangerously-skip-permissions`.
  - Preloaded with Node, Claude Code, Playwright plus Chromium, Postgres, Redis, the Codex CLI, his skills folder, an AGENTS.md, and MCP servers.
  - Guardrails are meant to block force-pushes and destructive git actions.
## - **What comes out**
  - Branches, commits, and PRs on GitHub.
  - Back in Slack: emoji reactions (eyes on receipt, check or X on finish), a status message updated every five seconds, plus HTML reports, screen recordings, GIFs, and screenshots.
  - There's an 8 MB file cap because output passes through the Vercel function's memory.
## - **Memory**
  - A private GitHub repo the sandbox syncs its memory folder to after each turn.
  - Layout is a shared index file plus one folder per Slack channel ID.
  - Only demonstrated on the teaching clone, not on his real bot.
## - **Scheduled routines**
  - Created by just telling Percy a schedule in plain English; each run ends in a PR plus a channel reply.
  - Named ones: daily dead-code cleanup at 8am, docs-in-sync, dedupe abstractions, add newly released LLM models, a Sentry error fixer, and competitor and usage reports.
  - One routine checks GitHub first and skips if its own PR is already open.
## - **Feedback channel**
  - Percy's system prompt tells it to post in a feedback channel when it wants a tool, credential, or connection.
  - Ray replies to grant it, often by telling Percy to add the ability to its own harness. An X reaction means never ask again.

# Where a human is still needed

- **Starting work** — 
	- every task begins with a human message. He says it plainly: go on holiday and the agent does nothing. Routines are the only self-starting path.
- **Merging** — 
	- he reviews and merges most PRs himself. A few loops auto-merge.
	  - If he doesn't respond, PRs just sit. 
	  - The leaky-abstraction routine actively skips future runs while one is open, so silence stalls it.
- **Answering clarifying questions** — 
	- he tells agents to ask before starting, and threads park indefinitely waiting. 
	- No timeout or default is mentioned.
- **Sign-off on risky areas** — 
	- billing and refunds require explicit approval. 
	- No stated fallback if he never replies.
- **Usage limits** — 
	- when both accounts ran dry mid-task, the run stopped until he typed "continue".
- **Secrets and permissions** — 
	- new Slack scopes need him to edit the manifest and reinstall; 
	- new API keys are pasted by hand.
- **Testing gaps** — 
	- the agent can't send files or voice messages to itself, so he verifies those manually.
- **Local loops** — 
	- die when his laptop sleeps or the session closes; 
	- one worker runs in an always-open session on a home machine.
- **Writing the spec** — 
	- he calls this the main place the human enters the loop.

# What broke and what he changed

- First sandbox run errored on a stale template; the agent diagnosed it itself.
- Hit his weekly Claude limit, so he had Percy build account rotation.
- The AGENTS.md/CLAUDE.md file wasn't loading in the sandbox until he wrote it to the user root.
- New MCP servers only took effect in a brand-new sandbox, so mid-thread additions did nothing.
- The 8 MB Vercel limit blocked large uploads; the agent proposed a single-use upload URL and opened a PR.
- Claude Code wrongly claimed a skill name collision, so he skipped a skill for no reason; he later confirmed the conflict didn't exist.
- The class-built lifecycle skill never watched PR review comments, so he bolted on a comment-monitoring loop.
- Parallelizing a PR backlog created hidden dependencies between PRs; he went back to one at a time.
- A thumbnail/title skill silently went stale after a couple of months, so he added a loop feeding it fresh data.

# What he claims but never shows

- **Scale.** 
	- "Close to 100 Slack agents" and "80–90% of my work" — no channel list, run log, or counts.
- **How routines actually fire.** 
	- He says Percy sets up its own routines, but no scheduler, storage, or triggered run is ever shown. This is the load-bearing gap for calling anything unattended.
- **Account rotation.** 
	- Stated as built; never observed working.
- **Auto-response to alerts.** 
	- He implies it's easy to add; the transcript shows it isn't built — he still tags the agent by hand.
- **Ownership delegation.** 
	- He tells agents to "own" test coverage or error rates, but never shows what polls anything afterward.
- **Auto-merge counts.** 
	- "5 PRs merged automatically" comes from the workflow's own summary, not from GitHub.
- **Memory syncing every turn.** 
	- Taken from the agent's plan text; only the final repo state is shown.
- **Production database access, parallel sandboxes not conflicting, several always-on loops**
	- all named, none demonstrated.

# Open questions the report leaves

- What schedules and fires the routines? 
	- Nothing in the material names a scheduler.
- How does replying in a thread resume a session if the sandbox is always killed?
- How does a two-hour run survive a serverless function that times out in minutes? Probably the function only launches and the sandbox reports back, but that's inferred.
- What credentials does the sandbox itself hold to post to Slack and open PRs?
- What happens when two sandboxes touch the same repo at once? Only one routine has a guard.
- Where do failures go? Is there any retry, alert, or log beyond an X emoji?
- How many Claude accounts is he running, and does that stay within subscription terms — he raises the concern himself.

# Bottom line

- It's a real, working remote-execution setup: 
	- Slack in, 
	- sandboxed Claude Code, 
	- PR out, 
	- with genuine polish around reactions, status, and artifacts.
- It is **not** unattended. 
	- By his own admission he triggers nearly everything, and he approves most merges.
- The one part that would make it unattended — the scheduler behind the routines — is the part he never explains or demonstrates.
- Roughly the whole 0-to-1 build is shown on camera and is credible; the impressive-sounding scale numbers are self-reported and unverified.
- Worth copying: 
	- the sandbox-per-message design, 
	- channel-topic-to-repo mapping, 
	- memory in a git repo, and the 
	- "PR already open, skip this run" guard. 
	- Treat the autonomy story as aspiration until you see the scheduler.

---

# 01 — Baseline: the most complete unattended agent system Ray Amjad has shown (from transcripts only)

Session 1 handoff. Written 2026-09-05.

## Method and how to check this file

- Source: every transcript in classSlug `slack-agents` (21 videos) and `loopy-ai` (40 videos), fetched via the agentic-coding-school MCP (`list_videos` then `get_video`) on 2026-09-05 and cached verbatim under `autonomy/transcripts/<classSlug>/`. Indexes: `autonomy/transcripts/slack-agents/INDEX.md`, `autonomy/transcripts/loopy-ai/INDEX.md`. All 61 files have a non-empty transcript; chars-per-second of video is uniform (16 to 21) across all files, so no file is truncated. Two files were re-fetched and compared sentence by sentence against the cache (On Call Agents; Automated Maintenance): identical.
- Extraction: ten Sonnet subagents, one per chapter block, returned verbatim quotes with BUILT / RUNS / BROKE / CHANGED / HUMAN / ASSERTED / IDEA / OTHERS / FEATURE tags. I then read the architecture-bearing transcripts in full myself (slack-agents 01, 05, 07, 08, 09, 15, 19, 20, 21; loopy-ai 12, 31, 32, 36, 37, 38) and grep-verified every quote used below against the cache. agentContext and video descriptions were not used as evidence.
- Locator convention: `[<classSlug>/<file>]` followed by the quoted sentence. Every quote is Ray speaking unless marked as him reading someone else. Some cached files keep the MCP's mid-sentence line breaks, so to grep a quote normalise whitespace first (for example `tr -s '\n ' ' '`).
- Status words: **confirmed** = the quoted sentence exists in the cache and says what the claim says. **unconfirmed** = Ray asserts it but the transcript shows no run, artefact, or output. **rejected** = the transcript contradicts it. "Confirmed" means Ray said it on camera, not that it is true in the world.
- Names: Ray's production agent is **Percy**. The class builds a clone called **JoeStar** in a workspace called Joestar Test. Where a mechanism is only shown on JoeStar I say so; Ray states the two share the same code lineage (`[slack-agents/07-0-to-1--polishing-the-bot.md]` "So for example, if I went to my previous agent Percy, then you can see it sent me a HTML report over here").

---

## 1. The system as one diagram in words

Read this top to bottom as data flow. Each numbered node lists trigger, reads, writes, and what consumes the output. Claim IDs (C-nn) point to the ledger.

### Node 1 — Slack workspace (the command surface and the work log)

- **Artefact:** Slack channels, one per project or per routine, with the GitHub repo URL in the channel topic. Channel names shown: a HyperWhisper dev channel, `as-voice-agents` (proposed), `as-fix-leaky-abstractions`, `percy-prs`, Percy Ops / Percy Dev / Percy Test, `Percy's Feedback` (also called `agents-feedback`), `joestar-test`, `joestar-dev`, "AgentStack verification". (C01, C02, C03)
- **Trigger for everything downstream:** a human posts a top-level message that @-mentions the bot. `[slack-agents/01-intro--benefits-of-this-approach.md]` "So you can see every time I send a top-level message, kind of like upgrade to latest version Next.js, then this spawns up a brand new sandbox and Claude Code is running as my own agent called Percy." (C04)
- **Thread reply = resume.** `[slack-agents/07-0-to-1--polishing-the-bot.md]` "So every time we spin up a new thread, so every time we have a new top-level message, that is a new session of Claude. And then every reply in the thread goes into existing session." (C05)
- **Channel topic → repo.** `[slack-agents/09-0-to-1--dogfooding.md]` "can you update the agent whereby for every channel that it's in, it automatically loads in the channel topic and it says, uh, the GitHub repo for this channel will be over here" (C06; built on JoeStar, PR shown).
- **What is written back here:** thread replies, reactions (eyes on receipt, check on success, X on fail), a "thinking…" status message updated every five seconds with elapsed time and last tool call, and files: HTML reports, `.webm` recordings, GIFs, screenshots. `[slack-agents/07-0-to-1--polishing-the-bot.md]` "We want to auto-react when a message lands. So we'll use an eyes emoji and it will use a check mark on success and an X on fail." `[slack-agents/10-0-to-1--mcp-servers.md]` "when it starts doing tool calling,, then it will show the tools that it is calling as well as how many seconds it's been running for, updated every 5 seconds." (C07, C08)
- **Who reads it next:** Ray (merge decision, follow-up), teammates, and other agents reading channel history as a database. `[slack-agents/01-intro--benefits-of-this-approach.md]` "And this channel now becomes a work log, a kind of like database where I can then have another agent look through all the previous messages" (C09, asserted only).

### Node 2 — The bot harness (Vercel serverless function)

- **Artefact:** a Slack app (bot token + signing secret, manifest edited by hand) whose backend is a Node project deployed to Vercel with push-to-deploy from a private GitHub repo. `[slack-agents/04-0-to-1--setting-up-bot-foundations.md]` "Can we make a really simple Slack bot here that we will be deploying to Vercel, whereby when I tag it, then it will automatically reply to the message" (C10)
- **Reads:** the Slack event, attachments (audio, video, images), channel topic, Vercel environment variables: `claude-code-token` (Claude Code OAuth token from `claude setup-token`, valid one year), `e2b API key`, Slack bot token, Slack signing secret, `github_app_id`, `github_app_private_key` (base64 PEM), plus per-tool keys such as the Exa and ElevenLabs keys. `[slack-agents/05-0-to-1--connecting-claude-code.md]` "So now we have all 4 environment variables set, the e2b one, Claude Code OAuth token, Slack bot token, and Slack bot signing secret." (C11)
- **Does:** boots an e2b sandbox from a template, mints a short-lived GitHub installation token, injects env vars, runs Claude Code, relays output. `[slack-agents/05-0-to-1--connecting-claude-code.md]` "So it says over here, boots the sandbox, runs Claude, passes the JSON output, and always kills the sandbox." `[slack-agents/08-0-to-1--connecting-to-github.md]` "we have something where it will mint an installation token in the Vercel function, and that will be passed over into sandbox." (C12, C13)
- **Multi-account rotation (Percy only):** `[slack-agents/05-0-to-1--connecting-claude-code.md]` "since I have multiple Claude Code accounts and each thread is randomly assigned to a different account, so I can use multiple subscriptions. Can you make Percy resume switching to another OAuth token for Claude Code if it runs into an error? And that error being you hit your weekly limit. And then it basically explored the codebase and added that feature for me." (C14; the feature is stated as added, no run shown)
- **Known limit of this node:** outputs pass through the function's memory. `[slack-agents/11-0-to-1--playwright.md]` "there seems to be an 8 megabyte, 8 megabyte file upload limit because currently any output is passed into the Vercel function's memory" (C15)
- **Self-modification path:** Percy edits its own harness from a Slack channel and deploys itself. `[slack-agents/05-0-to-1--connecting-claude-code.md]` "inside of percy-prs, I automatically get Percy to add new features to Percy and then deploy itself." (C16)

### Node 3 — The e2b sandbox (one per top-level Slack message)

- **Artefact:** an e2b template image. Contents Ray says are in it: Node + latest Claude Code; Playwright with Chromium; Postgres and Redis with default `DATABASE_URL` / `REDIS_URL`; the Codex CLI (`npm install openai/codex@latest`) plus `codex-auth.json`; skills copied from a `toolkit/skills` folder in the bot repo into the sandbox's `~/.claude/skills`; an `AGENTS.md` (with `CLAUDE.md` symlinked) written to the user root; MCP servers registered in an `mcp.json` (exa-mcp shown, production database MCPs stated). `[slack-agents/12-0-to-1--adding-database.md]` "it edited the template and it added a brand new line for Postgres with a DEFAULT_ROOT_USER and then also redis-server as well." `[slack-agents/16-0-to-1--adding-codex.md]` "it will add a new line saying npm install openai/codex@latest." `[slack-agents/14-0-to-1--skills.md]` "So I'll make a brand new folder inside of joestar and call it toolkit." `[slack-agents/13-0-to-1--claude-md.md]` "I'm going to go for approach 3 over here where it's written to the user root." `[slack-agents/10-0-to-1--mcp-servers.md]` "I went through the process of setting up all the MCP servers so it can connect to databases that I have for production applications." (C17 to C21)
- **Runs:** `claude --dangerously-skip-permissions` with the Slack message as prompt. `[slack-agents/05-0-to-1--connecting-claude-code.md]` "And then we can run Claude Code in dangerously-skip-permissions with a command. And it can be fine with dangerously-skip-permissions in the sandbox because there is nothing sensitive there." (C22)
- **Reads:** the cloned repo (via GitHub App token), the seeded local Postgres, the memory repo (Node 5), skills, MCPs.
- **Writes:** branches, commits, PRs (Node 4); files posted to Slack (Node 1); memory commits (Node 5). Posting to Slack and opening PRs happen through commands available inside the sandbox. `[loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md]` "At some situations, it opens up a PR using a command that it has available. It posts to Slack using another command." (C23)
- **Git guardrails:** `[slack-agents/08-0-to-1--connecting-to-github.md]` "And then the sandbox will have some guardrails to prevent it doing like force-pushes or deleting stuff, doing any dangerous GitHub Actions." (C24)
- **Lifetime:** killed after each run (C12), yet thread replies "resume the sandbox" (`[slack-agents/07-0-to-1--polishing-the-bot.md]` "So this basically is some kind of resume mechanism that we need in place to resume the sandbox."). How resume survives the kill is not explained (open question Q2). A new MCP config only takes effect on a new sandbox: `[slack-agents/10-0-to-1--mcp-servers.md]` "But one of the issues we now have is this will only work on a brand new sandbox." (C25)

### Node 4 — GitHub (repo, GitHub App, PRs, issues)

- **Artefact:** a GitHub App (`joestar-bot` in class) with contents read/write, pull requests read/write, metadata read; installed on the org; private key base64'd into Vercel. Per thread the function mints an installation token. (C13, C26)
- **What lands here:** branches, commits, PRs opened by the sandbox. GitHub issues are also the input queue for worker loops (Node 8) and the spec input for the task lifecycle (`[loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md]` "I gave it a spec that was a GitHub issue.") (C27)
- **Who reads next:** Ray reviews and merges (Section 2); Codex leaves PR review comments that Claude then addresses; routines check GitHub for an already-open PR before running again (Node 6).

### Node 5 — Memory (GitHub repo as durable layer for Claude Code auto-memory)

- **Artefact:** a private repo (`joestar-agent-memory` in class) that the sandbox's auto-memory directory syncs to after every turn. Layout: `shared/MEMORY.md` index plus per-channel folders keyed by Slack channel ID. `[slack-agents/15-0-to-1--adding-memory.md]` "I will use GitHub as a durable layer. So I'll make a repo and I will call it JoeStar-Agent-Memory" and "So we have a shared folder that it made for shared memories with the MEMORY.md, which is an index to all of the memory files. And then we have a channel-specific memory over here. So this is the internal channel ID that Slack uses." (C28)
- **Shown on JoeStar only**, after five automated end-to-end checks. Whether Percy uses the same layout is not stated.

### Node 6 — Scheduled routines that live inside Percy

- **Artefact:** a "routine" attached to a Slack channel, created by tagging Percy with a natural-language schedule. Output of each run is a PR plus a reply in the channel. Routines Ray says are running for him:
  - Dead-code cleanup, daily 08:00, agentic coding school repo. `[slack-agents/01-intro--benefits-of-this-approach.md]` "you can see I have over here a dead code cleanup that runs on a daily schedule at 8 AM for agentic coding school. And it essentially finds some dead code inside of the repo and then opens up a brand new PR kind of like this." (C29)
  - Docs kept in sync with code (C30), unify duplicate abstractions (C31), add newly published LLM models to the app (C32), production-error fixer via Sentry (C33), competitor and usage reports (C34). All from `[loopy-ai/37-command-and-control--automated-maintenance.md]` "So for example, I have one over here for basically making sure the docs are in sync with any code changes that we have made. One for removing dead code, very similar to Boris. One for adding any abstractions. And we can see one over here. That basically unified a bunch of stuff. One for looking at which new LLM models have been published and then adding those new models to the application. And then I have another one for pulling in production errors and then basically making a fix." and "I have other ones over here that basically deliver me reports, like about what competitors are doing and also reports about the usage of the application."
  - Sentry fixer run timing shown: "So this is one of the routines that just ran. And the run happened at 4 AM my time. And then it finished at about 6 AM my time." (C35)
  - Leaky-abstraction fixer, every 3 days, created on camera in channel `as-fix-leaky-abstractions`: "make a routine that runs every 3 days that will fix any leaky abstractions. And then also updates any relevant tests for it and make sure that other tests are passing and then opens up a PR." (C36) Its duplicate-run guard: "it will first check GitHub to make sure we don't already have a leaky abstraction that is open. If we have one open, I don't want more piling up." (C37)
  - Test-coverage ownership routine re-prompted on camera: `[slack-agents/20-using-your-agent--task-vs-ownership-delegation.md]` "So for example, I already have a routine that runs on a regular basis over here, and I can switch it accordingly. From now on, you will be taking ownership over test coverage in our code base." (C38; prompt sent, no run shown)
- **Trigger mechanism:** never stated. Percy "sets up that routine for itself" (`[loopy-ai/37-command-and-control--automated-maintenance.md]` "And then in my case, Percy will set up that routine for itself."). No transcript in either class names the scheduler, its storage, or how a scheduled run enters Node 2. (Open question Q1)

### Node 7 — The Layer-3 task lifecycle skill (what a Percy thread actually executes for a feature)

Ray's own daily skill, `[loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md]`, run "in the cloud via Slack". Stages, each a subagent driven by an orchestrator: "So it's not actually writing any code or reading files.":
1. Plan subagent with nested explorer subagents → plan split into phases. (C39)
2. One builder subagent per phase, fresh context, commit after each phase. "for each phase, for example, we have 4 phases, we will have 4 builder agents, each one in a brand new fresh context window." "And after each phase, it also makes a commit for that particular phase being done." (C40)
3. Parallel reviewers: Claude `/code-review` skill (medium or high by change size), Codex review in background, Cursor "thermo-nuclear review" skill; findings merged. (C41)
4. Fresh fix agent; stages 3 to 4 repeat "up to a maximum of 2 times". (C42)
5. Verify: Playwright in the sandbox, seed Postgres, emit "screen recordings, HTML files, also flow files"; artefacts reviewed; fix and re-verify if problems. (C43)
6. Output: PR plus artefacts posted to Slack; Ray approves via Slack. "And then finally, a PR alongside the artifacts are sent to me via Slack. And then I will basically approve it via Slack." (C44)
- Shortcut: "if this change is fewer than 30 lines and it adds no new logic, then we only do one smaller review instead." (C45) Auto-merge: "for some smaller features, I can have like another skill, another decision for auto-merging it." (C46, mechanism not shown)
- One end-to-end run described: GitHub-issue spec → plan in 11 minutes → 4 phases → usage limit hit on both accounts, Ray said "continue" → review found 10 high findings posted as PR comment → second review → API and browser flows verified → Ray merged; total "about 3 hours and 14 minutes", PR "about 15,000 lines changed". (C47)
- The class-built variant (`implement-feature` skill, `[loopy-ai/27-l3-task-lifecycle--creating-the-skill.md]` and `28-...testing-the-loop.md`) adds: blast-radius agent gating auto-merge ("We only auto-merge tiny and low-risk PRs after the Blast Radius agent assesses them."), Monitor tool on Vercel logs after deploy, and (added after a failure, Section 3) a PR-comment loop. Its first unattended run: "And when I ran this, I didn't do anything. It went through the entire process from the artifact plan all the way to the final PR with the artifact to describe what happened during that process." (C48, C49)

### Node 8 — Worker loops and other loops that live outside Percy (local Claude Code, Claude cloud routines, Codex)

These are real runs Ray shows but they are not part of the Slack system; they feed it or report to it.
- **backlog-burndown** (dynamic workflow in a local Claude Code session): GitHub issues with no PR → one PR per issue → Codex review loop → merge. `[loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md]` "So I actually ran it 4 different times. So in this case, we had 5 new PRs merged in automatically." "So this ran for about 5.5 hours, automatically going through the backlog of GitHub issues here." "if it automatically found new issues, then it would file those GitHub issues to be dealt with in a future PR." (C50, C51)
- **Monitor tool triggers** in an always-on local session on a second computer: one monitor on new GitHub issues labelled bug, one on Slack reactions to its own messages (thumbs up/down). "So if I go over here, I have two monitors. I have one set up for any new GitHub issues, and then I have one set up for any new reactions on a message that I sent." "So I have one computer that's always at home and I have one computer that I take around with me and I remote control into any sessions of Claude Code." (C52, C53) Reporting to Slack from this session uses a `slackbot-message` skill. (C54)
- **PR-backlog workflow**: `[loopy-ai/34-l4-and-l5-the-climb--going-through-a-pr-backlog.md]` pick most important PR in a subagent → address Codex comments → Codex consult → fix medium/high → "and then auto-merge."; "Do this 10 times." ran "about 1 hour 30 minutes"; "And it also closed some PRs for me as well because it basically decided that PR was no longer relevant anymore." (C55)
- **/goal user-flow verifier**: `[loopy-ai/25-l2-builder-and-verifier--example-user-flows.md]` 19-hour goal, writes `verification/registry.md` plus per-flow markdown with GIF evidence, posts flows to Slack channel "AgentStack verification" for thumbs up/down; 16 failures were then turned into GitHub issues by Ray. (C56, C57)
- **Claude cloud routines** (claude.ai, Anthropic-hosted, max three enabled on his plan): Sentry fixer for HyperWhisper, competitor monitor hourly with Airtable memory, landing-page optimiser reading PostHog and Stripe and notifying Slack, PlanetScale query optimiser weekly with Slack message each run, revenue report to Telegram. `[loopy-ai/10-the-toolbox--routines-aka-scheduled-tasks.md]` "Sentry fixer that is connected to my repository hyperwhisper and then also the Sentry API." `[loopy-ai/11-the-toolbox--memory-for-routines-aka-scheduled-tasks.md]` "then open up Competitor Monitor, then I can see here that Claude Code is slowly adding to this list so it doesn't repeat anything that it did earlier." `[loopy-ai/19-l2-builder-and-verifier--real-verifiers-touch-reality.md]` "It gets real-world data from PostHog and Stripe, and then it proposes modifications and then notifies me on Slack which modifications I want made." (C58 to C61)
- **Codex automations**: daily Sentry issue fixer (>20 users) and a "chief of staff" thread that spawned six PR-fix loops in worktrees. `[loopy-ai/03-l1-getting-started--where-loops-hide.md]` "So for example, I have an automation over here inside of Codex which looks through Sentry every single day, finds any issues affecting more than 20 users, and then automatically makes a fix for it in a brand new PR." (C62)
- **YouTube loops**: Outlier Scout every other day on Claude routines writing reports to a `ray-os` folder; A/B tester started by hand with `/loop 1h` after each upload and killed by hand after 24 hours. `[loopy-ai/20-l2-builder-and-verifier--verifiers-go-stale.md]` "after I upload a video to YouTube, I would then do /loop and then do 1 hour and then do YouTube A/B tester" and "And then after that, I just kill the loop manually." (C63)
- **Autoresearch**: local folder, `claude --dangerously-skip-permissions`, overnight; "it took four hours and five minutes over here", "about 21 experiments", results in a winner markdown and experiment log. (C64)
- **Japanese flashcard loop, receipts headless script**: stated as running; only the receipts script is shown executing. (C65)

### Node 9 — Feedback channel (agent asks for capabilities)

- **Artefact:** Slack channel `agents-feedback` / `Percy's Feedback`. Percy's system prompt tells it to post there when it wants a tool, credential, or connection. Ray's X reaction means "never ask again". Ray grants by replying, often "edit the harness for Percy to give yourself that ability", which routes to Node 2's self-modification path. `[slack-agents/21-using-your-agent--feedback-channels.md]` "So this is baked into the system prompts for the agent being like" and "give Percy a Google Tag Manager connection or equivalent way to edit the container" and "Give Percy a read-only way to download a file in Slack from its file ID when the channel history exposes a file." (C66, C67)

### Node 10 — External alert sources into Slack

- Trigger.dev alerts (task-run failures, deployment failures) post into a Slack channel. Investigation is **manual**: `[slack-agents/19-using-your-agent--on-call-agents.md]` "This is a transient database blip. It self-healed. No action needed on the data." and "But the problem here is I have to manually tag my agent and then tell it to investigate it." (C68) Automatic per-message triggering is **not built** (Section 4).

### Node 11 — Test harness for the bot itself

- Local Claude Code with the claude.ai Slack connector posts into `joestar-test` tagging the bot, waits ~30 s, reads replies; recorded as a verification step in the bot repo's `claude.md`. `[slack-agents/06-0-to-1--end-to-end-testing.md]` "It waits about 30 seconds and then reads through any replies to see if it's responding." and "Can you add this to your claude.md file for a verification step" (C69). The connector cannot send files, so attachment paths are verified by hand (Section 2).

---

## 2. Where a human still sits, and what happens when they do not respond

1. **Every top-level Slack task is human-initiated.** Ray names this himself as the main limitation: `[slack-agents/20-using-your-agent--task-vs-ownership-delegation.md]` "they are the trigger for every piece of work, which essentially means that if you were to go on holiday, then your agent is doing nothing." (C70) Routines (Node 6) are the only self-starting path inside Percy.
2. **PR merge is human** in the normal path. `[slack-agents/01-intro--benefits-of-this-approach.md]` "I do a quick check through the PR to make sure everything looks good. And then I merge it in." `[loopy-ai/31-...]` "And then I will basically approve it via Slack." Exceptions where merge is automatic: backlog-burndown (C50), PR-backlog workflow (C55), the class skill's blast-radius gate (C48). No-response behaviour: the PR sits; the leaky-abstraction routine explicitly **skips its next runs** while a PR is open (C37), so silence stalls that routine rather than piling up work. Nothing is said about other routines.
3. **Ownership boundaries wait for sign-off.** Template prompt: "Anything that touches billing amounts or refunds, propose a change first and wait for my sign-off." (`[slack-agents/20-...]`, C71) What happens after N days of no sign-off: not stated.
4. **Clarifying questions block.** Ray routinely instructs "Ask me any clarifying questions if needs be before getting started" (`[slack-agents/10-0-to-1--mcp-servers.md]`, C72) and the Playwright PR came back with questions he answered (`[slack-agents/11-0-to-1--playwright.md]` "do you want me to build a single-use-upload URL approach?"). A thread with an unanswered question stays parked; no timeout or default is mentioned anywhere.
5. **Usage limits stop the run until a human says continue.** `[loopy-ai/31-...]` "I then hit my Claude usage limit on both accounts. And then I said continue." (C73) Percy's token rotation (C14) only helps while some account has quota.
6. **Secrets and permissions are hand-installed.** Every new Slack scope needs Ray to paste the manifest, reinstall the app, and update the bot token in Vercel (`[slack-agents/07-...]` "we now have to reinstall this application for it to take effect", C74). Every new API key is set by Ray in Vercel or Infisical (`[loopy-ai/28-...]` "So I got to set an API key inside of InFiscal. And then I got to rotate an API key that I used during the planning stage.", C75). Feedback-channel requests (Node 9) wait indefinitely for Ray; X means never.
7. **Verification gaps a human must close:** sending files (`[slack-agents/07-...]` "the Slack MCP server that we registered with Claude.ai does not allow to send a file", C76) and voice messages (`[slack-agents/17-...]` "Now it was not able to do an end-to-end test for the voice message because of course it can't send a voice message.", C77).
8. **Local loops die with the human's machine or session.** `/loop` only runs while the session is open (`[loopy-ai/07-the-toolbox--loop.md]` "But the only issue is that you need to make sure you have this session of Claude Code running.", C78) and expires after three days by default; local scheduled tasks, `[loopy-ai/10-the-toolbox--routines-aka-scheduled-tasks.md]` "local tasks only run whilst your computer is awake." (C79); the Monitor-driven worker lives in an always-open session on a home computer (C53). Thumbs-up/down monitors do nothing until Ray reacts.
9. **Spec authoring is human.** `[loopy-ai/26-l3-task-lifecycle--designing-a-task-lifecycle.md]` "So the main point where the human comes into a loop is right over here. So right at the beginning." (C80)
10. **Ray kills some loops by hand** (YouTube A/B tester after 24 h, C63) and pauses /goal runs by hand.

---

## 3. Everything he says broke, and what he changed

| # | What broke (quote) | What he changed (quote) | Locator |
|---|---|---|---|
| B01 | First Claude-in-sandbox reply errored: "But it seems we got an error." | "Claude found the issue, which was a stale template." | slack-agents/05-0-to-1--connecting-claude-code.md |
| B02 | Weekly usage limit on one account | Added OAuth-token rotation across accounts (C14) | slack-agents/05-0-to-1--connecting-claude-code.md |
| B03 | Test harness posted without tagging: "But it didn't seem to tag the bot instead." | Invited bot to channel, told Claude to tag it, saved as memory and claude.md verification step (C69) | slack-agents/06-0-to-1--end-to-end-testing.md |
| B04 | Attachment sending untestable via connector (C76) | Verified manually | slack-agents/07-0-to-1--polishing-the-bot.md |
| B05 | Bot not in channel: "you mentioned Joestar, but they're not in the channel." PR link "keeps adding this random asterisk to the end. So the link doesn't open properly." | Added bot; merged PR anyway and sent follow-up prompt for manifest | slack-agents/09-0-to-1--dogfooding.md |
| B06 | New MCP only works in a new sandbox (C25); "a test search failed with invalid API key. So maybe I didn't copy it over properly." | Started a new thread; re-entered key: "So I now redid it and it said it's now working properly" | slack-agents/10-0-to-1--mcp-servers.md |
| B07 | 8 MB upload limit through Vercel function memory (C15) | Agent proposed single-use upload URL; Ray answered questions, agent opened a second PR | slack-agents/11-0-to-1--playwright.md |
| B08 | Template build "kept failing over here": "It actually went back and forth a few times with e2b.dev because it kept failing over here." | Agent corrected its assumption; "the build for the template passed successfully" | slack-agents/12-0-to-1--adding-database.md |
| B09 | AGENTS.md/CLAUDE.md not loaded in sandbox: "So we can see that it's not being loaded in for some reason" | Wrote it to user root (C20) | slack-agents/13-0-to-1--claude-md.md |
| B10 | Claimed skill-name conflict: "our code-review skill conflicts with the built-in one inside of Claude Code with the same name." | Skipped it, later found the claim false: "And it seems that Claude Code was wrong earlier by saying the code-review one will like conflict overlap because there's no code-review one over here." | slack-agents/14-0-to-1--skills.md |
| B11 | Voice message untestable by agent (C77) | Ray tested by recording a clip | slack-agents/17-0-to-1--additional-tooling.md |
| B12 | Sentry rate-limited a project unnoticed: "Sentry stopped accepting them because everything was being rate limited." | "I essentially had the bot fix this by reducing the amount of duplicate events coming in." then delegated ownership (C38 style) | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md |
| B13 | Percy lacks Slack file download: "Give Percy a read-only way to download a file in Slack from its file ID" | "edit the harness for Percy to give yourself that ability." | slack-agents/21-using-your-agent--feedback-channels.md |
| B14 | Class skill did not watch PR comments: "But we currently don't have some kind of system where Claude Code would automatically monitor the PR for any code review comments inside of this loop." | Added a Monitor-tool PR-comment loop to the skill as final step | loopy-ai/28-l3-task-lifecycle--testing-the-loop.md |
| B15 | Big PR review: "It found 10 high findings" on a "15,000 lines changed" PR; usage limit on both accounts (C73) | Second review round; Ray typed "continue" | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md |
| B16 | Design system inconsistent after v1: "it still felt inconsistent in some ways" | Builder/adversarial-review loop to v10, "about 2 hours back and forth in a loop across these two dynamic workflows" | loopy-ai/24-l2-builder-and-verifier--example-design-source-of-truth.md |
| B17 | YouTube title skill went stale: "the skill that generated thumbnails and titles for me was working really well for the first couple of months." | Added the Outlier Scout loop feeding fresh data (C63) | loopy-ai/20-l2-builder-and-verifier--verifiers-go-stale.md |
| B18 | Agents end early without being told they have a DB: "it will just assume that it doesn't have access to it and then end early" | Puts available resources in the prompt | loopy-ai/23-l2-builder-and-verifier--setting-up-environments.md |
| B19 | Parallelising a PR backlog created hidden dependencies | "I personally find it to be much more effective of going through the backlog one by one instead" | loopy-ai/33-l4-and-l5-the-climb--don-t-pre-sequence-the-backlog.md |
| B20 | Headless receipts script: "So it can't load a non-JPEG file." | Ctrl-C, "auto convert to JPEG", rerun | loopy-ai/09-the-toolbox--headless-mode-and-background-workflows.md |
| B21 | Cloud routines: max three enabled (C79 family) and "you may find that you don't have any memory between runs." | Airtable connector or Neon Postgres as external memory (C59) | loopy-ai/10 and loopy-ai/11 |
| B22 | /goal command shows "no commands": "I think there is a bug right now, but the /goal command should now work." | none | loopy-ai/14-the-toolbox--goal.md |
| B23 | Autoresearch tunnel vision | "Maybe I could have included my prompts to defer to a subagent to come up with a brand new strategy after each experiment" (not done) | loopy-ai/40-compounding-loops--autoresearch-technical-example.md |
| B24 | Feedback-diagram artefact useless: "yeah, I don't think this feedback diagram was particularly good." | Read feedback manually | loopy-ai/29-l3-task-lifecycle--improving-the-loop.md |

---

## 4. What he asserts without showing

Each item: the assertion, and what evidence is absent in the transcript.

| # | Assertion (quote) | What is not shown | Locator |
|---|---|---|---|
| A01 | "I have like dozens, I think close to 100 different Slack agents running every single day at different times of the day" | Only a handful of channels and one or two runs are shown; no list, count, or schedule | slack-agents/01-intro--benefits-of-this-approach.md |
| A02 | "I think now I run like 80, 90% of my work via Claude Code agents on Slack." | No measurement | loopy-ai/36-command-and-control--slack-as-your-command-center.md |
| A03 | "And then in my case, Percy will set up that routine for itself." | The routine's text appears; no scheduler, no run of it, no explanation of how it fires | loopy-ai/37-command-and-control--automated-maintenance.md |
| A04 | "my agent will basically set up that routine inside of this channel." (voice-agent usage report) | Hypothetical, not executed | slack-agents/01-intro--benefits-of-this-approach.md |
| A05 | "Now I've been doing more of this recently where I basically give agents ownership over different customers as well" | No channel, prompt, or output shown | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md |
| A06 | Test-coverage ownership routine "You can automatically decide how often you run" | Prompt sent; no run, no PR | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md |
| A07 | Sentry rate-limit ownership: "You should take ownership over this and tag me if this were to happen again." | Prompt sent; no evidence of monitoring afterwards | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md |
| A08 | On-call auto-response: "Now, this is really easy to add to your agent because you can literally just say something like" (followed by the feature prompt) | Not built. Percy only returned a wish-list: "it said it wants these abilities to create channels, to reply to messages without a mention, a webhook for when a message is sent on a channel" | slack-agents/19-using-your-agent--on-call-agents.md |
| A09 | "if it suggests improvements to a skill, then it should automatically open up a PR and then mention it on the Percy's feedback channel." | Instruction only; no such PR shown | loopy-ai/38-compounding-loops--feedback-channels.md |
| A10 | Token rotation "added that feature for me" (C14) | No rotation observed | slack-agents/05-0-to-1--connecting-claude-code.md |
| A11 | Parallel sandboxes: "They will not like conflict with each other. So they'll be working independently." | No conflict test; both PRs touched the same bot repo | slack-agents/09-0-to-1--dogfooding.md |
| A12 | Postgres in sandbox: "it would then be able to edit the database directly, verify by actually checking the database, run any queries as well." | Test shown was "it created a brand new data table, it inserted a row and selected it back." Nothing with real app data | slack-agents/12-0-to-1--adding-database.md |
| A13 | Memory "will sync after every turn if any changes are made to memory" | Taken from the agent's plan text; only end state of repo shown | slack-agents/15-0-to-1--adding-memory.md |
| A14 | Monitor tool: "if I was on the website and then I triggered some kind of error or something, then that would immediately go back to Claude code" | Only a warning from `npm run dev` was shown | loopy-ai/08-the-toolbox--monitor-tool.md |
| A15 | Monitor on GitHub issues: "if a brand new GitHub issue was filed with the tag bug, the label bug, then it would automatically trigger the monitor and then wake up this session" | Monitor created; no issue filed to trigger it | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md |
| A16 | "we had 5 new PRs merged in automatically" / "we merged in 15 PRs" | Figures come from the workflow's own summary in /workflows; the merges are model-reported. GitHub is shown for the PR-backlog workflow (C55) but not here | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md |
| A17 | "I've actually had a goal running for the last 90 hours that has written 500,000 lines of code and then used about 260-ish subagents" | Screen described, not verifiable in transcript | loopy-ai/16-the-toolbox--codex-managing-codex.md |
| A18 | Wise/Rewardful affiliate-payment loop: "I end up automating something that took like 2 hours every single month" | Only the API-token creation is shown; loop not run | loopy-ai/03-l1-getting-started--where-loops-hide.md |
| A19 | Speaker/microphone HyperWhisper end-to-end verification: "It would then play it via the speaker, which it can do using AppleScript" | Described in the conditional; not run | loopy-ai/23-l2-builder-and-verifier--setting-up-environments.md |
| A20 | Dynamic-workflow budgets and resume: "whilst the budget remaining is greater than 50,000 tokens, Then you should spawn another agent" / "resume from the same run ID" | Not demonstrated | loopy-ai/13-the-toolbox--dynamic-workflows.md |
| A21 | Cron jitter: "recurring tasks may fire up to 10% of the period late, capped at 15 minutes." | Read from docs; not observed | loopy-ai/07-the-toolbox--loop.md |
| A22 | Task lifecycle "developed this over like hundreds of iterations" | Skill file is "down below"; not in transcript | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md |
| A23 | Layer-5 discovery loops: "So I could have my discovery loop automatically engaging with the customers until it's confident enough that it found the correct bug." | Entirely conditional; the Gmail-to-issue routine is typed but no run shown | loopy-ai/35-l4-and-l5-the-climb--l5-discovery-loops.md |
| A24 | Japanese flashcard loop, YouTube outlier loop, GitHub triage loop, revenue/landing-page loop, metric-anomaly loop, daily summary loop all "running around the clock" | Only the outlier report folder is shown; the others are names | loopy-ai/01-l1-getting-started--intro.md, loopy-ai/32-...l4-worker-loops.md |
| A25 | Reports "delivered to me on a regular basis as HTML files" | One HTML file shown; schedule not shown | slack-agents/01-intro--benefits-of-this-approach.md |
| A26 | Autoresearch "cold email" and "ad creatives" uses: "people have also done this for cold email optimization" | Third-party hearsay | loopy-ai/39-compounding-loops--autoresearch-overview.md |

---

## 5. Open questions (research agenda for Session 2)

Infrastructure of Percy that the transcripts never explain:
- **Q1. Where do Percy's routines live and what fires them?** No transcript names a scheduler (Vercel cron, database, external service), where the schedule is stored, or how a scheduled run enters the Vercel function without a Slack message. (Nodes 6, A03)
- **Q2. How does thread-reply resume work if the sandbox is always killed?** Is the Claude session directory persisted (to the memory repo? e2b snapshot?), is a new sandbox rehydrated, or is the sandbox kept alive? `[slack-agents/05]` "always kills the sandbox" versus `[slack-agents/07]` "resume the sandbox". Also: does the 30-second thinking-status updater imply a long-lived process somewhere?
- **Q3. How is a multi-hour sandbox run decoupled from a Vercel serverless function?** Runs of two hours (Sentry routine, 04:00 to 06:00) and "ran on the cloud for a couple of hours" (`[loopy-ai/36]`) exceed any serverless timeout. Is the function only a launcher and the sandbox posts back to Slack on its own (C23 suggests a command in the sandbox)? What bot credentials does the sandbox hold?
- **Q4. What is the "command" the sandbox uses to post to Slack and open PRs** (`[loopy-ai/31]`), and is it the same code path as the `slackbot-message` skill used from local Claude Code (`[loopy-ai/32]`)?
- **Q5. Concurrency and locking.** Multiple sandboxes on one repo; only the leaky-abstraction routine has a "PR already open" guard. What happens when two routines or a routine and a thread touch the same files?
- **Q6. Failure and retry semantics.** X reaction on fail (C07): is there any retry, alert, or log? Where do sandbox logs go? What happens to a routine whose run fails?
- **Q7. Account and quota model.** How many Claude accounts, how threads are assigned, what happens when all are exhausted mid-run (C73 shows it halts until a human types continue), and whether this complies with subscription terms (Ray flags it: `[slack-agents/05]` "they do have some terms of service regarding this being billed via your Claude Code subscription").
- **Q8. Ownership delegation runtime.** When Percy "owns" test coverage or Sentry rate limits, what actually polls the metric? Is it just a routine with a prompt, or is there an event source? (A06, A07)
- **Q9. Is the on-call always-listen feature (respond to every message in selected channels without a mention) built anywhere?** In the transcript it is not. (A08)
- **Q10. Auto-merge decision skill.** What is the "another skill, another decision for auto-merging" (C46), and what did the blast-radius agent in the class skill actually auto-merge?
- **Q11. Memory on Percy.** Does Percy use the JoeStar layout (per-channel folders in a GitHub repo)? How is concurrent memory writing from parallel sandboxes merged?
- **Q12. Per-channel or per-user permission control for MCP servers** is only an idea (`[slack-agents/10]` "you may want to go through an additional process whereby you restrict which MCP server is available to which user or which channels"). Does Percy have any?
- **Q13. What is in the downloadable skill files** (task-lifecycle skill, implement-feature skill, backlog-burndown, slackbot-message, Codex consult, Artifact Planner, mermaid generator)? They are referenced as "down below" and never read on camera.
- **Q14. Evidence of scale.** Anything that would substantiate "close to 100 Slack agents" or "80 to 90 percent of my work" (A01, A02): channel list, routine list, PR counts.

Claude Code and adjacent features referenced that cannot be explained from these two classes alone (list only, per instruction):
- `claude-code-guide` subagent; auto-memory directory setting; `/code-review` skill and its medium/high settings; dynamic workflows, `/workflows`, "Ultra Code" via `/effort`, `/config` toggle; Monitor tool; `/loop` and its CronCreate tool with three-day expiry and jitter; `/goal` in Claude Code (and `features goals=true`); `/schedule` and cloud "routines" with connectors and environments; Claude in Chrome GIF creator; skill-creator skill; Codex consult skill; Artifact Planner skill; Spec Developer; mermaid-diagram-generator skill; slackbot-message skill; thermo-nuclear review skill (Cursor); Claude Tag; Claude managed agents; Claude.ai Slack connector; `claude setup-token`; headless `claude -p` JSON output; "Nova builder agent"; model names Opus 4.8, Fable 5, Claude Mythos Preview, Opus4.6 1M context; Codex "automations", "/goal", thread-spawning and "Ultra Goal" skill; e2b templates and network policy.

---

## Claims ledger

Format: ID | status | locator file | quoted sentence (verbatim, whitespace-normalised). "confirmed" = the sentence is in the cache and supports the claim as worded above.

- C01 | confirmed | slack-agents/09-0-to-1--dogfooding.md | "I like to put in the repo. So it's gonna be ray-amjadjoestar-agent."
- C02 | confirmed | loopy-ai/38-compounding-loops--feedback-channels.md | "So I have a channel over here, which is Percy. And this is like Percy Ops, Percy Dev, whenever I want to make improvements to Percy, and then Percy Test. So I'm going to make a brand new channel over here and call it Percy's Feedback."
- C03 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "So I have as-fix-leaky-abstractions. I'm going to tag my own agent, which is Percy."
- C04 | confirmed | slack-agents/01-intro--benefits-of-this-approach.md | "So you can see every time I send a top-level message, kind of like upgrade to latest version Next.js, then this spawns up a brand new sandbox and Claude Code is running as my own agent called Percy."
- C05 | confirmed | slack-agents/07-0-to-1--polishing-the-bot.md | "So every time we spin up a new thread, so every time we have a new top-level message, that is a new session of Claude. And then every reply in the thread goes into existing session."
- C06 | confirmed | slack-agents/09-0-to-1--dogfooding.md | "can you update the agent whereby for every channel that it's in, it automatically loads in the channel topic"
- C07 | confirmed | slack-agents/07-0-to-1--polishing-the-bot.md | "We want to auto-react when a message lands. So we'll use an eyes emoji and it will use a check mark on success and an X on fail."
- C08 | confirmed | slack-agents/10-0-to-1--mcp-servers.md | "it will show the tools that it is calling as well as how many seconds it's been running for, updated every 5 seconds."
- C09 | unconfirmed | slack-agents/01-intro--benefits-of-this-approach.md | "And this channel now becomes a work log, a kind of like database where I can then have another agent look through all the previous messages" (no such agent shown)
- C10 | confirmed | slack-agents/04-0-to-1--setting-up-bot-foundations.md | "Can we make a really simple Slack bot here that we will be deploying to Vercel, whereby when I tag it, then it will automatically reply to the message"
- C11 | confirmed | slack-agents/05-0-to-1--connecting-claude-code.md | "So now we have all 4 environment variables set, the e2b one, Claude Code OAuth token, Slack bot token, and Slack bot signing secret."
- C12 | confirmed | slack-agents/05-0-to-1--connecting-claude-code.md | "So it says over here, boots the sandbox, runs Claude, passes the JSON output, and always kills the sandbox."
- C13 | confirmed | slack-agents/08-0-to-1--connecting-to-github.md | "we have something where it will mint an installation token in the Vercel function, and that will be passed over into sandbox."
- C14 | unconfirmed | slack-agents/05-0-to-1--connecting-claude-code.md | "Can you make Percy resume switching to another OAuth token for Claude Code if it runs into an error? And that error being you hit your weekly limit. And then it basically explored the codebase and added that feature for me." (feature stated as added; no rotation observed)
- C15 | confirmed | slack-agents/11-0-to-1--playwright.md | "there seems to be an 8 megabyte, 8 megabyte file upload limit because currently any output is passed into the Vercel function's memory"
- C16 | confirmed | slack-agents/05-0-to-1--connecting-claude-code.md | "inside of percy-prs, I automatically get Percy to add new features to Percy and then deploy itself."
- C17 | confirmed | slack-agents/12-0-to-1--adding-database.md | "it edited the template and it added a brand new line for Postgres with a DEFAULT_ROOT_USER and then also redis-server as well."
- C18 | confirmed | slack-agents/16-0-to-1--adding-codex.md | "it will add a new line saying npm install openai/codex@latest."
- C19 | confirmed | slack-agents/14-0-to-1--skills.md | "So I'll make a brand new folder inside of joestar and call it toolkit."
- C20 | confirmed | slack-agents/13-0-to-1--claude-md.md | "I'm going to go for approach 3 over here where it's written to the user root."
- C21 | unconfirmed | slack-agents/10-0-to-1--mcp-servers.md | "I went through the process of setting up all the MCP servers so it can connect to databases that I have for production applications." (stated, not shown)
- C22 | confirmed | slack-agents/05-0-to-1--connecting-claude-code.md | "And then we can run Claude Code in dangerously-skip-permissions with a command. And it can be fine with dangerously-skip-permissions in the sandbox because there is nothing sensitive there."
- C23 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "At some situations, it opens up a PR using a command that it has available. It posts to Slack using another command."
- C24 | confirmed | slack-agents/08-0-to-1--connecting-to-github.md | "And then the sandbox will have some guardrails to prevent it doing like force-pushes or deleting stuff, doing any dangerous GitHub Actions."
- C25 | confirmed | slack-agents/10-0-to-1--mcp-servers.md | "But one of the issues we now have is this will only work on a brand new sandbox."
- C26 | confirmed | slack-agents/08-0-to-1--connecting-to-github.md | "So we will give it permissions to contents. So contents, this will be read and write. Then go to pull requests. So let me search for that. This will be read and write as well. Then for metadata."
- C27 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "I gave it a spec that was a GitHub issue."
- C28 | confirmed | slack-agents/15-0-to-1--adding-memory.md | "So we have a shared folder that it made for shared memories with the MEMORY.md, which is an index to all of the memory files. And then we have a channel-specific memory over here. So this is the internal channel ID that Slack uses."
- C29 | confirmed | slack-agents/01-intro--benefits-of-this-approach.md | "you can see I have over here a dead code cleanup that runs on a daily schedule at 8 AM for agentic coding school. And it essentially finds some dead code inside of the repo and then opens up a brand new PR kind of like this."
- C30 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "I have one over here for basically making sure the docs are in sync with any code changes that we have made."
- C31 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "One for adding any abstractions. And we can see one over here. That basically unified a bunch of stuff."
- C32 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "One for looking at which new LLM models have been published and then adding those new models to the application."
- C33 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "every single day it pulls in errors via Sentry and then makes those fixes and then opens up a PR and kind of shows me what it changed and verifies its own changes as well."
- C34 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "I have other ones over here that basically deliver me reports, like about what competitors are doing and also reports about the usage of the application."
- C35 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "So this is one of the routines that just ran. And the run happened at 4 AM my time. And then it finished at about 6 AM my time."
- C36 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "make a routine that runs every 3 days that will fix any leaky abstractions. And then also updates any relevant tests for it and make sure that other tests are passing and then opens up a PR."
- C37 | confirmed | loopy-ai/37-command-and-control--automated-maintenance.md | "it will first check GitHub to make sure we don't already have a leaky abstraction that is open. If we have one open, I don't want more piling up."
- C38 | unconfirmed | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md | "So for example, I already have a routine that runs on a regular basis over here, and I can switch it accordingly. From now on, you will be taking ownership over test coverage in our code base." (prompt sent; no run shown)
- C39 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "it spins up a planning agent that will have its own nested subagents, which are explorers."
- C40 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "for each phase, for example, we have 4 phases, we will have 4 builder agents, each one in a brand new fresh context window."
- C41 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "So we have a Claude reviewer using the /code-review skill inside of Claude Code."
- C42 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "So we kind of go back and forth between stage 3 and stage 4 up to a maximum of 2 times."
- C43 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "Then we emit artifacts such as screen recordings, HTML files, also flow files as well."
- C44 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "And then finally, a PR alongside the artifacts are sent to me via Slack. And then I will basically approve it via Slack."
- C45 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "if this change is fewer than 30 lines and it adds no new logic, then we only do one smaller review instead."
- C46 | unconfirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "And for some smaller features, I can have like another skill, another decision for auto-merging it." (mechanism not shown)
- C47 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "this particular task lifecycle ran for about 3 hours and 14 minutes, but it delivered a really good solution for me."
- C48 | confirmed | loopy-ai/27-l3-task-lifecycle--creating-the-skill.md | "We only auto-merge tiny and low-risk PRs after the Blast Radius agent assesses them."
- C49 | confirmed | loopy-ai/28-l3-task-lifecycle--testing-the-loop.md | "And when I ran this, I didn't do anything. It went through the entire process from the artifact plan all the way to the final PR"
- C50 | unconfirmed | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md | "So I actually ran it 4 different times. So in this case, we had 5 new PRs merged in automatically." (numbers are the workflow's self-report; GitHub not shown)
- C51 | confirmed | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md | "So this ran for about 5.5 hours, automatically going through the backlog of GitHub issues here."
- C52 | confirmed | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md | "So if I go over here, I have two monitors. I have one set up for any new GitHub issues, and then I have one set up for any new reactions on a message that I sent."
- C53 | confirmed | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md | "So I have one computer that's always at home and I have one computer that I take around with me and I remote control into any sessions of Claude Code."
- C54 | confirmed | loopy-ai/32-l4-and-l5-the-climb--l4-worker-loops.md | "I actually have a skill which is slackbot-message skill."
- C55 | confirmed | loopy-ai/34-l4-and-l5-the-climb--going-through-a-pr-backlog.md | "And it also closed some PRs for me as well because it basically decided that PR was no longer relevant anymore."
- C56 | confirmed | loopy-ai/25-l2-builder-and-verifier--example-user-flows.md | "So this is a general goal that I had set up and it ran in a loop for about 19 hours."
- C57 | confirmed | loopy-ai/25-l2-builder-and-verifier--example-user-flows.md | "send me any user flows on a Slack channel, which is called AgentStack verification."
- C58 | confirmed | loopy-ai/10-the-toolbox--routines-aka-scheduled-tasks.md | "Sentry fixer that is connected to my repository hyperwhisper and then also the Sentry API."
- C59 | confirmed | loopy-ai/11-the-toolbox--memory-for-routines-aka-scheduled-tasks.md | "then open up Competitor Monitor, then I can see here that Claude Code is slowly adding to this list so it doesn't repeat anything that it did earlier."
- C60 | confirmed | loopy-ai/19-l2-builder-and-verifier--real-verifiers-touch-reality.md | "It gets real-world data from PostHog and Stripe, and then it proposes modifications and then notifies me on Slack which modifications I want made."
- C61 | confirmed | loopy-ai/12-the-toolbox--example-databases.md | "And then it will send me a message on Slack every time it runs."
- C62 | confirmed | loopy-ai/03-l1-getting-started--where-loops-hide.md | "So for example, I have an automation over here inside of Codex which looks through Sentry every single day, finds any issues affecting more than 20 users, and then automatically makes a fix for it in a brand new PR."
- C63 | confirmed | loopy-ai/20-l2-builder-and-verifier--verifiers-go-stale.md | "after I upload a video to YouTube, I would then do /loop and then do 1 hour and then do YouTube A/B tester" and "And then after that, I just kill the loop manually."
- C64 | confirmed | loopy-ai/40-compounding-loops--autoresearch-technical-example.md | "it has finished running overnight and you can see that it took four hours and five minutes over here." and "And it seems to have done about 21 experiments."
- C65 | unconfirmed | loopy-ai/01-l1-getting-started--intro.md | "Now, some of the loops that I like to have running around the clock is one for mining Japanese sentences." (named, not shown)
- C66 | confirmed | slack-agents/21-using-your-agent--feedback-channels.md | "So this is baked into the system prompts for the agent being like" (the sentence continues with a nested double-quoted instruction to post on the channel)
- C67 | confirmed | slack-agents/21-using-your-agent--feedback-channels.md | "give Percy a Google Tag Manager connection or equivalent way to edit the container"
- C68 | confirmed | slack-agents/19-using-your-agent--on-call-agents.md | "But the problem here is I have to manually tag my agent and then tell it to investigate it."
- C69 | confirmed | slack-agents/06-0-to-1--end-to-end-testing.md | "It waits about 30 seconds and then reads through any replies to see if it's responding." and "Can you add this to your claude.md file for a verification step"
- C70 | confirmed | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md | "they are the trigger for every piece of work, which essentially means that if you were to go on holiday, then your agent is doing nothing."
- C71 | confirmed | slack-agents/20-using-your-agent--task-vs-ownership-delegation.md | "So anything that touches billing amounts or refunds, propose a change first and wait for my sign-off."
- C72 | confirmed | slack-agents/10-0-to-1--mcp-servers.md | "Ask me any clarifying questions if needs be before getting started."
- C73 | confirmed | loopy-ai/31-l3-task-lifecycle--my-daily-task-lifecycle.md | "I then hit my Claude usage limit on both accounts. And then I said continue."
- C74 | confirmed | slack-agents/07-0-to-1--polishing-the-bot.md | "So pressing save changes, we now have to reinstall this application for it to take effect."
- C75 | confirmed | loopy-ai/28-l3-task-lifecycle--testing-the-loop.md | "So I got to set an API key inside of InFiscal. And then I got to rotate an API key that I used during the planning stage."
- C76 | confirmed | slack-agents/07-0-to-1--polishing-the-bot.md | "the Slack MCP server that we registered with Claude.ai does not allow to send a file."
- C77 | confirmed | slack-agents/17-0-to-1--additional-tooling.md | "Now it was not able to do an end-to-end test for the voice message because of course it can't send a voice message."
- C78 | confirmed | loopy-ai/07-the-toolbox--loop.md | "But the only issue is that you need to make sure you have this session of Claude Code running."
- C79 | confirmed | loopy-ai/10-the-toolbox--routines-aka-scheduled-tasks.md | "local tasks only run whilst your computer is awake." and "we can't have more than three scheduled tasks enabled at the same time on the cloud version."
- C80 | confirmed | loopy-ai/26-l3-task-lifecycle--designing-a-task-lifecycle.md | "So the main point where the human comes into a loop is right over here. So right at the beginning."
- B01–B24 | confirmed | files named in the Section 3 table | quotes as printed in the table
- A01–A26 | unconfirmed | files named in the Section 4 table | quotes as printed in the table; each is a statement with no run, artefact, or output in the transcript
- A08 | rejected as "built" | slack-agents/19-using-your-agent--on-call-agents.md | "But the problem here is I have to manually tag my agent and then tell it to investigate it." (auto-response to channel messages is not built; only requested)
- Q1 (Percy routine scheduler) | unconfirmed | grep of both classes for "cron", "schedul", "routine" in slack-agents finds no mechanism; loopy-ai/37 "And then in my case, Percy will set up that routine for itself." is the only statement
- Session scope | confirmed | autonomy/transcripts/slack-agents/INDEX.md and autonomy/transcripts/loopy-ai/INDEX.md | 21 + 40 files, all status OK, none empty
