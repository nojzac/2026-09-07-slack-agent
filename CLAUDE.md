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
- Course inputs live in `course/` (transcripts, downloads, lesson-page rules).
  Lesson pages are MADE here, in `sops/lesson-NN/`, one folder per lesson:
  `index.html` is the SOP, with any debrief/retrospective pages and an
  `archive/` for superseded drafts beside it. Broader research about agents in general stays in
  `~/projects/2026-09-04-ray-amjad-mcp`; do not copy it here.

## How lessons are followed
- Each lesson gets a learning page at `sops/lesson-NN/index.html` (HTML, open in a browser), built
  from `course/transcripts/` following `course/LESSON-PAGE-RULES.md`. Build one,
  show it, get a yes, then continue. Follow the page's Steps section when building. The verbatim prompts Ray pastes are in the page; paste them
  as written unless the page says otherwise.
- Ray's lesson 04 has Claude create the git repo and Vercel project. Here the
  folder and git repo already exist; skip `git init`, keep the rest.
- Ray's agent is named Joestar. Noj's agent name: Joestar (same).
- After finishing a lesson: commit, update RESUME.md with the lesson done and the
  next one, and record any new credential location in README.md under Access.

## Reference
- Course transcripts: `course/transcripts/` (INDEX.md and DOWNLOADS.md there)
- Ray's code at the end of any lesson: Ray's public code is at https://github.com/ray-amjad/slack-agent-course (tags lesson-02-end to lesson-15-end). No local clone is kept (deleted 2026-09-08); clone it when needed: `git clone https://github.com/ray-amjad/slack-agent-course /tmp/ray-course`.
  There is no fixed offset between video number and tag; look the lesson up in
  `course/transcripts/DOWNLOADS.md`, then confirm by reading the tag's contents. Tags stop at lesson-15-end.
- What to build beyond the course: `course/beyond-the-course.md`
