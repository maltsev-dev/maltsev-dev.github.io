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
7. **It does not recite the article.** A conclusion that restates the body's
   own sentences is a summary, not a position. Keep the numbers; write the
   mechanism fresh; add something the body does not say.

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

Read what happened. The technical content of the deleted section did not
vanish: the single atomic read, the server-minted execution ID, the
re-read of ownership at settlement — all three are still there, in the
conclusion, where they are now argued for instead of advertised. The
article closes on the argument and a FAQ rather than on a link.

## The check you run before you report back

```bash
grep -rin "nullrun" <the file>
```

Must print nothing. Then re-read your new section against the rules, and
then re-read the article's "Limitations worth stating" section. Three of the
24 articles do not have one; where the article states a limit somewhere else,
confirm your conclusion does not contradict it.
