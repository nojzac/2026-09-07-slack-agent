# Plain-English explanation, with a metaphor

Added 2026-09-06. Written by the orchestrator session after reading the three walkthroughs below. The walkthroughs themselves, with sources, start at "Messi Li".

## The reference point: Ray's clinic

- One receptionist. Nothing happens until a patient walks up to the desk and asks.
- One doctor is called in, sees the patient in a fresh room, writes a treatment plan, hands it to you to sign.
- Good service, but if nobody walks in, nobody works.

## Messi Li: an emergency department

- **Patients arrive on their own.** Ambulances, pagers, ward monitors. In his case: PagerDuty alerts, failed CI builds, messages in a support channel. Nobody has to ask. Two people watch the door, a live feed and a poller, in case one blinks.
- **Every patient gets their own bay.** Each case works in its own git worktree, so five cases run at once without contaminating each other's chart.
- **A chain of specialists, not one doctor.** An investigator works the case for up to twenty rounds, checking its own reasoning. A follow-up agent keeps talking to the person who raised it, for days if needed. A dev agent makes the fix. A fourth reviews how the department itself performed and files suggestions.
- **Nothing leaves without passing a checklist.** Nineteen fixed checks: is the reasoning consistent, is the paperwork complete, is the confidence claim earned. Confidence is arithmetic, starting at 100 percent and docked for every open question and unchecked source. A failed check pins a note to the chart and sends the case back for another round.
- **The chart follows the patient.** Session transcripts are saved into git, so if the machine working a case dies, another picks up the chart.
- **Limits on heroics.** After three failed build fixes it stops and escalates. Under 70 percent confidence it does not self-heal at all and calls a human.
- **The attending physician still signs.** He confirms the diagnosis before a merge request is written, approves every merge, handles anything needing a physical security key.
- **The department improves itself.** Weekly, gap reports get analysed. Anything recurring three times becomes a proposed standard procedure. Approved changes become merge requests against the harness's own code.
- **Admitted weak spot:** nobody tracks the bill closely. No cost dashboard.
- **Versus Ray:** the AI is the same. The difference is the plumbing: intake without a human, isolation per case, a mechanical discharge checklist, charts that survive a dead machine, hard stops on retries.

## AgentField: a construction site

- **You hand over a blueprint, not a request.** One requirements document goes in. A planner agent breaks it into 50 to 100 tasks and draws the dependency chart: foundations before walls, walls before roof. That is close to the last thing you type.
- **Crews work in parallel on separate parts of the site.** Each task gets its own worktree and branch. Tasks at the same level of the chart run at the same time.
- **A foreman whose only job is fitting pieces together.** A merger agent joins the branches, knowing what each crew was trying to do, instead of a blind text merge. Ray has no equivalent. Messi Li avoids the problem by never merging cases together.
- **Three layers of "what if it goes wrong."** A crew gets five tries. If they fail, a supervisor picks one of five set recovery moves. If that fails, an architect redraws the remaining plan. Anything still unfinished is written down as typed debt rather than quietly dropped.
- **The site log is saved at every floor.** JSON checkpoints between levels, with a resume path after a crash.
- **It stops at the finished building.** Draft PRs come out with a cost breakdown by role. Deployment is out of scope. You approve every PR as architectural sign-off.
- **Honest warnings:** one demo run was over 200 agent invocations and about $116, which the team says is too expensive to iterate on. A deadlock ate a 45-minute timeout. A merge once referenced modules that no longer existed.
- **Versus Ray:** Ray's task lifecycle also has a planner and one builder per phase, but the phases run one after another in one sandbox with no merger, no checkpoint, no retry ladder, no cost report. AgentField is the same idea with the scaffolding, published as open source.

## OpenAI's Codex team: a factory that runs itself, and Symphony is the published shift schedule

- **Two sources.** The February post describes how an internal team built a real product, about a million lines, with no human writing a line. The Symphony spec, published later, is the orchestrator they open-sourced.
- **Orders come off a conveyor, not from a person.** In Symphony a daemon polls the issue tracker every 30 seconds, sorts by priority and age, and dispatches. Nobody types anything. Ray needs a Slack message. Messi Li needs an alert. AgentField needs a blueprint.
- **Each machine has its own station, always the same one.** Every issue gets a deterministic workspace path from its ID, reused across runs, so a resumed job finds its old work.
- **Quality control is built into the machines.** Agents self-review, then other agents review, iterating until every agent reviewer is satisfied. The mechanical gate is custom linters, written by agents, enforcing architecture rules. Humans may review but are not required to. This is the only one of the four where merging can happen with no human.
- **The plant manager handles stalls and overruns.** Retries with backoff capped at five minutes. A session silent for five minutes is killed and requeued. A turn times out after an hour. Twenty turns per session by default. Token accounting throughout. Ray and Messi Li both lack this; AgentField only partly has it.
- **Someone still walks the floor.** Humans set priorities, turn vague feedback into criteria, judge outcomes, and write lessons into the repo docs so the next agent inherits them.
- **The rust problem.** Agents copy existing patterns, including bad ones, so the codebase drifts. Their fix is scheduled cleanup runs that refactor against stated principles. Ray's dead-code and leaky-abstraction routines are a small version of this.
- **Thin parts:** deployment mechanics are not described. Symphony's spec warns that pointing agents at repos or trackers with sensitive or externally controlled content is dangerous, and it does not choose a hardening posture for you.

## The three side by side

- **Messi Li:** reactive. Trouble in production is the trigger. Best at intake and at deciding what is safe to say.
- **AgentField:** planned. One big spec is the trigger. Best at breaking work into parallel pieces and joining them back.
- **OpenAI:** continuous. The backlog is the trigger. Best at running unattended for a long time without stalling, and the only one that merges without a person.
- **What none of them show, same as Ray:** deploying to production and watching it afterwards.

## When each one fits

- **Ray's clinic:** you are the only customer and you are awake. A few repos, ideas arrive during the day, you fire them off from your phone and get a PR back. Breaks down when you want work to happen without asking, or two jobs on one repo at once.
- **Messi Li's emergency department:** you already run something in production that generates trouble on its own. The point is not being the person who gets paged. Worth it when incoming trouble is steady, roughly his thirty tickets a week. Overkill for a side project with no users.
- **AgentField's construction site:** one large, well-specified thing to build, where the bottleneck is one agent grinding through it in sequence. Pays off when the work splits into many independent pieces. Wasteful, by their own numbers, for small changes or work you cannot spec up front. Does nothing after the build is done.
- **OpenAI's factory:** a backlog that refills itself, worked continuously with nobody dispatching. Needs a real issue tracker with well-written issues, tests and linters strong enough for agents to gate each other, and tolerance for drift you clean up on a schedule. The only one built to run for weeks. Wrong fit if issues are vague or tests are thin.
- **In order of when you would reach for them:** Ray for daily delegation. Messi Li once something is live and paging you. AgentField for the occasional big build. OpenAI only with a backlog and a disciplined repo.
- **They stack.** Messi Li's intake plus Symphony's dispatcher plus AgentField's merger agent is a coherent design. Nobody in the research has shown all three together.

## Stack comparison

- **Ray's clinic**
  - Agent: Claude Code, plus the Codex CLI inside the sandbox for reviews
  - Where it runs: an e2b sandbox per task, launched by a Node app on Vercel
  - Hand-off surface: Slack
  - Code host: GitHub, via a GitHub App
  - Extras in the sandbox: Playwright, Postgres, Redis, MCP servers, a skills folder
  - Memory: a private GitHub repo
- **Messi Li's emergency department**
  - Agent: Claude Code
  - Where it runs: his own machines, systemd starting short-lived sessions. No sandbox service. Isolation is git worktrees on the same box.
  - Intake: Slack support channel, GitLab merge request comments and CI results, PagerDuty
  - Code host: GitLab
  - Other connections: Datadog, Jira, Confluence, Glean, all through MCP servers
  - State: local JSON files plus transcripts synced through git
- **AgentField's construction site**
  - Agent: Claude Code, different models per role. Haiku for cheap work, Sonnet for most, Opus for architecture.
  - Where it runs: a local control plane over REST that spawns the agents. No hosting platform named; a machine you run it on.
  - Isolation: git worktrees, one branch per issue
  - State: JSON checkpoints between levels, plus a shared key-value memory store
  - Gates: agent code review and automated test harnesses
  - Published as an Apache 2.0 repo
- **OpenAI's factory**
  - Agent: Codex CLI. No Claude anywhere.
  - Where it runs: a long-running daemon; the Symphony reference implementation is in Elixir. Not serverless.
  - Intake: an issue tracker, polled every 30 seconds through an adapter
  - Isolation: git worktrees with a deterministic path per issue, plus a throwaway observability stack per agent
  - Gates: agent-written custom linters, peer agent review
  - Observability: OpenTelemetry, with agents querying logs and metrics themselves
  - Browser work: Chrome DevTools Protocol
- **Two things stand out**
  - Ray is the only one using a sandbox service. The other three run on machines they control and use git worktrees for isolation.
  - Nobody besides OpenAI uses anything other than Claude Code. To stay on Claude Code, study Messi Li and AgentField. The Symphony dispatcher pattern would need porting, since it drives the Codex CLI.

## What Ray does that the other three do not

- **Shown on camera and absent from the other three**
  - **Working from a phone with rich results coming back.** The Slack thread returns screen recordings, GIFs, HTML reports, and a live status line. The others return a PR or a message. Ray's is the only one built for judging work without opening a laptop.
  - **Verification that touches a browser and a database.** The sandbox has Playwright and a seeded Postgres, and the task lifecycle records the flows it tested. The others gate on tests, linters, or reasoning checks. None shows an agent driving a browser as proof.
  - **A throwaway sandbox per task.** Everything else runs on the operator's own machines. A bad run cannot touch anything except the repo it was given a token for. The worktree setups do not have that safety property.
  - **Zero infrastructure to keep alive.** Vercel plus e2b means nothing runs when nothing is happening. Messi Li, AgentField, and Symphony all need a box that stays on.
  - **Reviewers from three vendors.** Claude, Codex, and Cursor each review the same PR. The others use one model family reviewing itself, or linters.
  - **Many small routines instead of one big loop.** Dead code, docs sync, model updates, competitor reports, each its own scheduled job with its own channel. The others are single-purpose systems.
- **Described by Ray, not shown, and nobody else describes it either**
  - **The agent asks for capabilities.** A feedback channel where Percy posts what it needs, and Ray answers by telling it to edit its own harness. Messi Li's gap analyser is close, but Ray's puts the request in front of the human in chat.
  - **Self-modification from chat.** A channel where Percy adds features to Percy and redeploys itself.
- **Where Ray is simply behind**
  - No intake without a human, no isolation between concurrent runs, no turn or dollar caps, no retry ladder, no cost reporting. The other three each solved those.
  - Correction, 2026-09-06: an earlier version of this section said "nothing published". That was wrong. The course ships a diff and a full repo snapshot per lesson in its Downloads tab, plus multi-page prompts that serve as specs. The repos are private and behind the course paywall, so there is no public source on the open web, but an enrolled student has the plans. See autonomy/06-does-ray-give-plans.md.
  - Second correction, same day: the course code is in fact PUBLIC at https://github.com/ray-amjad/slack-agent-course, one tag per lesson, branches lesson-02 to lesson-15. The MCP get_video "downloads" field links to it; Session 1 dropped that field and Session 2 searched only ray-amjad/skills. So "no public repo" was also wrong. Ray publishes the build. The repo also contains toolkit/skills/task-lifecycle/SKILL.md, the skill Session 2 reported as unpublished (R-9.7 looked only at ray-amjad/skills).
- **The honest read**
  - Ray is ahead on the human-facing surface and per-task safety, behind on everything that makes a system run without him. The other three are ahead on plumbing, behind on ergonomics.
  - A system that took Ray's sandbox-per-task and phone-first reporting and bolted on Messi Li's intake and Symphony's stall handling would be better than any of the four.

## Can Ray's gaps be bolted on?

- **Cheap, an afternoon each**
  - **Turn and dollar caps.** Add `--max-turns` and `--max-budget-usd` to the command the sandbox runs, plus a sandbox timeout. Ray already passes flags to that command.
  - **Cost reporting.** Run Claude with `--output-format json` and read the cost field. Post it in the Slack thread next to the check mark, same code path as the reactions.
  - **Retry ladder.** The function already knows whether a run failed, because it sets the check or X reaction. Add a counter: retry once with the error appended to the prompt, then post "gave up after 2, here is the last error."
- **Moderate, a weekend, and Ray already has the pieces**
  - **Intake without a human.** Ray already receives Trigger.dev alerts in a Slack channel and tags Percy by hand. The bolt-on is a rule: a message from the alert bot in that channel counts as a mention. Same for a GitHub webhook on labelled issues. Copy Messi Li's dedup file and poller backup.
  - **Duplicate and overlap guard.** One routine already checks for an open PR before running. Make that the default for every routine, and add a lock per channel so two runs on one repo queue instead of colliding.
- **Structural, because it fights the architecture**
  - **Isolation between concurrent runs.** Ray has this by accident, one sandbox per run. What he lacks is the merge side: two sandboxes opening PRs against the same files conflict and nobody handles it. Either serialise runs per repo, which is easy and probably right for one person, or add a merger step like AgentField's.
  - **Session persistence across sandbox death.** Thread replies resume somehow; the research could not find how. If it does not survive a killed sandbox, the fix is storing the transcript outside the sandbox, which Anthropic's SDK supports through a SessionStore adapter. Real work, not a flag.
  - **Stall detection.** Symphony kills a session silent for five minutes. Ray's Vercel function cannot watch a two-hour sandbox because the function dies at 30 minutes. Needs a small always-on process, or the watcher inside the sandbox. The one place serverless costs him.
- **Ranking:** caps, cost, and retries are trivial. Intake and locking are a weekend. Merge handling, resume, and stall detection are where the architecture pushes back, and the fix for the last is the same one Messi Li and Symphony chose: a daemon on a box that stays on.
- **Two things worth doing differently from day one** rather than bolting on later: put the launcher on a box that stays on instead of a serverless function, and store session transcripts outside the sandbox from the start.

## Does Ray give the plans? Verified 2026-09-06

- **Claim tested:** an earlier version of this file said Ray "publishes nothing" and a builder would work from a video, not a repo. The user disputed it. An Opus subagent read the eleven build chapters of the slack-agents transcripts. Full write-up: autonomy/06-does-ray-give-plans.md.
- **Verdict:** the course gives most of the plans. The gaps are that the artefacts sit behind the course paywall rather than on public GitHub, the Slack app manifest is never published as a file, and the last four lessons are concept talks with no code.
- **Evidence**
  - Every lesson has a Downloads tab with a diff of what changed and a full repo snapshot at the end of the lesson. Lesson 2 says so directly; lesson 4's description says the code is in the Downloads tab as a zip.
  - Lessons 7, 8, and 15 contain multi-page prompts that read as engineering specs, down to Slack's private file URLs returning HTML instead of a 401, the JWT claim set for the GitHub App, and the exact auto-memory settings keys.
  - Most steps are Ray prompting Claude Code and letting it build, rather than showing hand-written code. The manifest is always "give me a manifest". One failure in lesson 5 is resolved off camera as "a stale template". Lessons 19 to 21 have no code.
  - No public GitHub URL for the finished bot exists in any transcript. Joestar, Percy, and the memory store are private. The only public repos mentioned belong to other people.
- **What this changes:** the "no public source" finding from the web research still holds for the open web, but it was wrong to turn it into "no plans". An enrolled student has the diffs, snapshots, and prompts. Ray's course is a reproducible base, and the bolt-on list above is the upgrade path from it.

---

# Messi Li — a self-hosted harness where support tickets, CI failures and pages become merge requests on their own

- Source: https://licaomeng.medium.com/building-a-production-agent-harness-turning-claude-code-into-a-multi-agent-engineering-pipeline-1db4e242d08a (30 May 2026). Fetched through r.jina.ai because Medium blocked the direct fetch.
- Beyond Ray because it clears five of the criteria.
  - Work is created without a human typing it: PagerDuty alerts, GitLab CI results and support-channel tickets all start runs on their own.
  - Several runs work the same repo at once with real isolation: one git worktree per case, never the main checkout.
  - There is a machine-readable verification gate: nineteen named gate functions plus arithmetic confidence ceilings decide whether an answer is allowed out.
  - State persists across machines: session transcripts are git-synced, so a case can continue somewhere else after the machine dies.
  - Cost and quota controls are built in: a twenty-turn cap per investigation, a three-failure cap on CI self-healing, and a confidence floor below which the agent must escalate.

## Who they are and what they build
- An engineer who built and runs an internal on-call and delivery harness inside their own company. It is not a product and the code is not published.
- It had been running continuously for several months when the post was written.
- The team it serves handles roughly thirty support tickets a week, which is what forced the automation.
- The stated goal is not "AI writes my code". It is that the boring half of on-call, triage, investigation, the obvious fix, happens without a person starting it.

## How work gets created and handed off
- Three signal sources feed one unified dispatch queue.
  - A Slack support channel, watched two ways at once, by a socket connection and by a poller, so a dropped event still lands.
  - GitLab activity, meaning merge request comments and CI results.
  - PagerDuty alerts.
- Duplicate messages are dropped using a dedup file, and the poller freezes its cursor when the API returns nothing, so an empty response is not mistaken for progress.
- Nobody has to mention a bot in a channel. A page firing or a build going red is enough to start a run.
- This is the single biggest difference from a chat-triggered setup: the queue is the interface, and Slack is only one producer feeding it.

## What runs the agent, and where
- Systemd units on the author's own machines spawn short-lived Claude Code sessions. There is no serverless function and no third-party sandbox service.
- Four agent roles with explicit hand-offs between them.
  - An investigation agent that runs up to twenty reasoning turns with self-critique between turns.
  - A long-lived follow-up agent that keeps talking to the operator across days on the same case.
  - A gap analyser, run as a sub-agent, that looks for things the harness itself should improve.
  - A dev agent that makes the actual code change.
- State sits in three layers: in-memory caches, local JSON files mapping tasks to threads, and git-synced workspaces.
- Tools reach the outside world through Model Context Protocol servers, with health monitoring and automatic refresh attempts when a server goes bad.

## How runs are isolated and coordinated
- Every case gets its own worktree directory keyed by the case id, under a dedicated worktrees root.
- Nothing happens in the main checkout, so two investigations running at the same time cannot collide on the filesystem.
- Session transcripts are stored as git-backed line-delimited JSON with watermark injection. That is what makes resume work, and it is what lets a case move between machines.
- Coordination is by case identity rather than by locking. Each case owns its own directory, its own thread and its own transcript, so there is nothing to lock.

## What decides the work is good enough
- Nineteen gate functions grouped into three families.
  - Logical consistency checks, four of them, on whether the reasoning holds together.
  - Structural completeness checks, three of them, on whether the artefacts were actually formed.
  - Assertion ceilings, seven of them, that cap how confident the agent is permitted to sound.
- Confidence is computed, not claimed. It starts at one and is docked for every open question and every unchecked source, so an investigation with loose ends cannot present itself as settled.
- A failed gate is not a hard stop. It becomes a guard note prepended to the next turn, which forces another iteration instead of shipping something weak.
- Failure handling has three layers: deterministic guards first, then agentic self-healing but only above a seventy percent confidence threshold, then escalation to a human.

## What comes back, and what happens after merge
- Merge requests, plus live Slack status updates that cycle while work is in flight, and direct messages on terminal events such as a merge request opening or CI escalating.
- Structured logs go to a local agent log, so a run can be reconstructed after the fact.
- After merge the case workspace is kept rather than deleted, so a later case can look at what was done.
- Gap reports feed a weekly knowledge-updater pass that looks for patterns. Anything recurring three or more times becomes a proposed standard operating procedure.
- Approved improvements are turned into merge requests against the harness's own codebase. The system proposes edits to itself, which the operator then reviews.

## What they still do by hand
- Confirm the analysis before a merge request is generated.
- Filter the automated improvement suggestions, since not every recurring pattern deserves a rule.
- Approve every merge. No change reaches the main branch unreviewed.
- Review and apply standard operating procedure updates.
- Deal with hardware multi-factor prompts when tokens expire. This is deliberately left human-gated rather than automated.

## What broke or what they warn about
- Slack event delivery is not reliable enough on its own, which is why the poller runs alongside the socket connection and why dedup exists at all.
- Self-healing has to be bounded or it thrashes. CI auto-fix stops after three consecutive failures and escalates instead of trying a fourth time.
- Reviewer auto-reply needed author-aware deduplication, otherwise the agent answers the same comment twice.
- Token usage is tracked only loosely and there is no cost dashboard. The author says so plainly. It is the weakest part of an otherwise careful setup, and the first thing worth adding.

## Tool and platform stack
- Claude Code as the model runtime, spawned by systemd as transient sessions.
- Git worktrees for isolation, git repositories and local JSON files for state.
- Model Context Protocol servers for tool access, with health checks.
- Slack, GitLab, PagerDuty, Datadog, Jira and Confluence, Glean.

## Things worth copying
- One dispatch queue fed by several producers, with deduplication, instead of a single chat trigger. This is the change that removes the human from the start of the loop.
- Confidence as arithmetic with a hard ceiling, rather than a model saying it feels sure.
- Gate failures that inject a guard note and force another turn, instead of either passing or hard-failing.
- The three-layer escalation ladder: deterministic guard, then bounded self-heal above a confidence floor, then a human.
- Git-backed transcripts as the resume mechanism. It costs almost nothing to build and it is the difference between a run that survives a dead machine and one that does not.
- Keeping the case workspace after merge, so the next investigation has the last one to read.
- Bounding every self-healing loop with a small integer. Three CI failures, twenty turns. The numbers matter less than having them.

# AgentField — an open-source system that runs a hundred-plus agent invocations against one repo in nested retry loops

- Source: https://agentfield.ai/blog/beyond-vibe-coding (18 March 2026). Secondary: https://github.com/Agent-Field/SWE-AF
- Beyond Ray because: many issues run at once, each in its own worktree, with a dedicated merger agent for conflicts; execution is checkpointed so a crashed build can be resumed; verification gates sit between every stage and decide whether work advances; the whole thing is published under Apache 2.0.

## Who they are and what they build
- A small engineering team that works with Claude Code daily and turned their own workflow into a framework called SWE-AF.
- The blog post is a walkthrough of one real build, a compiler-ish project, with costs and failures shown.

## How work gets created and handed off
- A human supplies a product requirements document, and that is close to the last thing they type.
- A planner agent decomposes it into fifty to a hundred issues with explicit dependencies between them.
- Issues are arranged into a dependency graph, and issues at the same level are dispatched together.
- The whole run is triggered by a single API call to a local control plane.

## What runs the agent, and where
- A control plane exposed over REST that spawns agents, routes work and handles recovery.
- Roles are separate agents with separate models, so cheap models do cheap work and expensive ones do architecture.
- Every level boundary writes a JSON checkpoint, and there is an explicit resume path after a crash.

## How runs are isolated and coordinated
- Each issue gets its own git worktree on a named branch, one branch per issue.
- Three issues ran fully in parallel in the worked example, each touching different files.
- A merger agent resolves conflicts between levels with knowledge of what each branch was trying to do, rather than a blind text merge.
- A shared key-value memory spreads conventions and known failure patterns between agents.

## What decides the work is good enough
- Three nested loops.
  - Inner loop, per issue, up to five attempts, driven by test results and a code review verdict that can block.
  - Middle loop, an advisor that picks one of five typed recovery actions when the inner loop runs out.
  - Outer loop, a replanner that restructures the remaining graph when something is unrecoverable.
- Between levels there is a fixed sequence: merge, integration test, process debt, handle splits, replan, checkpoint.
- Work that cannot be finished is recorded as typed technical debt rather than silently dropped.

## What comes back, and what happens after merge
- Draft pull requests, plus execution artefacts including a cost breakdown by role.
- Deployment is out of scope. This is the honest gap in the setup.

## What they still do by hand
- Approve every draft pull request. The human role is described as architectural sign-off, not line-by-line review.

## What broke or what they warn about
- A deadlock in integration tests that burned a forty-five minute timeout and had to be parked as debt.
- A regression where a merged branch referenced modules that no longer existed, caught only on the second iteration.
- Cascading verification failures needing three rounds.
- Cost honesty: the demo run was over two hundred invocations for about a hundred and sixteen dollars, and they say plainly that this is too expensive to iterate on.

## Tool and platform stack
- Claude Code with per-role model selection across Haiku, Sonnet and Opus.
- Git worktrees, JSON checkpoints, a shared memory store, agent code review, automated test harnesses.

## Things worth copying
- A dependency graph of issues rather than a flat list, so parallelism falls out of the plan.
- A merger agent as a first-class role.
- Typed debt and typed recovery actions, so failure is data rather than a stuck run.
- Per-role cost reporting in the run artefacts.

# OpenAI's Codex team — an internal product built end to end by agents, plus the orchestrator spec they published afterwards

- Source: https://openai.com/index/harness-engineering/ (11 February 2026). Secondary: https://github.com/openai/symphony/blob/main/SPEC.md (April 2026). The main post returned a 403 to a direct fetch and was read through r.jina.ai.
- Beyond Ray because: agents open, review and often merge their own pull requests behind mechanical gates, with no human required; concurrent agents work the same repo in isolated worktrees with a deliberate merge policy; the published Symphony orchestrator polls an issue tracker, retries with exponential backoff, kills stalled sessions, caps turns per session and tracks tokens; both the harness and the spec are public code.

## Who they are and what they build
- An internal OpenAI team that spent five months building and shipping a production beta product.
- Roughly a million lines of code, with no line written by a human hand. Every pull request was opened by an agent.
- Symphony is the orchestration spec they later published, with an Elixir reference implementation.

## How work gets created and handed off
- In the internal build, an engineer describes a task in plain language and the agent takes it from there.
- On top of that sits a set of background Codex tasks that run on a recurring cadence without being asked.
- In Symphony, nothing is typed at all. A daemon polls the issue tracker every thirty seconds, sorts eligible issues by priority and age, and dispatches them.
- Behaviour is changed by editing a workflow file, which is reloaded without restarting.

## What runs the agent, and where
- Codex CLI driving the model, with the harness responsible for context, tools, boundaries and approvals.
- Symphony is a long-running daemon rather than a function that fires and hopes.
  - Retries use exponential backoff capped at five minutes.
  - Sessions with no activity for five minutes are killed and requeued.
  - A single turn times out after an hour.
  - Config is validated at startup and before every dispatch cycle, and bad config blocks new work.

## How runs are isolated and coordinated
- Each agent works in its own git worktree with its own throwaway observability stack.
- Symphony gives each issue a deterministic workspace path derived from the issue id, reused across runs, with a hard rule that the path must stay inside the workspace root.
- Global and per-state concurrency limits control how many agents run at once.
- Merge policy is deliberately loose: minimal blocking gates and short-lived pull requests, with flaky tests handled by a follow-up run rather than a permanent block.

## What decides the work is good enough
- Agents self-review, then request review from peer agents both locally and in the cloud, and iterate until every agent reviewer is satisfied.
- Custom linters, themselves written by agents, enforce architectural invariants mechanically. That is the machine-readable gate.
- Humans may review but are not required to.
- Symphony adds turn caps, twenty per session by default, and cumulative token accounting.

## What comes back, and what happens after merge
- Pull requests, and a real product that ships, breaks and gets fixed.
- Everything lives in the repo: code, tests, CI config, docs, design history, eval harnesses, review comments, dashboards.
- Deployment mechanics are not described, which is the thinnest part of the account.

## What they still do by hand
- Steer. Humans prioritise, turn vague feedback into criteria, validate outcomes and escalate when judgement is needed.
- Write learnings back into repository documentation so the next agent inherits them.

## What broke or what they warn about
- Entropy. Agents copy existing patterns including bad ones, so the codebase drifts.
- Their answer is scheduled garbage collection runs that refactor against stated golden principles.
- Symphony carries a blunt security warning: pointing agents at repos and trackers that contain sensitive or externally controlled content is dangerous, and it deliberately does not pick a hardening posture for you.

## Tool and platform stack
- Codex CLI, agent-written custom linters, Chrome DevTools Protocol for browser work.
- OpenTelemetry, with agents querying logs and metrics themselves.
- Symphony: workflow loader, config layer, issue tracker adapter, orchestrator, workspace manager, agent runner, structured logging with an optional HTTP API.

## Things worth copying
- Linters as the enforcement layer, because a rule an agent can run beats a rule written in prose.
- Scheduled garbage collection as a standing routine.
- Deterministic per-issue workspace paths, so a resumed run finds its old work.
- Stall detection and backoff, which is the single cheapest thing to add to a harness that currently has neither.

# Rejected candidates

- Zylos Research, agent-orchestrated software development: a synthesis of other people's systems. No first-person source, no stack or cost detail.
- Christoph Dalski, codecentric, autonomous development workflows with Claude Code (22 June 2026): genuinely first-person and the blueprint repository is public, but it is human-triggered with no durable orchestration, no cost caps and no post-merge story. At or below Ray.
- Sentry Seer and the Cursor automations cookbook: error monitoring to pull request is the right shape, but these are product pages for something you buy, not a team describing what they run.
- Anthropic's Code with Claude announcements on managed agents and routines: vendor launch material.
- Elastic search-labs self-correcting monorepo and Atlassian agentic pipelines: vendor tutorials on their own platforms.
- Assorted Medium and dev.to posts on replacing CI with an agent: single-repo experiments with no isolation, no gates and no orchestration.
- Open orchestrator directories and awesome-lists: not first-person sources.
- Trellis and Agent Orchestrator: promising worktree-based harnesses, but the material found was third-party write-ups rather than the builders describing their own system.
