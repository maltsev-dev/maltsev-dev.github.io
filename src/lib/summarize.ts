/**
 * One-line summaries of post bodies.
 *
 * Two callers need the same thing: the agent map (`/llm.txt`) wants one line
 * per post, and a post page wants a meta description that is not a second copy
 * of its title. Both want the first real sentence of the body, so the helper
 * lives here rather than inside either of them.
 *
 * Posts carry no summary field of their own, so the opening paragraph is what
 * an agent would read anyway — but taken raw it starts with emoji, headings,
 * `<!-- more -->` markers and tables. Skipping anything that is not a sentence
 * keeps the result a description rather than a fragment.
 */

/** The band a search snippet actually shows, and the length a description should reach. */
const MIN_DESCRIPTION = 100;
const MAX_DESCRIPTION = 160;

/**
 * Shorten to roughly a sentence and a half.
 *
 * Cutting at the last full stop reads far better than cutting at the character
 * limit: a description that ends on a sentence is usable on its own, while one
 * that ends mid-clause reads as a truncation bug. Where the paragraph has no
 * stop that early — a run-on, or a long first sentence — fall back to the word
 * boundary and mark it honestly.
 */
export function truncate(para: string, limit = 190): string {
  if (para.length <= limit) return para;

  const head = para.slice(0, limit);
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (stop > limit * 0.45) return head.slice(0, stop + 1);

  return head.slice(0, head.lastIndexOf(' ')) + '…';
}

/**
 * The paragraphs of a body that are worth reading as prose.
 *
 * Comments, code fences, images, links and emoji are stripped first — several
 * posts open with a raw-HTML lede, and the emoji carry section markers rather
 * than words. Then anything that is not a sentence goes: headings, labels,
 * bylines, list items and table rows.
 */
function paragraphs(body: string | undefined): string[] {
  if (!body) return [];

  const text = body
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]+>/g, ' ') // some posts open with a raw-HTML lede
    .replace(/[*_`>|]/g, '')
    // Emoji carry the section markers in the embedded posts, and several are
    // decorative rather than words. Dropped so the sentence underneath them is
    // what gets judged.
    .replace(/\p{Extended_Pictographic}|[︎️]/gu, ' ');

  const out: string[] = [];

  for (const raw of text.split(/\n\s*\n/)) {
    const para = raw.replace(/\s+/g, ' ').trim();
    if (para.length < 70) continue;
    if (/^(?:[-–—•*+|\]]|\d+[.)])\s/.test(para)) continue; // list item, table row
    if (/^[A-Z0-9"'(]/.test(para) && /\d\.\s+\S/.test(para.slice(40))) continue; // a numbered list folded into one paragraph
    if (!/^[A-Z0-9"'(]/.test(para)) continue; // a stray fragment
    // Long enough to describe the post. Shorter paragraphs are titles, labels
    // and bylines — the ones worth skipping are the repeats of the heading.
    if (para.split(/\s+/).length < 16) continue;

    out.push(para);
  }

  return out;
}

/**
 * The first real paragraph of a post, as one line.
 *
 * This is what the agent map shows next to each post: one honest line about
 * what it is.
 */
export function summarize(body: string | undefined): string {
  const first = paragraphs(body)[0];
  return first ? truncate(first) : '';
}

/**
 * A meta description for a post: its own if it has one, otherwise the first
 * real sentence of its body.
 *
 * The title is the last resort, and it is only used when the body yields
 * nothing at all — a description that repeats the title is what this whole
 * exercise exists to stop.
 *
 * A first paragraph shorter than a search snippet is padded with the opening
 * of the next one: a 90-character description is cut short in the results,
 * and the sentence that follows it is the same post's anyway.
 */
export function describe(title: string, body: string | undefined, own?: string): string {
  if (own && own.trim()) return own.trim();

  const paras = paragraphs(body);
  if (!paras.length) return title;

  let text = truncate(paras[0], MAX_DESCRIPTION);

  if (text.length < MIN_DESCRIPTION) {
    for (const para of paras.slice(1)) {
      const sentence = para.split(/(?<=[.!?])\s+/)[0];
      if (!sentence) continue;
      const next = (text + ' ' + sentence).trim();
      if (next.length > MAX_DESCRIPTION) break;
      text = next;
      if (text.length >= MIN_DESCRIPTION) break;
    }
  }

  return text;
}

/**
 * Below this many words a post is a note, not an essay.
 *
 * The corpus runs to a median of about nine hundred words, and thirteen of
 * the sixty-nine posts come in under a third of that. They are not broken —
 * a post that answers one question in three paragraphs is doing its job — but
 * the index cannot treat them the same as the long ones: a reader choosing
 * what to open is choosing between a weekend's reading and a Tuesday's.
 */
export const SHORT_POST_WORDS = 400;

/** How many words a body has. Code, markup and images do not count. */
export function wordCount(body: string | undefined): number {
  if (!body) return 0;
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  return text.split(/\s+/).filter(Boolean).length;
}

/** Whether a post is a note rather than an essay. */
export function isShort(body: string | undefined): boolean {
  return wordCount(body) < SHORT_POST_WORDS;
}

/**
 * How long a post takes to read.
 *
 * Two hundred words a minute is the usual figure for adult prose, and the
 * number is now computed from the body rather than written into a post's
 * front matter — the one post that carried a hardcoded "7 min read" was the
 * only reading time on the site, and it had already drifted.
 *
 * The minimum is one minute: a short note is still a minute of someone's
 * attention, and "0 min read" reads like a broken widget.
 */
export function readingTime(body: string | undefined): number {
  return Math.max(1, Math.round(wordCount(body) / 200));
}
