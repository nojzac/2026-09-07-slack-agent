# Adding Codex

- class: slack-agents
- chapter: 0 to 1
- title: Adding Codex
- url: https://www.agenticcoding.school/v/X1vbLU4n
- durationSeconds: 159
- fetched: 2026-09-05
- transcriptChars: 2953

## Description (video page text, NOT transcript; may contain links)

The prompt:

```
Add the OpenAI Codex CLI to this repo as a cross-model second opinion for the
agent — so it can get an independent review/challenge/consult from a non-Claude
model while working in its sandbox.

This repo is a Slack bot that runs a prompt through Claude Code inside a
throwaway E2B sandbox and replies in-thread. I'm describing the change by ROLE,
not by filename, because your copy may differ slightly from the one I'm looking
at. Start by orienting yourself:

  DISCOVERY (do this first, and tell me what you found before you edit)
  a) The E2B template definition — the module that builds the sandbox image,
     exporting something like `Template().fromNodeImage(...)` with a chain of
     .aptInstall/.npmInstall/.runCmd calls and a template name constant.
     Likely e2b/template.js, built by an npm script like `template:build`.
  b) The run module — the one that calls `Sandbox.create(...)` and then
     `sandbox.commands.run("... | claude -p --output-format stream-json ...")`.
     Likely lib/claude-sandbox.js. Find its existing helpers for preparing the
     box (there is probably a `setUpGithub` or similar) and copy their shape.
  c) The skills folder shipped into the sandbox, probably toolkit/skills/, with
     one directory per skill each containing a SKILL.md. Find the loader that
     uploads it so you know whether skills need a template rebuild (they
     probably don't — check).
  d) .env.example, and wherever the README lists env vars / sandbox
     capabilities.
  If any of these don't exist or are shaped differently, STOP and tell me what
  you found instead of guessing.

Then make four changes:

1. THE BINARY — bake it into the sandbox image (a).
   Add a global npm install of `@openai/codex` next to the existing global
   install of @anthropic-ai/claude-code, using whatever helper that chain
   already uses (e.g. `.npmInstall("@openai/codex@latest", { g: true })`).
   Match the existing version-pinning convention: if claude-code is pinned,
   pin codex; if it's @latest, use @latest.
   Two constraints:
     - If the chain ends in `.setStartCmd(...)`, that call CLOSES the builder —
       your addition must come before it.
     - If (and only if) this image installs Node somewhere non-standard and
       symlinks it onto PATH, an unqualified `npm i -g` will install OFF PATH
       and still report success. In that case pass `--prefix /usr/local` and
       verify with `codex --version` in the same step. On a stock Node base
       image this doesn't apply.
   This requires a template rebuild to take effect — call that out.

2. THE CREDENTIAL AND CONFIG — written per sandbox, not baked in (b).
   Codex authenticates from a file at ~/.codex/auth.json. The whole contents of
   that file live in ONE env var, CODEX_AUTH_JSON, and get written into each
   sandbox.
   Add a helper (`setUpCodex(sandbox)` or whatever matches local naming)
   alongside the existing setup helpers, called from the main run function
   before Claude is spawned. It must:
     - read process.env.CODEX_AUTH_JSON; if unset, log one line and return.
       Follow whatever "optional integration" convention this repo already uses
       for its other optional env vars — unset means "no codex here", not
       "broken".
     - JSON.parse it purely as a validity check, and warn + return if that
       throws. This makes a corrupt secret show up in OUR logs instead of as a
       baffling codex error inside the box.
     - write it to /home/user/.codex/auth.json (adjust the home path if this
       sandbox's user differs).
     - write /home/user/.codex/config.toml containing exactly:
         model_reasoning_effort = "high"
         approval_policy = "never"
         sandbox_mode = "danger-full-access"
       Setting this GLOBALLY is what lets the skill invoke codex with no
       approval flags at all. Full access is safe for the same reason Claude
       already runs with --dangerously-skip-permissions here: the microVM is the
       isolation boundary, not the CLI's own sandbox.
     - chmod 700 the directory and 600 the auth file.
     - never throw — wrap it and log. A broken codex seed must not stop the bot
       from answering Slack.
   CRITICAL: the credential goes in as a FILE ONLY. Do NOT add CODEX_AUTH_JSON
   to the `envs` object of the claude run. It belongs to the codex process that
   reads it, not to the shell environment of every Bash command the model runs.

3. THE SKILL — toolkit/skills/codex/SKILL.md (c).
   Frontmatter with `name: codex` and a description that fires on "codex
   review", "second opinion", "have codex check this", "challenge this code",
   "ask codex". State plainly in the body that the agent HAS live authenticated
   access and must not claim codex isn't set up.
   Three modes: review (independent diff review with a PASS/FAIL gate),
   challenge (adversarial "find how this breaks in production"), consult (ask
   anything). Include this CLI trivia — every item is a real failure that has
   bitten this before, so don't trim them:
     - ALWAYS end the command with `< /dev/null`. Codex slurps stdin when it
       isn't a TTY and will sit forever waiting for EOF.
     - Run it from INSIDE a git repo. Outside one, codex refuses but still
       EXITS 0 — so check the output, not the exit code.
     - Never `--json` (buffers and hangs). Never `--enable web_search_cached`
       (removed; silent exit).
     - `codex review` cannot take a prompt together with `--base`/`--commit` —
       the CLI errors out. Run it promptless; its built-in review mandate is
       already good. Anything with a custom focus goes through
       `codex exec "<prompt>"` instead.
     - Verdict rule: any `[P1]` finding => FAIL; only `[P2]` or none => PASS.
     - Do NOT pass `-s` or `--dangerously-bypass-approvals-and-sandbox`, and
       don't restate `-c model_reasoning_effort` — config.toml sets both
       globally. The one worthwhile override is `xhigh` on a genuinely large or
       subtle change.
     - For a diff review, resolve the base branch first (gh pr view's
       baseRefName, else the repo's default branch, else main) and `git fetch`
       it — a stale origin/<base> reviews already-merged commits too.
     - Silent exit (codex exits 0 echoing the prompt with no response block):
       retry once after ~10s, then report it as a transient codex issue rather
       than inventing a verdict.
     - Codex runs full-access, so it CAN write files. Its jobs are
       review/challenge/consult only; anything that changes the repo is the
       agent's own job.
     - If codex fails to authenticate, do NOT work around it (no `codex login`,
       no API key) — tell the user the CODEX_AUTH_JSON secret is missing or
       stale and needs re-pasting from a fresh local ~/.codex/auth.json.
   TIMEOUT — this is the part you must adapt to THIS repo rather than copy.
   Find the per-run timeout (an env var like CLAUDE_TIMEOUT_MS, and the
   serverless function's maxDuration) and work out the actual budget. The whole
   turn — Claude's reasoning, the codex call, and posting the answer — lives
   inside it. Write a concrete minute figure into the skill that leaves clear
   headroom, and tell the agent to prefer a single-commit review
   (`codex review --commit "$(git rev-parse HEAD)"`) over a broad multi-commit
   one, so a review can't consume the whole turn and leave the thread with
   nothing. Tell me what numbers you found and what you chose.
   REPORTING — this agent answers in Slack, not a terminal. The skill must say:
   don't dump raw codex logs; lead with the verdict, then each finding as
   file:line plus the one-line problem, preserving codex's own wording; trim
   token counts, session ids and progress spam. Then add a short "My read:"
   line — where the agent agrees and where it thinks codex is wrong, and never
   silently drop a P1 it disagrees with. Check how this repo streams progress
   and posts its reply before writing this section; do not invent commands the
   sandbox doesn't have.

4. DOCS (d).
   Add CODEX_AUTH_JSON to .env.example in the optional block: paste the whole
   contents of your local ~/.codex/auth.json on a single line; unset simply
   means no codex. Update the README wherever it enumerates env vars or what
   the sandbox can do.

Match the surrounding code style exactly — module system, quoting, and above all
comment register: if the existing comments explain at length WHY a line exists
and what broke without it, write yours the same way rather than restating what
the code does.

Do not build the template or deploy. Finish by telling me: what you found in
discovery, the timeout numbers and the codex budget you chose, the exact
commands I need to run, and the env var I need to add to my hosting provider.
```

## Transcript

Okay, so in this video we will be adding Codex into our sandbox as well, and specifically getting Claude code in our sandbox to control Codex. Now you may already be doing this in some way. One of the ways you may be doing this is by having Codex installed and then getting Claude to basically do the codex -p with a prompt. And because Claude doesn't know by default how it should be doing this and some of the capabilities of Codex, I like to use a skill for this. And I do have a previous video about the Codex consult skill as well. So I will make a new file over here which is Codex/skill.md. And then inside of this I will paste in this skill. And this basically tells it like how it can get a second opinion from a different AI. So this will be down below if you do want to use it as well, this skill. But now we need to package up Codex inside of our sandbox image template. And also add codex-auth.json. And also log it into our Codex account as well. You may want to use API key API billing for this, but I will focus on using it with your Codex account. So this prompt will be down below, you can paste it into your chat. And it will basically say like, add OpenAI Codex CLI, blah, blah, blah. And it will give it a bunch of things that it should do. And then you can get it to do the full task lifecycle as well. Then you can get it to commit push alongside the skill and then test it out to make sure that Codex is working properly. And of course, the final source code for this will be down below if you do find yourself struggling with this. So I use this pretty extensively when it comes to adding new features. So you can see that in my real Slack bot over here for Percy, I basically told it, hey, can you add this brand new feature to HyperWhisper? And then it went through 2 rounds of review and also got a review from Codex as well. And that's because it was using the skill which helped to trigger Codex -p in the background to then do a review. You may also want to do this with any other AI tools. So you may be using like Cursor or Gemini or something else. You can basically make a skill and then, and then have it installed onto the sandbox for you as well. And the way it would end up being installed on the sandbox is basically for the E2B template over here, it will add a new line saying npm install openai/codex@latest. So anyways, I'll come back to video once this has been implemented and tested. Now during this process, it's worth bearing in mind that you should have Codex installed locally because Claude will read through your .codex or .json file and automatically add it to Vercel for you. And now we can see that it did an end-to-end test where it automatically verified that Codex is now working. So this means that we can have Codex reviewing our code in addition to different Claude subagents as well.
