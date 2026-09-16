# How lessons are followed

Each lesson gets a learning page at `sops/lesson-NN/index.html` (HTML, open in a
browser), built from `course/transcripts/` following
`course/LESSON-PAGE-RULES.md` and `sops/DESIGN-SPEC.md`. Build one, show it, get
a yes, then do the lesson. Follow the page's Steps section when building. The
verbatim prompts Ray pastes are in the page; paste them as written unless the
page says otherwise.

One folder per lesson: `index.html` is the SOP, with any debrief pages and an
`archive/` for superseded drafts beside it. `sops/lesson-04/index.html` is the
template for every later page.

After finishing a lesson: commit, update `RESUME.md` with the lesson done and the
next one, and record any new credential or access grant in `README.md` under
Access.

## Where this workshop departs from Ray
- Ray's lesson 04 has Claude create the git repo and Vercel project. Here the
  folder and git repo already exist; skip `git init`, keep the rest.
- Ray's agent is named Joestar. Noj's agent name: Joestar (same).

## Reference
- Course transcripts: `course/transcripts/` (INDEX.md and DOWNLOADS.md there).
- Course inputs live in `course/`. Broader research about agents in general stays
  in `~/projects/2026-09-04-ray-amjad-mcp`; do not copy it here.
- Ray's code at the end of any lesson: https://github.com/ray-amjad/slack-agent-course
  (tags `lesson-02-end` to `lesson-15-end`). No local clone is kept (deleted
  2026-09-08); clone it when needed:
  `git clone https://github.com/ray-amjad/slack-agent-course /tmp/ray-course`.
  There is no fixed offset between video number and tag — look the lesson up in
  `course/transcripts/DOWNLOADS.md`, then confirm by reading the tag's contents.
- What to build beyond the course: `course/beyond-the-course.md`
