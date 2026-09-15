# Lesson page design spec

Applies to `sops/lesson-NN/index.html`. Companion to `course/LESSON-PAGE-RULES.md`, which covers
structure and wording; this file covers what the page looks like and how it is navigated.

Status: agreed 2026-09-15, not yet implemented. Three pieces of work outstanding, listed at the end.

---

## 1. The problem this solves

Everything on the page was distinguished by one weak signal — a near-white border (`#e2e6ec`).
Headings differed only in size; boxes differed only in a border you could barely see. The page read
as a single grey slab, and a reader could not tell a section from a sub-heading from an explainer
box without reading the words.

The fix uses three signals at once for every level: **hue** (which part you are in), **shade**
(how deeply nested), and **geometry** (size, indent, border weight). Colour is never the only cue.

---

## 2. Hue says *where*; shade says *how deep*

### One hue per part

A part is the only place the hue changes. Everything inside inherits it.

| Part | Hue | Value |
|---|---|---|
| Part 1 · Understand what you're building | violet | `#7a3d9c` |
| Part 2 · Build it | blue | `#1f4fd8` |
| Part 3 · Keep for later | slate | `#4a5766` |

Implemented as `--pc` on the part wrapper, inherited by its sections. Service colours (Slack
`#4a154b`, Vercel `#15171c`, GitHub `#24292f`, 1Password `#1a6ce7`, Actions `#0b6b3a`) are
unaffected — they identify a service inside diagrams and tables, not a level.

### Four levels, deepening inward

| Level | What it is | Surface | Heading | Geometry |
|---|---|---|---|---|
| H1 | Page title | page background | near-black `#15171c`, 36px | — |
| L1 | Part header | page background | part hue, 25px, uppercase kicker above | 3px hue rule beneath |
| L2 | Section card | white `#fff` | hue-tinted `#2a2f38`, 20.5px | 1px `#ccd4e0` border, 4px hue left edge, soft shadow |
| L3 | Sub-heading (`h3`) | hue at **6%** | part hue, 17.5px | full-width band inside the card, 10px radius |
| L4 | Explainer box (`+`) | hue at **13%** | part hue, 15px | inset 14px, 3px hue left rule |

Tints are the part hue mixed with white — `color-mix(in srgb, var(--pc) 6%, #fff)` and `13%`.
Nesting therefore gets darker as it goes inward, and the hue tells you which part you are in even
after scrolling past its header.

### Why only lightness varies with depth

The earlier instructional-design review of draft v1 found the nested colours "read as muddy —
mustard under plum, rust under teal", because every level introduced a *new* hue. Here depth
changes lightness only. One hue per part, three shades of it.

---

## 3. Make the lines visible

- Borders and dividers: `#e2e6ec` → **`#ccd4e0`**. Still quiet, but present.
- Section cards get `box-shadow: 0 1px 3px rgba(20,25,35,.06)` so they read as objects on the page
  rather than regions of it.
- Space between cards (28px) is larger than space within them (14px), so grouping is legible before
  a word is read.
- Code blocks keep the dark `#15171c` background. They are already the strongest anchor and need no
  change.

---

## 4. Semantic colour outranks structural colour

Callouts carry meaning, not position, and must stay louder than nesting:

| Callout | Border | Background | Meaning |
|---|---|---|---|
| `.danger` | `#a32020` | `#fdeeee` | a silent failure that will cost you time |
| `.callout` | `#8a5a00` | `#fff8e8` | a caution worth reading before acting |
| `.checkpoint` | `#0b6b3a` | `#eefaf2` | the observable result at the end of a step |
| `.win` | `#0b6b3a` | `#eefaf2` | you have achieved the thing |
| `.metaphor` | part hue | hue at 5% | an explanation by analogy — structural, so it takes the part hue |
| `.ray` | `#8f98a3` | `#f4f6f8` | where this workshop departs from Ray's video |

Structural tints stay pale (6%, 13%) precisely so these keep priority. "This is a warning" must
always read louder than "this is nested".

---

## 5. Accessibility and print

- Body text stays `#2b3038` or darker on every tint; nothing relies on hue alone.
- Every level differs in at least two non-colour ways (size, indent, border, surface).
- Print: tints flatten to white, borders stay, all collapsed content opens, nav hidden.

---

## 6. Navigation widget

Agreed from the prototype (`auto` mode chosen).

- Fixed left panel, 288px, generated from the DOM at load — never a hand-maintained list, because
  this template is reused across 13 more lessons.
- **Auto depth**: parts and sections always visible; sub-headings and explainer boxes appear only
  inside the section currently being read, and collapse again on the way out.
- "You are here" highlighting follows scroll; clicking a row opens any collapsed ancestors before
  scrolling to the target.
- Hide with `‹`, Escape, or swipe left; reopen from the strip at the left edge or by swiping right.
  Hidden state and depth persist per page in `localStorage`.
- Row counts for reference: 17 at depth 2, 25 at depth 3, 44 at depth 4.
- Hidden when printing and below 900px, where it becomes an off-canvas drawer.

---

## 7. Per-heading accordions

Requested explicitly, and it overrides the research default that only explanation should collapse.

- Every `h3` and `h4` becomes a collapsible whose body runs to the next heading of the same or
  higher level.
- Step sections stay open by default so the sequence remains visible; everything else remembers
  what you left open.
- Mitigations for the known costs: `hidden="until-found"` so find-in-page still works, print CSS
  forces everything open, and an expand-all / collapse-all control sits in the nav panel.
- Maximum three levels of collapsing. Deeper than that is unreadable.

---

## 8. Outstanding work

1. Apply the colour system in section 2–4 to `sops/lesson-04/index.html`.
2. Add the per-heading accordions from section 7.
3. Build the navigation widget from section 6 across the whole page (prototype exists at
   `scratchpad/nav-prototype.html`, not committed).

Content must not change: all 22 steps stay byte-identical and in order, verified by diff, as in the
previous restructure.
