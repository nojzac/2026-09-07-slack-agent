# Instructional design review: sop-lesson-04.html

Reviewed file: `/private/tmp/claude-501/-Users-nojz-projects-2026-09-04-ray-amjad-mcp/3e34d0cf-d11f-4730-ba11-702dfd8949a9/scratchpad/sop-lesson-04.html`

Also checked two of the shortest transcripts to test the template against brief lessons: lesson 03 (88 seconds) and lesson 18 (21 seconds), in `/Users/nojz/projects/2026-09-04-ray-amjad-mcp/autonomy/transcripts/slack-agents/`.

No edits were made to any file other than this report.

---

## Keep

**The "Where this fits" chain.** The row of five boxes with the current lesson highlighted is the best thing on the page. It answers "why am I doing this" before any instruction arrives, and it costs one line. Every lesson should have it.

**Two conversations, two secrets.** The bullet under "Two things to notice" is the moment the mental model actually lands. It explains why there are two secrets instead of asking the reader to memorise two secrets. That is the exact register the rest of the "Why" section should aim for.

**The verify, dedupe, handle, acknowledge skeleton.** Naming the shape of the file, then saying every later lesson only changes "handle", is the single most transferable sentence in the document. It converts one file into a pattern.

**Stating the real time cost.** The header says 4 minutes, the Steps summary says about 15. That honest gap prevents the classic "I must be doing this wrong" spiral. Make it a required field in the template.

**The numbering trap.** Catching that repo tags run two behind the videos, and that the site's own Downloads link points at code from the next lesson, saves a genuinely confusing hour. This is the kind of thing a learning aid exists for.

**Verbatim prompt boxes.** Distinct styling, monospace, click-to-select-all. It is clear what is quoted from Ray and what is your own words.

---

## Change

### 1. High. Move "Before you start" to second position, directly after "Where this fits".

It currently sits seventh, after four sections of concept. It is the only section that can send the reader away from the desk for twenty minutes, and it does exactly that: the note about the two command line tools being assumed but not shown on camera is a real stop-and-install. Nobody should read four sections before discovering it.

### 2. High. Move "Words you will meet" to the bottom and rename it "Look up a word".

Eight definitions in a row, before any of the terms have appeared in a sentence the reader cares about, is the least effective place to put them. The definitions already cite step numbers, which is a giveaway that this is a reference index, not reading. The flow section introduces the signing secret, the bot token and the endpoint in context and does it better. Put the glossary last and let the flow do first exposure.

### 3. High. Add a section called "Where you would change it".

This is the biggest gap against the stated goal of owning and extending the agent. The page explains what the code does but never names the seams. Three or four bullets, each naming a change and the place it lands:

- reply with different text, change the handle branch
- trigger on a direct message instead of a mention, change the manifest scopes, the event subscription, and the event type check
- change the number range, the two optional environment variables already mentioned

This turns a description into something the reader can act on later.

### 4. High. Flip the open-by-default choices.

Right now "Steps" and its four phases are open while "Why" and "How one message flows" are shut. That silently says the page is a recipe with optional commentary, which is the opposite of what it is for. Open "Where this fits", "Why" and "How one message flows"; close "Steps" at the section level. The collapsed view then reads as an explanation, and the reader opens the recipe when they reach the keyboard.

### 5. High. Scope the Expand all and Collapse all buttons, and drop the inline onclick.

They currently call `document.querySelectorAll('details')`, which is fine for one lesson and useless once 15 lessons share a page with an index. Scope them to the enclosing lesson, and add a small expand control per section. Also move the handler out of the `onclick` attribute so a content security policy does not silently kill both buttons when this is hosted.

### 6. High. Give every section a stable id and open ancestors on a URL fragment.

Nothing on the page has an id, so nothing can be linked to. Across 15 lessons you will want to link from lesson 12 back to the flow diagram in lesson 04. Related: content inside a closed `details` is not found by find-in-page in Safari or Firefox, so a reader searching for "signing secret" may get nothing. Adding `hidden="until-found"` on collapsed bodies, or a small search box that opens matches, fixes it.

### 7. Medium. Cut the separate "Goal" section into "Where this fits".

Goal says the bot replies with a random number, runs on Vercel, no agent yet. "Where this fits" already says all three across "What bot foundations means" and "What you can do after this". Two sections repeating each other on page one of fifteen becomes thirty sections of repetition. Keep one bolded outcome line at the top of "Where this fits" and delete the rest.

### 8. Medium. Replace the nine second-level colours with one.

The nested heading colours are all pulled from an orange and brown band regardless of their parent: mustard under plum, rust under teal, tan under grey. They read as muddy rather than complementary, and in light mode the step headings in particular sit awkwardly on their own tint. The job of the second colour is to say "this is a level down", not "this is a different topic". One neutral accent used at every nested level does that job better and removes nine palette decisions per lesson.

### 9. Medium. Two colours are used twice on one page.

"Goal" and "Words you will meet" are both teal. "What Claude wrote for you" and "Settings and secrets" are both indigo. If colour identifies a section type across the course, a repeat inside one page breaks the code before it is learned. Fix by assigning one fixed colour per section type in the stylesheet.

### 10. Medium. Rename "What broke for Ray and how he fixed it" to "When it goes wrong", with Ray's snags as a subsection.

As written it is anecdote, organised by what happened to somebody else. A reader stuck at 11pm searches by symptom. Lead with symptoms: no green tick, green tick but no reply, two replies to one mention, an error about a missing value. Some of these answers already exist but are scattered into step 9 and the code walkthrough. Pulling them into one place costs nothing and this section will carry real weight in later, harder lessons.

### 11. Medium. Mark forward references consistently.

The "Why" section discusses the three second acknowledgement, the thirteen minute limit and the cloud sandbox, all of which belong to lesson 05. It is the right material in the right place, but a reader can easily think there is something to do now. Prefix such bullets with a consistent muted lead-in, "Later:", used the same way in all fifteen lessons.

### 12. Medium. Move the palette and layout into one shared stylesheet, and replace the per-section inline custom properties with classes.

Each section currently carries `style="--c:var(--plum);--c2:var(--plum2)"`. Across 15 lessons that is about 150 hand-maintained inline attributes, and the whole stylesheet is duplicated 15 times. A class per section type, defined once, makes a palette change a one-line edit and makes the combined index page possible.

### 13. Medium. Add a manual dark mode override.

The theme is driven only by `prefers-color-scheme`. If this ever lands in a viewer that stamps a theme attribute on the root element, or if the reader wants to force one, nothing responds. Mirror the dark block under a `data-theme` selector as well as the media query.

### 14. Low. Make the whole summary row clickable at every level.

Section headers are full width bars, but step and point summaries are `display:inline-block`, so the click target is only as wide as the words. It is a small inconsistency that becomes annoying on a phone. Also give summaries a visible focus outline, since `list-style:none` plus custom markers can leave keyboard users with no indication of where they are.

### 15. Low. Add a copy button to the verbatim prompt boxes, and drop the filesystem path bar.

The prompts are the most-used elements on the page and select-all-on-click is not discoverable. The path bar at the top is review scaffolding and should not survive into the finished set.

---

## Consider

**Make "How one message flows" cumulative rather than per-lesson.** By lesson 15 the reader needs a picture of the whole system, not fifteen unconnected deltas. Keep the same numbered flow on every page, growing it as features land, and highlight the rows this lesson added or changed. It becomes the spine of the course and costs one section that is already written.

**A "reading" and "at the keyboard" toggle.** Two buttons that set different open states: reading opens the concept sections and closes the steps, at the keyboard does the reverse. It solves the open-by-default question without picking a side, and it suits a document that will be read twice.

**Make most sections optional, and never render an empty one.** Lesson 03 is 88 seconds of making a Slack workspace. Lesson 18 is 21 seconds of chapter introduction with nothing to build at all. Against that, the current 12 section list is mostly empty shells, and an empty accordion teaches the reader that sections are decorative. Suggested rule: only "Where this fits", "Steps" and "What done looks like" are mandatory. Everything else appears only when it has content. Also skip phases entirely when there are fewer than about five steps, since Phase A containing one step is pure overhead.

**A separate short shape for non-build lessons.** Lessons 18 and 21 are orientation, not construction. Either give them a stripped page of "Where this fits", "Why this chapter exists" and "What is coming", or fold each chapter's introduction into the first real lesson of that chapter. Fifteen pages of the same weight will make the two-minute ones feel broken.

**One small accuracy flag.** Step 9 says Event Subscriptions "sits under MCP Servers" in the Slack left menu. That is a description of Slack's user interface on the day the video was recorded, and it is the kind of detail that goes stale fastest. Keep the instruction, soften the locator.

---

## Suggested section order for the template

1. Where this fits (open) — chain, plus the one-line outcome absorbed from Goal
2. Before you start (open when it has content, omitted when it does not)
3. Why it works this way (open)
4. How one message flows (open) — cumulative, this lesson's changes highlighted
5. Steps (closed by default in reading mode; phases only when there are five or more steps)
6. What Claude wrote for you / what changed in the code
7. Where you would change it (new)
8. What "done" looks like
9. When it goes wrong (symptoms first, Ray's snags as a subsection)
10. Settings and secrets (omitted when nothing new)
11. Downloads
12. Look up a word (the glossary, moved here)
