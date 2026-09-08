# RESUME — cold-start note

## Where things stand (2026-09-07)

Skeleton created. No code, no Slack app, no Vercel project, no GitHub remote yet.
Git is initialised locally with one commit.

## Next step: lesson 04, "Get a dumb bot answering in Slack"

1. Open `sops/sop-lesson-04.html` in a browser (copy it in from the research
   project's scratchpad or `sops/` folder if it is not here yet).
2. Prerequisite check from the page's "Before you start": test Slack workspace
   from lesson 03, Claude Code, GitHub and Vercel accounts, `gh` and `vercel`
   CLIs logged in.
3. Choose the agent's name and record it in CLAUDE.md.
4. Run `claude` in this folder and paste the lesson 04 prompt from the page.
5. When Claude asks to `git init` and set up Vercel: git already exists, so ask
   it to push to a new private GitHub repo and create the Vercel project only.
   The first push needs Noj's explicit go.
6. Put the Slack signing secret and bot token in 1Password
   (`Projects/2026-09-07-slack-agent`, fields `signing_secret` and `bot_token`),
   then set them in Vercel as Production environment variables.
7. Fill in README.md "Access" with the Slack app name, Vercel project, and repo.

## After lesson 04
Lesson 05 connects Claude Code in an E2B sandbox. Its page will be in `sops/`
when the research project finishes it.

## Open decisions
- Agent name (Ray uses Joestar).
- Whether lesson pages are copied here or only linked from the research project.
