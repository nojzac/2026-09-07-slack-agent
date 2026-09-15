# Lesson page rules (what the learner wants)

On 2026-09-06 the user said the per-lesson SOPs for Ray Amjad's Slack-agent course are a learning aid. They are trying to learn and understand the system so they can own and extend it later, not just reproduce Ray's steps.

**Why:** Ray builds by prompting Claude and accepting the output. Copying that blindly gives a system the user cannot explain or change. The user asks "why Vercel, why serverless, what does the private repo do" because they want a model, not a recipe.

**How to apply:** Every lesson SOP gets: a "Where this fits" grounding section that retitles the lesson by outcome; a Goal section; a Why section explaining each design choice Ray makes without stating; a glossary of new terms; a "how one message flows" mechanism walk; a "what Claude wrote for you" code walk; then steps grouped into phases; settings, done, what broke, downloads. Everything is nested collapsible dropdowns so the collapsed view reads as a summary. Section headers colored, nested headings in a complementary color. No quizzes or self-tests: the user explicitly declined those. Sample template: scratchpad sop-lesson-04.html (session 3e34d0cf). Related:

Template rules adopted from the v1 review: only the grounding section, Steps and Done are mandatory; omit empty sections rather than render shells; phases only when there are 5 or more steps; the message-flow diagram grows cumulatively lesson to lesson; short orientation lessons (18, 21) get a short page. Each page notes where the fleet standard changes Ray's steps (e.g. lesson 04: git already exists; secrets go to 1Password, then Vercel).

Open calls on v3 (ask before changing): it has five self-check questions in section 06; it loads Google Fonts.

## Template and conventions (decided 2026-09-15, revised after review)

`sops/lesson-04/index.html` is the template for every lesson page. One folder per lesson:
`sops/lesson-NN/index.html`, with any debrief pages and an `archive/` for drafts beside it.

The first version of that page failed a cold reader — no purpose statement, headings written from
the author's experience ("The random number doesn't matter", "When nothing happens"), and all the
steps buried in one collapsed section so the sequence was invisible. The rules below exist to stop
that recurring. They follow Diátaxis, Google's and Microsoft's style guides, and NN/g.

### Required order

1. **Front matter, never collapsed** — kicker, `<h1>` naming the outcome, standfirst, a facts row
   (video length / real time / what you end up with), then, each in its own card:
   *What you'll have at the end* (with a picture of the finished result),
   *Who this is for, and what it assumes*,
   *Why this lesson exists* (with the course-arc diagram, this lesson highlighted),
   *How this page is laid out* (the map), and *Before you begin*.
2. **Part 1 · Understand what you're building** — concept sections, badge UNDERSTAND.
3. **Part 2 · Build it** — one section per step, badge DO NOW, never collapsed.
4. **Part 3 · Keep for later** — code walk, troubleshooting, done checklist, sources; badge REFERENCE.

### Headings

- Descriptive and front-loaded; they must make sense to someone who has never done the work.
- No jokes, no teasers, no headings that only land once you have finished the lesson.
- Sentence case, parallel within a level. Task sections take a bare infinitive ("Create and install
  the Slack app"); concept and reference sections take noun phrases.
- Name the subject in the heading: "The five services you'll use: Slack, Vercel, GitHub, 1Password
  and GitHub Actions", never "Five services, and why each one has to be there".
- Every section carries a subtitle saying what it gives the reader, and a badge matching its part.
- Step sections are numbered "Step N of M — …". This deliberately departs from Google's "don't put
  sequence numbers in headings", because invisible sequence was the problem being fixed.

### Collapsing

- Front matter and every step section: always visible, not collapsible. Steps never collapse —
  collapsed content breaks find-in-page and printing, and NN/g notes it "diminishes awareness".
- Part 1 and Part 3 sections: collapsible but open by default.
- Only `+` explanation boxes start closed, each with a descriptive summary line.
- Print stylesheet forces everything open.

### Diagrams

Inline SVG only — no external assets, no web fonts. Inline attributes rather than classes, unique
marker ids per diagram, `<title>` first child, minimum font-size 11. One shared palette, with a
fixed colour per service (Slack #4a154b, Vercel #15171c, GitHub #24292f, 1Password #1a6ce7,
Actions/success #0b6b3a) and per part (understand #7a3d9c, do #1f4fd8, reference #616a77).

Every lesson page gets, at minimum: a picture of the finished result, the course arc, and a
progress strip repeated at the head of each step section showing where the reader is.

### Content rules

- Steps record what was actually done, in the order it was done. A page is written after the
  lesson, not before.
- Each step section ends with a **Checkpoint** stating the observable result, so a reader can tell
  whether to continue.
- Silent failures get a callout at the step where they bite, not in a debrief afterwards.
- Where the workshop departs from Ray's video, say so in a `.ray` note at that step.
- Metaphors are welcome where they carry weight; cleverness in headings is not.
- No quizzes or self-tests (declined 2026-09-06). No Google Fonts.
