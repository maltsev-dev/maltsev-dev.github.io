# Site reorganization — design

Date: 2026-11-11
Scope: the whole site, not one page.

## Intent

The site has the content but not the argument. Every page holds real material —
sixty-nine posts, nine shipped systems, six career stops, a twenty-three-skill
toolkit — and yet a visitor lands on the front page and cannot say in five
seconds what this site is, who it belongs to, or why it is worth the next
scroll. The pages read as fragments of a bigger idea rather than as that idea
told well.

The reorganization is a single decision applied everywhere: **the site is the
portfolio of a Forward Deployed Engineer** — someone who takes AI systems into
production inside other people's teams and is accountable for them working.
Everything else is arranged around that claim: the homepage states it, the
projects prove it, the writing shows the reasoning, the engagements page says
how to hire it.

## Why this shape

The content was never the problem. Sixty-nine posts and nine shipped systems is
more evidence than most portfolios have, and the writing is the sharpest part
of it — a continuous argument about agent runtime security that runs for twenty
consecutive posts. What is missing is the thread that makes it one body of work
instead of three unrelated collections.

Three failures drove the decisions below.

**The site never says what it is.** The homepage said "Systems that carry real
work" and left the reader to infer a profession. There was no name for the
role anywhere on the site. An FDE is a specific job: you are the engineer who
goes to the client, gets the system into production, and stays for the part
where it breaks. Naming it lets every page recruit for the same role.

**Content was duplicated across pages.** The `/freelance/` page listed seven
abstract project categories — "Enterprise Knowledge Management & Research
Agent", "Inbound Lead Qualification" — that restated, less concretely, systems
already catalogued on `/projects/`. The `/about/` page repeated the five
services verbatim. A reader who visited both pages met the same work twice,
the second time vaguer. Duplicates are worse than gaps: they read as padding.

**The chrome was loud.** A status bar two lines tall carrying a clock and a
greeting, a footer with a four-column directory and a button that repeated a
call to action already on the page, and a footer so tall it pushed the actual
content below the fold on long articles. The chrome competed with the writing.

## The decisions

Four were made with the site's owner, in the abstract, before anything was
built.

### 1. Duplicates: the seven abstract tiles come out

The seven "Projects" tiles on `/freelance/` are removed. They restate systems
already catalogued concretely on `/projects/` — the support-triage case study,
the lead-qualification case study, the permission-aware RAG milestone — in
weaker words. `/projects/` keeps every real system, including the two
milestones whose summaries read like marketing copy; those are the owner's
content and are not rewritten.

### 2. "Freelance" becomes "Engagements"

The word goes, the URL stays at `/freelance/`. *Freelance* prices an hour;
*engagements* names a piece of work with a fixed scope. The page is rebuilt
around the engagement model rather than around a service list: what kind of
problem it is, what the deliverable is, how the four steps run.

### 3. The blog gets topics, filters and search

Sixty-nine posts in year-groups, sorted by date, is an archive — it tells a
reader what exists but not what to read. The index becomes a grid of every
post with three ways in: five hand-assigned topics, live tag filtering, and
text search over titles and summaries. Topic assignment is data, not a guess
made at render time, so a post's topic is stable and can be cited.

### 4. The homepage states the claim

> I build AI systems that survive production.

with *Forward Deployed Engineer* in the eyebrow and the three areas of work in
the lede. The page is then: claim, proof, what the work is, the architecture it
is built on, selected work, latest writing. The architecture figure keeps its
place on the homepage — it is the strongest visual on the site and it belongs
on a front page — but it gets a section of its own instead of sharing a row
with the directory.

## What changes, page by page

### Chrome (every page)

- **Status bar**: half the height it was. It keeps the clock and the
  availability indicator, and loses the "— say hello" words. It was two lines
  of greeting on every screen of the site.
- **Footer**: one bar, everywhere, the same as the one `/projects/` already
  uses. The four-column directory, the "Built with Astro" line and the
  "Start a conversation" button are gone. The positioning line survives as a
  single line of type in the bar. Contact stays reachable from the status bar
  indicator and from the button that opens the letter modal wherever it is
  contextually needed.
- **Header**: the command palette's magnifier trigger is removed. The palette
  keeps a permanent, visible entry inside the System menu, and the keyboard
  shortcut keeps working.

### `/` — Home

1. **Hero** — eyebrow with the role, the claim as the headline, the lede
   naming the three areas, a proof strip with four numbers read from the data
   (years, skills, systems shipped, posts) rather than typed.
2. **What I do** — three pillars: agent runtime security, retrieval quality,
   reliability. Each names the tools and the failure it prevents.
3. **Selected work** — three real projects from the catalog, with a link to
   all of them.
4. **How I build** — the architecture figure, full width, with the line that
   says what it is.
5. **Latest notes** — three posts, with a link to all of them.

### `/writing` (`/blog/`) — Writing

A grid of every post. Each card carries the date, the reading time, the
topic, the title, a one-line summary and the tags. Above the grid: topic
filters, tag filters, and a search box. The filters work in the browser; with
JavaScript off the grid still shows every post, newest first, and the tag
chips on each card still link to their tag pages.

### `/engagements` (`/freelance/`) — Engagements

Rebuilt around the engagement: the kinds of problem, what arrives and when,
the four steps, and a closing call to action. The abstract project tiles are
gone.

### `/about/` — Profile

The "Right now" block loses the service list, which duplicated the engagements
page. What stays is what is unique to it: what is being built, what is being
written.

### `/experience/`, `/projects/`

Left as they are. They are the strongest pages on the site and they do not
need the argument restated.

## Constraints

- Static output, no framework, no new runtime dependency. The blog filters are
  vanilla JavaScript in one small file.
- Every theme still has to work. The chrome is themed, and the new footer and
  status bar have to be legible against all three ramps.
- The link gate in CI still has to pass: every address the site links to has
  to exist in `dist/`.
- Accessibility: focus order, focus rings, and the accessible names of the
  controls that survive the changes.

## Not doing

- Not rewriting the owner's copy. The two marketing-flavored milestone
  summaries stay as written.
- Not adding a blog post, a project, or a skill.
- Not changing the URL of `/freelance/`.

## Status after implementation

Implemented on 2026-11-11. Two things changed after the design was written and
are recorded here so the document is not read as a plan for a site that no
longer exists:

- **`/freelance/` is titled "Engagements" everywhere** — page title, nav
  label, palette label, `llms.txt`, the eyebrow and the heading. The URL did
  not change. This is decision 2 above, carried out as written.
- **The homepage architecture figure is joined by a stage index**, and
  `/projects/` grew an index of its twelve panels under the row: the row is a
  carousel, so the index is the only place on the page where every project is
  on screen at once.
