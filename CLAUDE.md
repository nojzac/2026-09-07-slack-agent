# CLAUDE.md — how to work in this project

## What this is
The code for Noj's own Claude-in-Slack agent, built by following Ray Amjad's
"Slack agents" course. Read README.md first, then RESUME.md for where things stand.

## Hard rules
- Secrets live in 1Password only. Never write a `.env` file or any file with a
  secret value. `.env.op` holds `op://` references and is committed. Run
  anything that needs secrets through `op run --env-file=.env.op -- <command>`.
  Vercel's environment variables are the deploy-side copy; set them in Vercel's UI.
- Never commit a file over 10 MB. The pre-commit hook enforces this.
- No push to any remote without Noj's explicit go.
- Never modify `~/projects/ray-amjad-slack-agent-course`. It is a read-only
  reference clone of Ray's code.
- Do not put research or course notes here. They belong in
  `~/projects/2026-09-04-ray-amjad-mcp`.

## How lessons are followed
- Each lesson has a learning page in `sops/` (HTML, open in a browser). Follow
  its Steps section. The verbatim prompts Ray pastes are in the page; paste them
  as written unless the page says otherwise.
- Ray's lesson 04 has Claude create the git repo and Vercel project. Here the
  folder and git repo already exist; skip `git init`, keep the rest.
- Ray's agent is named Joestar. Noj's agent name: (decide in lesson 04 and record here).
- After finishing a lesson: commit, update RESUME.md with the lesson done and the
  next one, and record any new credential location in README.md under Access.

## Reference
- Course transcripts: `~/projects/2026-09-04-ray-amjad-mcp/autonomy/transcripts/slack-agents/`
- Ray's code at the end of any lesson: `git -C ~/projects/ray-amjad-slack-agent-course show lesson-NN-end:<path>`
  (tags run two behind video numbers).
- What to build beyond the course: `~/projects/2026-09-04-ray-amjad-mcp/autonomy/05-beyond-ray.md`
