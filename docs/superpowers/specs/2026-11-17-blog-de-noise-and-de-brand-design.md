# De-noise the blog and take the product out of the articles

**Date:** 2026-11-17
**Status:** awaiting approval
**Scope:** the writing index, the article page, and the 24 posts in the `agent-runtime` topic.

---

## Intent and the why

The writing is the site's only durable asset. Right now it reads as a
funnel: every article ends with a section that says which product does
this, and the pages around the writing are dressed as a terminal so that
the *file paths* — `~/blog/2026-06-26-....md`, `-rw-r--r--` — look like
the subject matter. The subject matter is the argument about agent
runtime security. The costume is decoration that costs the argument
credibility twice: a reader who wants the argument has to read past the
pitch, and a reader who distrusts the pitch stops trusting the argument.

Two changes, both the same idea: **the writing should stand on its own
as technical writing.** Remove the noise, remove the product, and leave
the argument — with the conclusions the argument actually supports.

## Goals

- The `/blog/` listing carries no `mode` column.
- The article page carries no fake shell command and no file path.
- No article in the `agent-runtime` topic names, links to, or pitches a
  product.
- Every one of the 24 articles ends with an explicit, product-agnostic
  conclusion: **what not to do and why, what to do and why.**
- The articles keep their technical substance: the failure modes, the
  tables, the code, the checks, the FAQ.

## Non-goals

- No rewriting of the technical body of an article. The existing
  argument, its examples and its numbers stay; only product references
  and the closing section change.
- No change to the terminal *aesthetic*. The window frame, the LEDs, the
  monospaced listing and the filter chips are the site's design
  language, documented in `docs/research/2026-11-12-retro-terminal-aesthetic.md`.
  What goes is the fake shell command and the path, not the terminal.
- No change to the embedded-Rust and other topics. They never mentioned
  the product, and they are not in scope.

## Anti-goals

- **No new claims that need a source.** The new conclusion sections must
  be built from what the article already argues. No invented benchmark
  numbers, no statistics, no citations that were not checked. A number
  that appears in a conclusion must be a number already in the article or
  arithmetic on it.
- **No vendor-shaped hole where the product used to be.** Removing
  "NullRun does X" and leaving a sentence about how to build X is the
  goal; leaving a sentence about how to buy X is not.
- **No template monotony.** The 24 new sections share a shape — *what
  not to*, then *what to do* — but the content of each is specific to
  its article. Two articles about authorization must not read alike.

---

## Part 1 — the visual noise

### 1.1 The listing

The `mode` column is removed from every listing of posts:

| Page | Now | After |
|---|---|---|
| `/blog/` | `mode · date · min · topic · name` | `date · min · topic · name` |
| `/blog/` (Subjects) | `mode · posts · name · subject` | `posts · name · subject` |
| `/tags/{tag}/` | `mode · date · min · topic · name` | `date · min · topic · name` |
| `/` (latest writing) | `mode · date · min · name` | `date · min · name` |
| `/404/` (directory list) | `mode · date · name` | `date · name` |

`-rw-r--r--` and `drwxr-xr-x` are decoration: they are identical on every
row, so the column carries no information. It is dropped rather than
replaced.

The grid templates in `src/styles/tty.css` lose their first track, and
the narrow-screen rules that hid the mode column go with them.

### 1.2 The article page

Removed:

- the `root@amaltsev >:~/blog$ cat {slug}.md` prompt above the title;
- the same prompt again at the top of the window's body;
- `~/blog/{slug}.md` from the window's title bar, and the word count
  beside it;
- the `ls -la` and `grep -l "…"` prompts in the "more" window, and its
  `~/blog` title.

Kept: the window, the LEDs, the listing of neighbouring posts, the
"Related / Recent writing" line that explains what the listing is. The
reading time stays in the byline, where it is already printed.

---

## Part 2 — the articles

Scope: the 24 posts in the `agent-runtime` topic
(`src/data/topics.ts`), from `2026-04-07-the-ai-pipeline-is-not-optional`
to `2026-10-10-unknown-outcome-is-not-a-failure-state`. 23 of them end
with a `## Where this runs` section; the AI pipeline post does not.

### 2.1 What is removed

- The whole `## Where this runs` section, including the trailing
  paragraph and the product links.
- Every other reference to the product in the body: the ASCII diagrams
  that label a gate with a product name, the sentences of the form
  "X is the runtime authorization layer", the SDK import in a code
  sample, the `NULLRUN`-prefixed identifier, the product name inside a
  domain-separation string, and every `nullrun.io` link.

### 2.2 What replaces it

Nothing. The section goes, and the paragraph that sold the section goes
with it. What is left in its place is the new conclusion.

### 2.3 Terminology

The product is replaced by the *role*, so the text still says who does
what:

| In the article now | Becomes |
|---|---|
| `NullRun gate` (in a diagram) | `the gate` / `authorization gate` |
| "NullRun sits on the seam" | "the enforcement layer sits on the seam" |
| "NullRun evaluates the action" | "the enforcement layer evaluates the action" |
| `from nullrun import NullRun` | the HTTP call to the gate, or a neutral `gate.authorize(...)` |
| `NULLRUN` (identifier prefix) | `the gateway` / `the counter service` |
| `"nullrun/v1/business_impact:"` | `"approval/v1/business_impact:"` |
| `nullrun.io/docs`, `/security`, `/pricing` | deleted — the sentence carrying the link is rewritten without it |

**No vendor-shaped placeholder.** A replacement package name would be
a different product with the same problem. Where an SDK call is the
subject of a code sample, the sample shows the wire contract instead.

### 2.4 The new section

Every one of the 24 articles gains, immediately before `## FAQ`:

```markdown
## What to do, and what not to

### What not to

<The anti-pattern, named concretely. What it is, the mechanism by which it
fails, and the number in the article that shows it failing.>

### What to do

<The pattern. The mechanism that makes it hold, what it costs, and the
property it buys.>
```

Rules the section has to satisfy:

1. **It is specific to its article.** The anti-pattern is a real
   anti-pattern in this subject, not a generic "don't skip validation".
2. **It carries data.** Each half contains at least one concrete
   quantity: a count, a threshold, a tolerance, a duration, a failure
   rate the article already argues about. The numbers come from the
   article — no new statistics.
3. **It names a cost.** Every "do this" has a price: the extra hop, the
   extra store, the extra state to reconcile, the latency. A conclusion
   that only says "and it is better" is not one.
4. **It names a property.** The sentence that says what the pattern buys
   is the sentence a reader quotes back. It should be checkable.
5. **It names no product.** No "in our implementation", no vendor, no
   link.
6. **It does not repeat the FAQ.** The FAQ answers questions; this
   section gives the position.
7. **It does not recite the article.** A conclusion that restates the
   body's own sentences is a summary, not a position. Keep the numbers;
   write the mechanism fresh; add something the body does not say.

Two further constraints bind the section, and the brief carries both
because the workers only read the brief:

- Internal links to other posts keep the `/blog/{post-id}/` form, trailing
  slash included. A sentence that is rewritten to drop a product link keeps
  the shape of the links it still carries.
- The conclusion must not wave away a limit. Read the article's own
  "Limitations worth stating" section before writing the "what to do" half.
  Three of the 24 articles have no such section; where the article states a
  limit somewhere else, that limit binds the conclusion too.

Length: 120–200 words per half. Tone: the article's own — direct, second
person where the article is second person, concrete, no marketing.

### 2.5 A worked example

`2026-06-26-agent-budget-is-a-permission-not-a-limit.md`, current tail:

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

New tail:

```markdown
## What to do, and what not to

### What not to

Do not check a balance and then write the spend. Reading the counter and
incrementing it are two operations, and the gap between them is where the
money goes: twenty calls that each fit the cap on their own read will all
fit it together, and every one of them is individually correct. The counter
stays truthful, because it is counting what it was told to count, but the
question it was asked cannot be answered from it, because a number that has
already been spent is evidence about the past and not a decision about the
next call. The failure does not announce itself as an error either. The
dashboard is green the whole time, because an overrun is not visible until
the invoice arrives, and by then the calls that caused it are
indistinguishable from the calls that did not.

### What to do

Reserve the cost in the same atomic operation that compares it against the
cap, bind the reservation to a server-minted execution ID, and settle against
the *authorized* reservation with a fixed-cent tolerance. The cap then bounds
authorized spend rather than observed spend, and the refusal message carries
the projected total, the outstanding holds and the cost of the refused call,
which is the difference between an operator who can tell a loop from a cap
that is simply too low and one who cannot. The counter belongs to whoever
makes the decision, not to whoever reports the spend: a usage report settles
a number that was authorized, while an estimate that arrives with the
request leaves the limit inside the agent the limit is meant to bound. The
price is one store operation on the decision path, one more piece of state
to reconcile when a reservation is never settled, and a tolerance that
admits a little overage by design.
```

Note what happened: the technical content of the deleted section
(single atomic read, server-minted execution ID, re-read ownership at
settlement) did not vanish — it moved into the conclusion, where it is
now argued for rather than advertised. The article ends on the argument
instead of on a link.

---

## Part 3 — how it gets built

**Phase A — the chrome.** Four files: `src/pages/blog/index.astro`,
`src/pages/blog/[slug].astro`, `src/pages/tags/[tag].astro`,
`src/pages/index.astro`, `src/pages/404.astro`, plus the grid
templates in `src/styles/tty.css`.

**Phase B — the articles.** 24 files under `src/content/posts/`, six
parallel workers, four articles each, one shared brief. The brief
carries the transformation rules, the terminology table, the worked
example above and the house style.

**Phase C — verification.**

1. `npm run build` — the site builds.
2. `python _audit_links_astro.py` — the link gate passes (this is the
   CI gate; removing links must not break it).
3. `grep -ri nullrun src/content/posts/` — zero hits.
4. Every article has the new section, in the right place, once:
   `grep -c "^## What to do, and what not to"` = 1 in all 24.
5. Visual check at 1440 and 390 px: the listing, an article page, and
   the bottom of an article page.

## Approaches considered

**A. Remove the product mentions, leave the articles otherwise alone.**
Rejected: the argument still ends on a link, and the reader gets no
position to take away. The user's requirement was conclusions, not just
censorship.

**B. Rewrite all 24 articles from scratch.**
Rejected: it discards working prose and days of work to produce a
different set of words with the same argument, and the risk of a
regression is proportional to the amount of prose thrown away.

**C. Keep the `Where this runs` section, but make it product-agnostic.**
Rejected: the section's job is to say "we do this". There is no
product-agnostic version of a section whose reason to exist is the
product.

**Chosen: A + the new conclusion section.** The mechanical part is
mechanical; the part that needs judgement — the conclusion — is where
the editorial work goes, and it is where the article gains.

## The calls I made

- The `mode` column is removed from the tag pages, the home page and
  the 404 page as well, not only from `/blog/`. It is one decoration and
  the site should not have three versions of it.
- The new section goes **before** the FAQ, so the FAQ stays the last
  thing in the article and the conclusion reads as the position the FAQ
  elaborates.
- The word count in the article window's title bar goes with the path:
  the byline already prints the reading time, and the count was the
  other half of the `ls -la` costume.
- No external research is added. Every number in the new sections comes
  from the article it sits in.
