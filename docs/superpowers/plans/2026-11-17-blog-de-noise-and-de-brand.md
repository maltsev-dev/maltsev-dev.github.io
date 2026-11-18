# De-noise the blog and take the product out of the articles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the fake-shell and `mode` decoration from every listing and the article page, and turn the 24 `agent-runtime` articles into product-agnostic technical reviews that end in an explicit "what not to do / what to do" conclusion.

**Architecture:** Two independent phases. Phase A edits five `.astro` pages plus one shared stylesheet to drop the `mode` column and the fake shell command; Phase B edits 24 markdown posts to delete the `## Where this runs` section, replace product names with roles, and append a uniform conclusion section. Phase C builds the site, runs the CI link gate, greps for leftovers and checks the result in a browser.

**Tech Stack:** Astro 5 (static output), Markdown content collections (`src/content/posts/`), plain CSS with custom properties, Python 3 for the link gate, `npm run build`.

**Spec:** `docs/superpowers/specs/2026-11-17-blog-de-noise-and-de-brand-design.md` — read it before starting; this plan argues from it.

## Global Constraints

- The site ships from `src/` (Astro). The legacy `content/` directory at the repo root is **not** the source of truth; never edit a post there.
- Frontmatter of a post is exactly `title`, `date`, `tags` (plus `updated`/`description` where present). Do not add, remove or reorder these keys.
- Post file names are `YYYY-MM-DD-slug.md` and are the post's `id`; the slug never changes in this plan.
- The internal link form is `/blog/{post-id}/` with a trailing slash. Every link to another post in this corpus must keep that form.
- House prose rules for the posts: one idea per paragraph; headings are short and declarative; tables use `|---|---|`; code fences carry a language where the language is known; no em-dash run longer than one per paragraph.
- **No invented statistics.** Every number in a new conclusion section must already appear in the article it sits in, or be arithmetic on numbers that do.
- **No product name anywhere in `src/content/posts/`.** The word `nullrun` (any case) must not survive, and neither may `nullrun.io`.
- The `mode` column is removed, not replaced. Do not substitute a different decorative column.
- The terminal *aesthetic* stays: window frames, LEDs, monospaced listings, filter chips.

## Review Focus

The five failure modes this change can produce that a per-task check will not catch:

1. **A leftover product name in a diagram.** The ASCII art in the articles labels a gate with the product name in a column of box-drawing characters; a text-only grep for prose misses a name that survives inside a code fence. → Task 13 greps case-insensitively across the whole file including fences, and Task 13 also greps for `nullrun.io`.
2. **A conclusion that says nothing.** The new section can be produced with correct headings and no content, or with a paragraph that restates the article's title. → Task 13 checks that every one of the 24 files has the section, once, before `## FAQ`, and that each half is 110–200 words.
3. **A grid that no longer lines up.** Removing a grid track in CSS without removing the matching cell in the markup (or the reverse) shifts every column and breaks the monospaced alignment the whole listing depends on. → Each Phase A task's verification step greps the rendered `dist/` HTML for the count of `<span class="ls-mode">` and checks the column count of a rendered row.
4. **A broken internal link.** Deleting the `Where this runs` section also deletes the product links at the end of it; the remaining body links must still resolve, and the CI gate is what proves it. → Task 13 runs `_audit_links_astro.py`.
5. **A conclusion that contradicts the article.** A new "what to do" that recommends something the article argued against. → Every Phase B task ends with a self-check step that re-reads the article's own "Limitations worth stating" section and confirms the conclusion does not claim more than the article claims.

---

### Task 1: Drop the `mode` column from the blog index

**Files:**
- Modify: `src/pages/blog/index.astro` — the Subjects listing (lines 214–233) and the posts listing (lines 304–340); the `.ls-topics .ls-row` rules in the `<style>` block.
- Modify: `src/styles/tty.css` — the `.ls-row--post` grid template.

**Interfaces:**
- Consumes: nothing.
- Produces: `.ls-row--post` carries four tracks (`date`, `min`, `topic`, `name`) instead of five. Tasks 2 and 3 reuse that template unchanged.

- [ ] **Step 1: Remove the `mode` cell from the Subjects listing**

In `src/pages/blog/index.astro`, delete this line from the header row:

```html
              <span class="ls-mode">mode</span>
```

and delete this line from each topic row:

```html
                  <span class="ls-mode">drwxr-xr-x</span>
```

- [ ] **Step 2: Remove the `mode` cell from the posts listing**

In the same file, delete from the header row:

```html
              <span class="ls-mode">mode</span>
```

and delete from each post row:

```html
                        <span class="ls-mode">-rw-r--r--</span>
```

- [ ] **Step 3: Retune the Subjects grid**

Replace in the `<style>` block of `src/pages/blog/index.astro`:

```css
  .ls-topics .ls-row {
    grid-template-columns: 9.5ch 6ch 15ch minmax(0, 1fr);
  }
```

with:

```css
  .ls-topics .ls-row {
    grid-template-columns: 6ch 15ch minmax(0, 1fr);
  }
```

- [ ] **Step 4: Retune the Subjects grid on narrow screens**

Replace:

```css
  @media (max-width: 52rem) {
    .ls-topics .ls-row {
      grid-template-columns: 9.5ch 5ch minmax(0, 1fr);
      grid-template-areas:
        'mode count name'
        'desc desc desc';
      row-gap: 0.15rem;
    }

    .ls-topics .ls-mode {
      grid-area: mode;
    }
```

with:

```css
  @media (max-width: 52rem) {
    .ls-topics .ls-row {
      grid-template-columns: 5ch minmax(0, 1fr);
      grid-template-areas:
        'count name'
        'desc desc desc';
      row-gap: 0.15rem;
    }
```

- [ ] **Step 5: Retune the post row grid**

In `src/styles/tty.css`, replace:

```css
.ls-row--post {
  grid-template-columns: 11ch 11ch 4ch 13ch minmax(0, 1fr);
  line-height: 1.6;
}
```

with:

```css
.ls-row--post {
  grid-template-columns: 11ch 4ch 13ch minmax(0, 1fr);
  line-height: 1.6;
}
```

- [ ] **Step 6: Drop the now-dead mobile rule**

In `src/styles/tty.css`, delete this block from the `@media (max-width: 52rem)` rule that contains `.ls-row--post`:

```css
  .ls-row--post .ls-mode {
    display: none;
  }
```

The `.ls-mode` class rules themselves (`src/styles/tty.css` lines 239–246) stay for now: Task 4 still uses them.

- [ ] **Step 7: Build and check the markup**

Run: `npm run build`
Expected: the build succeeds.

Run: `grep -c "ls-mode" dist/blog/index.html`
Expected: `0`.

- [ ] **Step 8: Commit**

```bash
git add src/pages/blog/index.astro src/styles/tty.css
git commit -m "refactor(blog): drop the mode column from the index listing"
```

---

### Task 2: Drop the `mode` column from the tag page listing

**Files:**
- Modify: `src/pages/tags/[tag].astro` — the listing header row and each post row.

**Interfaces:**
- Consumes: the four-track `.ls-row--post` template from Task 1.
- Produces: nothing.

- [ ] **Step 1: Remove the `mode` cells**

In `src/pages/tags/[tag].astro`, delete from the header row:

```html
              <span class="ls-mode">mode</span>
```

and delete from each post row:

```html
                      <span class="ls-mode">-rw-r--r--</span>
```

Leave the `grep -l "{slug}" -r ~/blog` prompt above the listing alone: it names the search that produced the listing, which is the job it does on this page.

- [ ] **Step 2: Build and check**

Run: `npm run build`
Expected: succeeds.

Run: `grep -c "ls-mode" dist/tags/*/index.html`
Expected: `0` for every file printed.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tags/[tag].astro
git commit -m "refactor(tags): drop the mode column from the tag listing"
```

---

### Task 3: Drop the `mode` column from the home page listing

**Files:**
- Modify: `src/pages/index.astro` — the "latest writing" listing and the `.ls-row--write` template in `src/styles/tty.css`.

**Interfaces:**
- Consumes: nothing.
- Produces: `.ls-row--write` carries three tracks (`date`, `min`, `name`).

- [ ] **Step 1: Remove the `mode` cells**

In `src/pages/index.astro`, delete from the header row:

```html
              <span class="ls-mode">mode</span>
```

and delete from each row:

```html
                  <span class="ls-mode">-rw-r--r--</span>
```

- [ ] **Step 2: Retune the grid**

In `src/styles/tty.css`, replace:

```css
.ls-row--write {
  grid-template-columns: 11ch 12ch 5ch minmax(0, 1fr);
}
```

with:

```css
.ls-row--write {
  grid-template-columns: 12ch 5ch minmax(0, 1fr);
}
```

- [ ] **Step 3: Build and check**

Run: `npm run build`
Expected: succeeds.

Run: `grep -c "ls-mode" dist/index.html`
Expected: `0`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro src/styles/tty.css
git commit -m "refactor(home): drop the mode column from the writing listing"
```

---

### Task 4: Drop the `mode` column from the 404 listing

**Files:**
- Modify: `src/pages/404.astro` — the directory listing and its `.ls-dirs .ls-row` rules.

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. After this task, `.ls-mode` is used nowhere on the site.

- [ ] **Step 1: Remove the `mode` cells**

In `src/pages/404.astro`, delete from the header row:

```html
            <span class="ls-mode">mode</span>
```

and delete from each place row:

```html
                <span class="ls-mode">drwxr-xr-x</span>
```

- [ ] **Step 2: Retune the grid**

Replace:

```css
  .ls-dirs .ls-row {
    grid-template-columns: 9.5ch 16ch minmax(0, 1fr);
    line-height: 1.7;
  }
```

with:

```css
  .ls-dirs .ls-row {
    grid-template-columns: 16ch minmax(0, 1fr);
    line-height: 1.7;
  }
```

- [ ] **Step 3: Drop the dead mobile rule**

Delete from the `@media (max-width: 52rem)` block in the same file:

```css
    .ls-dirs .ls-mode {
      display: none;
    }
```

- [ ] **Step 4: Remove the now-unused `.ls-mode` rules**

In `src/styles/tty.css`, delete:

```css
/* The mode column. Directories end in a slash and are drawn in the accent;
   ordinary files are drawn in the secondary text. */
.ls-mode {
  color: var(--faible);
}

.ls-row.is-dir .ls-mode,
.ls-row.is-dir .ls-name {
  color: var(--braise);
}
```

Replace the second block with (the directory name keeps its accent colour):

```css
.ls-row.is-dir .ls-name {
  color: var(--braise);
}
```

Also delete `.ls-head .ls-mode,` from the `.ls-head` colour rule in the same file.

- [ ] **Step 5: Build and check**

Run: `npm run build`
Expected: succeeds.

Run: `grep -rc "ls-mode" dist/404.html src/`
Expected: `dist/404.html` → `0`; `src/` → `0` for every file printed.

- [ ] **Step 6: Commit**

```bash
git add src/pages/404.astro src/styles/tty.css
git commit -m "refactor(404): drop the mode column from the directory listing"
```

---

### Task 5: Remove the fake shell command and the path from the article page

**Files:**
- Modify: `src/pages/blog/[slug].astro` — the article header, the post window, the "more" window.

**Interfaces:**
- Consumes: nothing.
- Produces: an article page whose only terminal decoration is the window frame.

- [ ] **Step 1: Remove the `cat` prompt above the title**

Delete this whole block from `<header class="post-head">`:

```astro
      <p class="tty-prompt" data-reveal data-reveal-delay="100">
        <span class="who">root</span><span class="sep">@</span><span
          >amaltsev</span
        ><span class="sep">:</span><span class="path">~/blog</span><span class="sep"
          >$</span
        >
        <span class="tty-cmd">cat {post.id}.md</span>
      </p>
```

- [ ] **Step 2: Empty the post window's title bar**

Replace:

```astro
        <div class="tty-bar">
          <span class="tty-leds" aria-hidden="true">
            <i class="led led-on"></i>
            <i class="led led-off"></i>
            <i class="led led-off"></i>
          </span>
          <span class="tty-title">~/blog/{post.id}.md</span>
          <span class="tty-right" aria-hidden="true">{words} words</span>
        </div>
```

with:

```astro
        <div class="tty-bar">
          <span class="tty-leds" aria-hidden="true">
            <i class="led led-on"></i>
            <i class="led led-off"></i>
            <i class="led led-off"></i>
          </span>
        </div>
```

- [ ] **Step 3: Remove the `cat` prompt at the top of the window body**

Delete this whole block:

```astro
          <p class="tty-prompt tty-cmd-line">
            <span class="who">root</span><span class="sep">@</span><span
              >amaltsev</span
            ><span class="sep">:</span><span class="path">~/blog</span><span class="sep"
              >$</span
            >
            <span class="tty-cmd">cat {post.id}.md</span>
          </p>
```

- [ ] **Step 4: Remove the prompts and the path from the "more" window**

Delete the `ls -la` prompt block:

```astro
          <p class="tty-prompt tty-cmd-line">
            <span class="who">root</span><span class="sep">@</span><span
              >amaltsev</span
            ><span class="sep">:</span><span class="path">~/blog</span><span class="sep"
              >$</span
            >
            <span class="tty-cmd">ls -la</span>
          </p>
```

Delete the `grep -l` prompt block:

```astro
          <p class="tty-prompt tty-cmd-line">
            <span class="who">root</span><span class="sep">@</span><span
              >amaltsev</span
            ><span class="sep">:</span><span class="path">~/blog</span><span class="sep"
              >$</span
            >
            <span class="tty-cmd">
              grep -l "{post.data.tags[0] ?? 'ai'}" -r ~/blog
            </span>
          </p>
```

Replace the "more" window's title bar:

```astro
        <div class="tty-bar">
          <span class="tty-leds" aria-hidden="true">
            <i class="led led-on"></i>
            <i class="led led-off"></i>
            <i class="led led-off"></i>
          </span>
          <span class="tty-title">~/blog</span>
        </div>
```

with:

```astro
        <div class="tty-bar">
          <span class="tty-leds" aria-hidden="true">
            <i class="led led-on"></i>
            <i class="led led-off"></i>
            <i class="led led-off"></i>
          </span>
        </div>
```

- [ ] **Step 5: Remove the now-unused word count**

In `src/pages/blog/[slug].astro`, delete:

```astro
/** The words in the body, for the window's own corner. */
const words = post.body.trim().split(/\s+/).filter(Boolean).length;
```

- [ ] **Step 6: Build and check**

Run: `npm run build`
Expected: succeeds.

Run: `grep -c "cat .*\.md" dist/blog/2026-06-26-agent-budget-is-a-permission-not-a-limit/index.html`
Expected: `0`.

Run: `grep -c "~/blog" dist/blog/2026-06-26-agent-budget-is-a-permission-not-a-limit/index.html`
Expected: `0`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/blog/[slug].astro
git commit -m "refactor(blog): take the fake shell command off the article page"
```

---

### Task 6: Write the shared brief for the article workers

**Files:**
- Create: `docs/superpowers/article-debrand-brief.md` — the file every Phase B worker reads before touching a post.

**Interfaces:**
- Consumes: the terminology table, the worked example and the house rules from the spec.
- Produces: `docs/superpowers/article-debrand-brief.md`, read by every worker in Tasks 7–12.

- [ ] **Step 1: Write the brief**

Create `docs/superpowers/article-debrand-brief.md` with exactly the content in **Appendix A** of this plan.

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/article-debrand-brief.md
git commit -m "docs: brief for the article de-branding pass"
```

---

### Task 7: De-brand batch 1 — the pipeline and the seam

**Files:**
- Modify: `src/content/posts/2026-04-07-the-ai-pipeline-is-not-optional.md`
- Modify: `src/content/posts/2026-06-01-the-seam-between-model-and-execution.md`
- Modify: `src/content/posts/2026-06-07-intercept-tool-calls-before-execution.md`
- Modify: `src/content/posts/2026-06-13-permissions-are-categories-authorizations-are-instances.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the `## What to do, and what not to` section and no product name.

- [ ] **Step 1: Apply the brief to `2026-04-07-the-ai-pipeline-is-not-optional.md`**

This post has no `## Where this runs` section and no product name. It only needs the new conclusion section, inserted before `## FAQ`.

- [ ] **Step 2: Apply the brief to `2026-06-01-the-seam-between-model-and-execution.md`**

Delete the `## Where this runs` section; replace the product name inside the ASCII diagram with the role (`the gate`); rewrite the sentences that name the product; add the conclusion section.

- [ ] **Step 3: Apply the brief to `2026-06-07-intercept-tool-calls-before-execution.md`**

Same transformations. The product name is inside the ASCII diagram on line 40 and in prose around lines 254–269, including two `nullrun.io` links.

- [ ] **Step 4: Apply the brief to `2026-06-13-permissions-are-categories-authorizations-are-instances.md`**

Same transformations. The product name is in prose around lines 271–294, including one `nullrun.io` link.

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-04-07-*.md src/content/posts/2026-06-01-*.md src/content/posts/2026-06-07-*.md src/content/posts/2026-06-13-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" src/content/posts/2026-04-07-*.md src/content/posts/2026-06-01-*.md src/content/posts/2026-06-07-*.md src/content/posts/2026-06-13-*.md`
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the pipeline and seam articles"
```

---

### Task 8: De-brand batch 2 — the layer and the budget

**Files:**
- Modify: `src/content/posts/2026-06-19-choosing-an-agent-runtime-security-layer.md`
- Modify: `src/content/posts/2026-06-26-agent-budget-is-a-permission-not-a-limit.md`
- Modify: `src/content/posts/2026-07-02-budget-enforcement-per-llm-call.md`
- Modify: `src/content/posts/2026-07-08-atomic-budget-reservation-redis-lua.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the conclusion section and no product name.

- [ ] **Step 1: Apply the brief to `2026-06-19-choosing-an-agent-runtime-security-layer.md`**

The post compares six categories of security layer and then names the product as one of them. The comparison must survive as a comparison of *kinds* of layer, with the product removed from the list rather than replaced by another name. Add the conclusion section.

- [ ] **Step 2: Apply the brief to `2026-06-26-agent-budget-is-a-permission-not-a-limit.md`**

Delete `## Where this runs`; add the conclusion section. The worked example in Appendix A is this article's new tail — use it as the model.

- [ ] **Step 3: Apply the brief to `2026-07-02-budget-enforcement-per-llm-call.md`**

This post contains a vendor SDK import and a product-prefixed identifier in a code sample. The sample must show the wire contract instead of an SDK call. Delete the closing section; add the conclusion.

- [ ] **Step 4: Apply the brief to `2026-07-08-atomic-budget-reservation-redis-lua.md`**

The Lua sample must not carry a product name. Delete the closing section; add the conclusion.

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-06-19-*.md src/content/posts/2026-06-26-*.md src/content/posts/2026-07-02-*.md src/content/posts/2026-07-08-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" ` over the same four files
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the layer and budget articles"
```

---

### Task 9: De-brand batch 3 — loops, fail-closed, approvals

**Files:**
- Modify: `src/content/posts/2026-07-14-agent-loops-need-an-external-stopping-boundary.md`
- Modify: `src/content/posts/2026-07-20-fail-closed-is-not-a-single-switch.md`
- Modify: `src/content/posts/2026-07-26-how-hitl-approvals-get-bypassed.md`
- Modify: `src/content/posts/2026-08-01-human-approval-is-not-authorization.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the conclusion section and no product name.

- [ ] **Step 1: Apply the brief to `2026-07-14-agent-loops-need-an-external-stopping-boundary.md`**

- [ ] **Step 2: Apply the brief to `2026-07-20-fail-closed-is-not-a-single-switch.md`**

This post counts enforcement paths; the product name appears in the prose around line 310. Keep the count of paths; remove the name.

- [ ] **Step 3: Apply the brief to `2026-07-26-how-hitl-approvals-get-bypassed.md`**

- [ ] **Step 4: Apply the brief to `2026-08-01-human-approval-is-not-authorization.md`**

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-07-14-*.md src/content/posts/2026-07-20-*.md src/content/posts/2026-07-26-*.md src/content/posts/2026-08-01-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" ` over the same four files
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the loop, fail-closed and approval articles"
```

---

### Task 10: De-brand batch 4 — approval state, digests, fatigue, credentials

**Files:**
- Modify: `src/content/posts/2026-08-08-approval-is-security-state-not-session-state.md`
- Modify: `src/content/posts/2026-08-14-material-fields-and-canonicalization.md`
- Modify: `src/content/posts/2026-08-20-reducing-hitl-approval-fatigue.md`
- Modify: `src/content/posts/2026-08-26-scope-agent-permissions-to-the-credential.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the conclusion section and no product name.

- [ ] **Step 1: Apply the brief to `2026-08-08-approval-is-security-state-not-session-state.md`**

Two product links live in this post's closing section; both go with it.

- [ ] **Step 2: Apply the brief to `2026-08-14-material-fields-and-canonicalization.md`**

The domain-separation string in this post contains the product name: `"nullrun/v1/business_impact:"`. It becomes a neutral namespace prefix (`"approval/v1/business_impact:"`) — the string is part of a digest scheme, so its shape must stay.

- [ ] **Step 3: Apply the brief to `2026-08-20-reducing-hitl-approval-fatigue.md`**

- [ ] **Step 4: Apply the brief to `2026-08-26-scope-agent-permissions-to-the-credential.md`**

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-08-08-*.md src/content/posts/2026-08-14-*.md src/content/posts/2026-08-20-*.md src/content/posts/2026-08-26-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" ` over the same four files
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the approval-state, digest, fatigue and credential articles"
```

---

### Task 11: De-brand batch 5 — identity, lifecycles, authority, operator control

**Files:**
- Modify: `src/content/posts/2026-09-01-mcp-tool-identity-not-tool-name.md`
- Modify: `src/content/posts/2026-09-07-authority-and-evidence-have-separate-lifecycles.md`
- Modify: `src/content/posts/2026-09-13-authority-over-its-own-authority.md`
- Modify: `src/content/posts/2026-09-19-operator-control-must-be-external-state.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the conclusion section and no product name.

- [ ] **Step 1: Apply the brief to `2026-09-01-mcp-tool-identity-not-tool-name.md`**

- [ ] **Step 2: Apply the brief to `2026-09-07-authority-and-evidence-have-separate-lifecycles.md`**

- [ ] **Step 3: Apply the brief to `2026-09-13-authority-over-its-own-authority.md`**

- [ ] **Step 4: Apply the brief to `2026-09-19-operator-control-must-be-external-state.md`**

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-09-01-*.md src/content/posts/2026-09-07-*.md src/content/posts/2026-09-13-*.md src/content/posts/2026-09-19-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" ` over the same four files
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the identity, lifecycle and authority articles"
```

---

### Task 12: De-brand batch 6 — audit, testing, chains, unknown outcomes

**Files:**
- Modify: `src/content/posts/2026-09-25-audit-trail-for-ai-agent-tool-calls.md`
- Modify: `src/content/posts/2026-10-01-testing-agent-policies-against-adversarial-inputs.md`
- Modify: `src/content/posts/2026-10-07-four-valid-permissions-one-unacceptable-chain.md`
- Modify: `src/content/posts/2026-10-10-unknown-outcome-is-not-a-failure-state.md`

**Interfaces:**
- Consumes: `docs/superpowers/article-debrand-brief.md` (Task 6).
- Produces: four posts with the conclusion section and no product name.

- [ ] **Step 1: Apply the brief to `2026-09-25-audit-trail-for-ai-agent-tool-calls.md`**

This post names the product in the opening code sample (four audit tables). The four tables stay; the name does not.

- [ ] **Step 2: Apply the brief to `2026-10-01-testing-agent-policies-against-adversarial-inputs.md`**

- [ ] **Step 3: Apply the brief to `2026-10-07-four-valid-permissions-one-unacceptable-chain.md`**

This post uses the product as the example of a per-evaluation layer. The example must become a generic one — a layer you write, a policy you evaluate — not another product.

- [ ] **Step 4: Apply the brief to `2026-10-10-unknown-outcome-is-not-a-failure-state.md`**

This post's closing section is the longest in the corpus and ends on two product links, one of them a pricing page. Both go with the section.

- [ ] **Step 5: Verify the batch**

Run: `grep -ri "nullrun" src/content/posts/2026-09-25-*.md src/content/posts/2026-10-01-*.md src/content/posts/2026-10-07-*.md src/content/posts/2026-10-10-*.md`
Expected: no output.

Run: `grep -c "^## What to do, and what not to" ` over the same four files
Expected: `1` for every file.

- [ ] **Step 6: Commit**

```bash
git add src/content/posts/
git commit -m "docs(posts): de-brand the audit, testing and outcome articles"
```

---

### Task 13: Verify the whole change

**Files:**
- No files change in this task. It is the gate.

**Interfaces:**
- Consumes: everything the earlier tasks produced.
- Produces: the evidence that the change is complete.

- [ ] **Step 1: The product is gone from the corpus**

Run: `grep -ri "nullrun" src/content/posts/`
Expected: no output.

- [ ] **Step 2: Every post has exactly one conclusion section, before the FAQ**

The 24 posts of the `agent-runtime` topic are the ones that changed. `2026-01-07-from-device-to-system-communication-backend-and-dashboard-for-an-embedded-ai-product` also matches `2026-*.md` and is out of scope — it has no FAQ and no conclusion, and must stay that way.

Run:
```bash
for f in $(ls src/content/posts/2026-*.md | grep -v "2026-01-07"); do
  a=$(grep -c "^## What to do, and what not to" "$f")
  b=$(grep -n "^## What to do, and what not to" "$f" | cut -d: -f1)
  c=$(grep -n "^## FAQ" "$f" | cut -d: -f1)
  echo "$a $b $c $(basename "$f")"
done
```
Expected: `1`, the section's line number smaller than the FAQ's line number, for all 24 files.

- [ ] **Step 3: The conclusion halves are substantial**

Run:
```bash
for f in $(ls src/content/posts/2026-*.md | grep -v "2026-01-07"); do
  awk '/^## What to do, and what not to/,/^## FAQ/' "$f" | wc -w | tr '\n' ' '
  echo "$(basename "$f")"
done
```
Expected: between 240 and 460 words per file (two halves of 110–200 words plus the two headings).

- [ ] **Step 4: The site builds**

Run: `npm run build`
Expected: succeeds, with no warnings about posts that have no topic.

- [ ] **Step 5: The link gate passes**

Run: `python _audit_links_astro.py`
Expected: exit code 0, and the output reports no broken internal link.

- [ ] **Step 6: The listing has no mode column**

Run: `grep -rc "ls-mode" dist/`
Expected: `0` for every file printed.

- [ ] **Step 7: The article page has no fake shell command**

Run: `grep -rc "cat .*\.md\|~/\(blog\|writing\)" dist/blog/2026-06-26-agent-budget-is-a-permission-not-a-limit/index.html`
Expected: `0`.

- [ ] **Step 8: The site still says nothing twice**

`tools/duplicate-prose.mjs` checks the site's "nothing is said twice" contract against the
built site. Twenty-four conclusion sections with the same shape are exactly the kind of
change that introduces a sentence said on two pages, so this check is part of the gate.

Run: `node tools/duplicate-prose.mjs dist`
Expected: the cross-page count is **lower** than the baseline of 59, and no new sentence
appears in the cross-page list that was not in
`.superpowers/sdd/2026-11-17-blog-de-noise-and-de-brand/duplicate-prose-baseline.txt`.

Two of the baseline duplicates are the product's own pitch sentences — "The wire shapes
are in the API reference." and "The integration docs cover wiring the gate into the tool
path." — and this change is expected to remove both. Anything else that disappears is
also fine; anything that **appears** must be rewritten in one of the two posts that share
it.

- [ ] **Step 9: Look at it**

Serve the built `dist/` on a free port (`npx serve dist -l 4325`) and open it with Playwright. **Stop the server before rebuilding** — a running preview holds `dist/` and the next `npm run build` fails with EPERM.

Check at 1440 px and at 390 px, and in **both** themes (the site has a light and a dark theme; set the theme explicitly rather than relying on the machine's):

- `/blog/` — the listing: the columns align, the title is the last column, the date still lines up under its header, the filter chips still work, and the Subjects table still lines up;
- one agent-runtime article — the header, the top of the window, and the bottom "more" window (the window bars must not look empty-but-broken: LEDs only, nothing centred);
- `/tags/authorization/` — the tag listing;
- `/` — the home listing;
- `/404` — the directory listing.

Expected: no empty column, no orphaned header label, no row that overflows its cell, and nothing that reads as a broken layout.

- [ ] **Step 10: Commit the verification notes**

If a check found anything, fix it in the file that owns it and re-run Steps 4–9. Then:

```bash
git add -A
git commit -m "chore: verification pass for the de-noise and de-brand change"
```

---

## Appendix A — the brief for the article workers

Write this file verbatim to `docs/superpowers/article-debrand-brief.md`.

````markdown
# Brief: take the product out of an article

You are editing one or more Markdown posts in `src/content/posts/`. Each post
is a technical article about agent runtime security. Your job is to make the
article stand on its own as technical writing: no product, no pitch, and a
conclusion the reader can act on.

## Read this first

The article you are editing is already good. Its argument, its failure modes,
its tables, its code samples, its "What to actually check" list and its FAQ
stay. You are not rewriting the article. You are doing four things to it.

## 1. Delete the closing product section

Delete the whole `## Where this runs` section, from the heading to the end of
the file, if the article has one. Everything in it goes, including the product
links at the end of it.

Do not move it elsewhere in the article. Its job was to say which product does
this, and there is no product-agnostic version of that job. The technical
content it carried (an atomic read, a server-minted ID, a re-read at
settlement) moves into the new conclusion in step 4, where it is argued for
rather than advertised.

If the article has no such section, there is nothing to delete.

## 2. Replace every product reference with the role

The product must not appear anywhere in the file — not in prose, not in a
heading, not inside an ASCII diagram, not inside a code fence, not in a
link. Use the role instead, so the sentence still says who does what.

| Instead of the product name | Write |
|---|---|
| `NullRun gate` in a diagram | `the gate` or `authorization gate` |
| "NullRun sits on the seam" | "the enforcement layer sits on the seam" |
| "NullRun evaluates the action" | "the enforcement layer evaluates the action" |
| "NullRun is the runtime authorization layer" | "the runtime authorization layer is" |
| `from nullrun import NullRun` | the HTTP request to the gate |
| `NullRun(api_key=...)` | a neutral call to the gate |
| `NULLRUN` as an identifier prefix | `the gateway` / `the counter service` |
| `"nullrun/v1/business_impact:"` | `"approval/v1/business_impact:"` |
| a `nullrun.io` link | nothing — rewrite the sentence without it |

**Never invent a replacement package or vendor.** A made-up SDK name is the
same problem with a different label. Where the article's point needs a client
call, show the wire contract (the HTTP request and its JSON) or a neutral
function call like `gate.authorize(...)`.

Where a sentence existed only to link to the product's documentation, delete
the sentence. Where it carried an argument, keep the argument and drop the
link.

If the article compares several kinds of thing and the product was one of
them, remove it from the list rather than replacing it with another name. A
comparison of six layers becomes a comparison of five, and the sentence that
counted them now counts five.

## 3. Keep the house style

- Frontmatter: `title`, `date`, `tags` — do not touch them.
- Heading levels: `##` for sections, `###` for subsections. The new section is
  `##` with two `###` under it.
- Tables: `|---|---|`, sentences in the cells, not fragments.
- Code fences: keep the language tag when the language is known.
- The article's own voice: direct, concrete, second person where the article
  is second person, no marketing, no "in today's fast-moving world".
- Never more than one em dash in a paragraph.
- Internal links to other posts keep the `/blog/{post-id}/` form, trailing slash
  included. If you rewrite a sentence that carries a link, the link keeps that form.
- Do not change the post's title, its date, its tags, or its file name.

## 4. Add the conclusion

Insert, immediately before the `## FAQ` heading, exactly this shape:

```markdown
## What to do, and what not to

### What not to

<The anti-pattern, named concretely. What it is, the mechanism by which it
fails, and the number in the article that shows it failing.>

### What to do

<The pattern. The mechanism that makes it hold, what it costs, and the
property it buys.>
```

The section must satisfy all six of these:

1. **Specific to this article.** The anti-pattern is a real anti-pattern in
   this subject. "Do not skip validation" is not an anti-pattern, it is a
   platitude. Name the thing this article is actually about.
2. **It carries data.** Each half contains at least one concrete quantity: a
   count, a threshold, a tolerance, a duration, a number of stores, a number
   of states. The number must come from the article itself or be arithmetic on
   numbers the article already gives. **Never invent a statistic, a benchmark,
   a percentage or a citation.** If the article has no number for a claim, the
   claim does not need one.
3. **It names a cost.** Every "do this" has a price: an extra hop, an extra
   store, an extra state to reconcile, latency, an operational burden. A
   conclusion that only says "and it is better" is not a conclusion.
4. **It names a property.** The sentence that says what the pattern buys is the
   sentence a reader quotes back to their team. Make it checkable: something
   that can be true or false about the system, not an opinion about quality.
5. **It names no product.** No "in our implementation", no vendor, no link,
   no "the product this is built on".
6. **It does not repeat the FAQ.** The FAQ answers questions; this section
   gives the position. If a sentence could sit in either, it belongs here and
   the FAQ keeps the narrower question.

Length: 120–200 words per half. Do not pad. If the article has already made
the argument well, the conclusion is short and sharp, not a summary of the
whole article. The floor is 120 rather than 110 because the section is read
as a block: two halves plus the three headings have to clear 240 words
together, and two 110-word halves do not.

Do not claim more than the article claims. Read the article's own
"Limitations worth stating" section before you write the "What to do" half:
if the article says a limit is real, the conclusion must not wave it away.
Three of the 24 articles have no such section — where the article states a
limit somewhere else, the conclusion must not wave that away either.

## Worked example

From `2026-06-26-agent-budget-is-a-permission-not-a-limit.md`.

The article used to end with this:

```markdown
## Where this runs

NullRun keeps the enforcement counter and the audit total as two separate
numbers. The counter is read atomically with the projection of the
post-decision total, so two concurrent requests cannot both fit. The
reservation is bound to a server-minted execution ID in that same
operation, and settlement re-reads the ownership binding before it
touches the counter.

That is what makes the budget a permission. It answers "may this call
proceed" with the same atomicity that the authorization decision itself
has, and the answer is recorded as a decision, including when it is "no".
The [API reference](https://nullrun.io/docs/api) covers the wire shapes.
```

It now has this section, before the FAQ:

```markdown
## What to do, and what not to

### What not to

Do not check a balance and then write the spend. The two-step version, where
the counter is read before it is incremented, lets twenty concurrent calls
each see a clear slot, and the agent that loses the race is the one whose
work was funded and nobody's. The number on the dashboard stays right,
because the counter is the counter, but the answer to "may this call
proceed" is a race, and a race has no answer that survives contact with a
queue. It looks like accounting and it behaves like accounting: it tells you
what happened and it cannot tell you what to stop. An agent working a ticket
queue issues a thousand cheap calls in an hour, and the projection at each
call site says there is headroom, because each call costs a fraction of what
is left. By the time the aggregate is visible, the work the operator never
intended to fund is done.

### What to do

Reserve the cost in the same atomic operation that compares it against the
cap, bind the reservation to a server-minted execution ID, and settle against
the *authorized* reservation with a fixed-cent tolerance. The cap then bounds
authorized spend rather than observed spend, and the refusal message carries
the projected total, the outstanding holds and the cost of the refused call,
which is the difference between an operator who can tell a loop from a cap
that is simply too low and one who cannot. The counter is the server's: the
SDK reports usage so cost can be settled, but a caller that supplies the
number being limited supplies its own limit, so an estimate from the agent
leaves the budget in the agent's hands. The price is one store operation on
the decision path, one more piece of state to reconcile when a reservation is
never settled, and a tolerance that admits a little overage by design.
```

Read what happened. The technical content of the deleted section did not
vanish: the single atomic read, the server-minted execution ID, the
re-read of ownership at settlement — all three are still there, in the
conclusion, where they are now argued for instead of advertised. The
article ends on the argument rather than on a link.

## The check you run before you report back

```bash
grep -rin "nullrun" <the file>
```

Must print nothing. Then re-read your new section against the six rules, and
then re-read the article's "Limitations worth stating" section — if it has
one; three of the 24 do not — and confirm your conclusion does not contradict
it.
````
