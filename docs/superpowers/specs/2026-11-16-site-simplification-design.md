# Site simplification — variant C

Date: 2026-11-16
Scope: the whole site. Copy, layout, and dead code.

> **Update, 2026-11-16 — the `/freelance/` page was removed.**
> The engagements page is gone, with all of its content: the five engagement
> shapes, the terms, the four-step run, and the "what this is not" block. So
> every clause below that names `/freelance/` is now moot — the decisions it
> drove were made on a page that no longer exists. The rest of the contract
> stands.
>
> What the removal changed elsewhere: the nav drops to four destinations (the
> shortcut keys renumber to 1–4); the 404 signpost lists three places; the
> profile page's "Right now" has two answers instead of three; the post and
> case-study closes point at `/projects/` instead of the engagements page; and
> `/freelance/` is gone from the sitemap, the agent map, the command palette
> and the redirect manifest. The uppercase `/FREELANCE/` stub went with it.
> The site still takes on work — the "Work with me" button and the status
> bar's contact dialog are how a reader reaches you — it just no longer
> advertises a catalogue of engagement shapes.

## Intent

The site has the content and no rest. A visitor lands on the front page and reads
355 words, of which the ASCII architecture figure is a third. The writing index
prints 69 summaries of 69 posts — 2,647 words restating the corpus rather than
indexing it. The career page prints the same six commits twice. The engagements
page states the same four terms three times. A quarter of the stylesheet styles
classes that appear nowhere in the built HTML.

This is a single change applied everywhere: **the site says less, and says it in
one column.** The terminal register, the three themes and the writing itself are
not in scope and do not change.

## What does not change

- The terminal vocabulary: windows, listings, prompts, lamps, the ASCII figure,
  the block-letter wordmark.
- The three themes (`phosphore`, `acidule`, `pierre`) and every token in them.
  All three already clear WCAG AA on the page background.
- The typefaces: JetBrains Mono for chrome, Inter for sentences.
- The 80-column mono listing as an object, and the 64–70ch prose column as a
  different object. Both are correct where they are today.
- The URLs. `/freelance/` keeps its name, `/blog/` keeps its name, every tag
  page and every legacy stub stays where it is.
- The writing. Not one post is edited.

## The decisions

### 1. One left edge

Every section window on a page starts at the same x. Today `/freelance/` has
five: 48, 194, 351, 961, 978. A terminal prints every line from column zero;
the site should read the same way.

`.tty-fit` stops centring and starts aligning left. The width rule changes to
`var(--w, fit-content)`, and each page sets `--w` once so its windows share a
right edge as well as a left one. The 404 keeps its centred signpost — it is one
window on an empty page.

### 2. Containers wide enough for their text

Five places wrap text that fits on one line, each because the container is too
narrow rather than because the text is too long. The container grows.

| Where | Text | Now | Needs |
|---|---|---:|---:|
| `/` h1 | "I build AI systems that survive production." | 825px | 991px |
| `/` writing listing | post titles | 412px | 638px |
| `/blog/` lede | "69 notes on agent runtime security…" | 666px | 891px |
| `/projects/lead-qualification-agent/` | `smart-qualification` | 143px | ~170px |
| `/blog/` head row | 5 cells in a 4-column grid | — | 5 columns |

The home page's two listing windows are capped at 44.125rem (80 columns) while
the same listing on `/blog/` runs the full column and gives the title 934px.
The cap is what makes the home titles wrap. It goes.

### 3. The home page says ~250 words, not 355

The lede restates the h1 and its only unique content is a hedge. It goes. The
three pillar cards restate stages 05, 06, 07, 08 and 10 of the figure directly
below them. They become signposts — a title, one line, a count — and the figure
carries the argument. Thirty decorative labels that say nothing (`4 rules`,
`12 entries`, `updated today`, `Read this one`, `three things, in order of how
often they come up`) are deleted.

What stays: the wordmark, the prompt, the h1, two buttons, four counted
numbers with links to their receipts, three signposts, the figure, two
listings.

### 4. The index indexes

`/blog/` prints each post's opening sentence under its title. The reader scans
69 openings, then reads each opening again when they open the post. The
per-post summary goes; the title, date, topic, reading time and length stay.
The per-post tag chips go too — the filter row above the listing already names
every tag with its count, and each post page still links its own tags.

The listing becomes a directory. The first post moves from 984px down the page
to about 300px.

### 5. Nothing is said twice

Six places where one sentence appears on two or three pages, and four places
where one page says the same thing twice:

- "Half an hour on a call is enough for both of us to know whether this is work
  I should be doing." — three pages. It stays on `/freelance/`, which is the
  page that sells the engagement. The other two point at it.
- "Fixed scope, fixed price, explicit deliverables" — twice on `/freelance/`.
- "Weekly updates and a working environment you can look at from week one." —
  twice on `/freelance/`, verbatim.
- "The engagement ends when the system runs without me" — twice on
  `/freelance/`.
- "I build AI systems that survive production" — the h1, the lede and two meta
  descriptions. The h1 and one meta description stay.
- The `git log --oneline` mini-listing on `/experience/` is the six commits
  that follow it in full, twenty lines later. It goes.
- The `TERMS` and `STEPS` windows on `/freelance/` state the same four
  commitments in two orders. `NOT_THIS` states them a third time. Each of the
  three keeps only what the others do not say.
- The `METHOD` rules on `/about/` and the `FOCUS` list above them make the same
  four points twice. The rules keep their title and their keyword chips; their
  bodies go.

### 6. The dead code goes

~130 CSS classes across six stylesheets style nothing that appears in the built
HTML. The whole `.skill-pyramid` / `.skill-chip` / `.skill-card` system is dead
— the page was rebuilt as a tree and the pyramid CSS stayed. `.post-nav*`,
`.post-related*`, `.tl-*`, `.big-block*`, `.resources*`, `.pipe-*`, `.field*`,
`.kv`, `.sticky-head`, `.rule-progress`, `.card*`, `.os-panel` and the rest go.
The skill tree that replaced the pyramid has no styles at all: `.skill-tree`,
`.skill-name` and `.skill-facts` are unstyled today, so the tree and its counts
run together as one grey line.

### 7. Contrast

`.stack-zone.is-hot` sets `--fort` on a 26% accent tint: **3.88:1 in `pierre`
and 4.43:1 in `acidule`**, both under the 4.5:1 floor. The hot zone takes the
brighter text colour instead.

## The contract

Every agent codes against these and invents nothing.

```css
/* global.css — the only new tokens */
--measure-prose: 68ch;   /* prose inside a window */
--measure-doc: 46rem;    /* the default prose window width */
```

- `.tty-fit { width: var(--w, fit-content); max-width: 100%; margin-inline: 0; }`
  — left-aligned. A page sets `--w` on a wrapper to unify its windows.
- `.ls-row--post` is five columns: `11ch 11ch 4ch 13ch minmax(0, 1fr)`. The
  header row of a post listing uses this same class, so the labels sit over
  their columns.
- Prose inside a window: `max-width: var(--measure-prose)`.
- A listing window is the full width of the page column.
- Nothing gets a new typeface, a new colour or a new animation.
- Every string that ends up on a page is either counted from the data or
  removed. No number is typed by hand that the data can produce.

## Approaches considered

**A — cosmetic.** Fix the wraps, align the columns, delete the dead CSS, leave
the copy alone. Cheapest, safest, and leaves the site's real problem — it says
the same thing several times — exactly where it is.

**B — moderate.** A, plus halve the summaries and the redundant paragraphs.
Takes the edge off without changing the shape.

**C — radical (chosen).** The home page becomes ~250 words. The blog index
becomes a directory. Every repeated sentence is said once. ~130 dead CSS
classes go. The listing windows get the width their titles need. The terminal
register and the three themes are untouched.

C was chosen over B because B leaves the two largest text blocks in place — the
69 summaries on `/blog/` and the figure's 1,811 words of click-reachable modal
copy — and because the decorative labels that say nothing are the clearest
example of the noise the brief is about. C is also the only option that fixes
the width problem at its cause rather than shortening the text to fit the
wrong container.

## Out of scope

- No post is edited.
- No URL changes, no redirects added or removed.
- No new dependency, no framework, no build change.
- No new page, no removed page.
- The three themes are not re-tuned. Every token keeps its hex value.
