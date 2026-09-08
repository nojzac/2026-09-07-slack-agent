# Lesson page rules (what the learner wants)

On 2026-09-06 the user said the per-lesson SOPs for Ray Amjad's Slack-agent course are a learning aid. They are trying to learn and understand the system so they can own and extend it later, not just reproduce Ray's steps.

**Why:** Ray builds by prompting Claude and accepting the output. Copying that blindly gives a system the user cannot explain or change. The user asks "why Vercel, why serverless, what does the private repo do" because they want a model, not a recipe.

**How to apply:** Every lesson SOP gets: a "Where this fits" grounding section that retitles the lesson by outcome; a Goal section; a Why section explaining each design choice Ray makes without stating; a glossary of new terms; a "how one message flows" mechanism walk; a "what Claude wrote for you" code walk; then steps grouped into phases; settings, done, what broke, downloads. Everything is nested collapsible dropdowns so the collapsed view reads as a summary. Section headers colored, nested headings in a complementary color. No quizzes or self-tests: the user explicitly declined those. Sample template: scratchpad sop-lesson-04.html (session 3e34d0cf). Related:

Template rules adopted from the v1 review: only the grounding section, Steps and Done are mandatory; omit empty sections rather than render shells; phases only when there are 5 or more steps; the message-flow diagram grows cumulatively lesson to lesson; short orientation lessons (18, 21) get a short page. Each page notes where the fleet standard changes Ray's steps (e.g. lesson 04: git already exists; secrets go to 1Password, then Vercel).

Open calls on v3 (ask before changing): it has five self-check questions in section 06; it loads Google Fonts.
