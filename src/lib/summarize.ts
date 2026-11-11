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

/**
 * The band a search snippet actually shows.
 *
 * A description shorter than this is cut short in the results, so the builder
 * keeps adding sentences until it reaches this length or runs out of prose.
 */
const MIN_DESCRIPTION = 100;

/**
 * The longest a one-line description may be.
 *
 * The same line is used for the meta description, the RSS entry and the card
 * on an index, so what a reader reads on the page is what a search result
 * shows. Two hundred characters is where the corpus's sentences stop: the
 * longest opening paragraph in the corpus runs past it and is cut at a clause,
 * but every shorter one is kept whole — and a whole sentence is the part that
 * matters.
 */
export const MAX_DESCRIPTION = 200;

/** A bullet, a dash or a number at the start of a line. */
const LIST_MARKER = /^(?:[-–—•*+]|\d+[.)])\s/;

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
    .replace(/<table[\s\S]*?<\/table>/gi, ' ') // a table is rows, not prose
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/<[^>]+>/g, ' ') // some posts open with a raw-HTML lede
    .replace(/\p{Extended_Pictographic}|[︎️]/gu, ' ')
    // A heading is a block of its own. Left in the flow of the text it folds
    // into the paragraph below it, and a summary that opens with a heading
    // reads as a table of contents rather than a description.
    .replace(/^[ \t]*#{1,6}[ \t]+.*$/gm, '\n\n$&\n\n');

  const out: string[] = [];

  for (const raw of text.split(/\n\s*\n/)) {
    const lines = raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;

    // A list or a table, read before the markers are stripped: the asterisks
    // and the pipes are what say "this is a list", and both are gone by the
    // time the emphasis is removed below. An item whose lines wrap is a list
    // too, so the first line decides it.
    if (lines.every((l) => LIST_MARKER.test(l))) continue;
    if (lines.every((l) => l.startsWith('|'))) continue;
    if (LIST_MARKER.test(lines[0])) continue;
    // A label over a list — "**Advantages**" and then the items — is the
    // list with a heading on it, not a sentence.
    if (
      lines.length > 1 &&
      /^\*\*[^*]{1,80}\*\*$/.test(lines[0]) &&
      lines.slice(1).every((l) => LIST_MARKER.test(l))
    ) {
      continue;
    }

    const kept: string[] = [];
    for (const [i, line] of lines.entries()) {
      // A bold phrase on a line of its own is a heading when a sentence
      // follows it, and a lede when it stands alone.
      if (/^\*\*[^*]{1,80}\*\*$/.test(line)) {
        const next = lines[i + 1];
        const nextIsProse = next ? next.replace(/[*_`>]/g, '').trim().length >= 70 : false;
        if (nextIsProse) continue;
        kept.push(line);
        continue;
      }

      const inline = /^\*\*[^*]{1,60}\*\*(.*)$/.exec(line);
      if (inline) {
        const rest = inline[1].trim();
        // A term that stands on its own: the emphasis is a label and the
        // sentence after it is the one worth keeping. `**Rust** is a game
        // changer.` is one sentence with an emphasised word in it, so the
        // lower case after the emphasis gives it away.
        if (rest.length >= 70 && /^\p{Lu}/u.test(rest)) {
          kept.push(rest);
          continue;
        }
      }

      kept.push(line);
    }
    if (!kept.length) continue;

    const para = kept
      .join(' ')
      // Emphasis markers go, but the words inside them stay intact — an
      // identifier like `delete_user` is not emphasis, and stripping the
      // underscore turns it into `deleteuser`.
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])/g, '$1')
      .replace(/`/g, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (para.length < 70) continue; // titles, labels and bylines
    if (!/^[A-Z0-9"'(]/.test(para)) continue; // a stray fragment
    // Long enough to describe the post. Shorter paragraphs are titles, labels
    // and bylines — the ones worth skipping are the repeats of the heading.
    if (para.split(/\s+/).length < 16) continue;

    out.push(para);
  }

  return out;
}

/**
 * Split a paragraph into sentences.
 *
 * The next word has to start a new sentence for the split to happen, so an
 * abbreviation inside a sentence (`e.g. the CPU`) does not cut the paragraph
 * in half. The abbreviations that end in a full stop are put back together by
 * hand: `e.g.` and `i.e.` are followed by a capital often enough to look like
 * the start of a sentence, and a summary that ends on "(e.g." reads as a typo.
 */
function sentencesOf(para: string): string[] {
  const parts = para.split(/(?<=[.!?])\s+(?=["'(\p{Lu}])/u);
  const out: string[] = [];

  for (const part of parts) {
    const prev = out[out.length - 1];
    if (prev && /\b(?:e\.g|i\.e|etc|vs|approx|cf)\.$/i.test(prev)) {
      out[out.length - 1] = `${prev} ${part}`;
      continue;
    }
    out.push(part);
  }

  return out.filter(Boolean);
}

/**
 * A word that opens a clause rather than continuing a list.
 *
 * A preposition or a participle after a comma starts a new part of the
 * sentence: "…from the surrounding world, performing necessary calculations"
 * is one sentence with a second half, and "…the concept of bits, in addition
 * to using bits…" is a clause that can stand on its own. A noun after a comma
 * is a list item instead, and a list is not a place to stop.
 */
const CLAUSE_OPENER =
  /^(?:in|on|at|by|for|from|with|without|to|into|onto|over|under|about|during|after|before|while|when|since|because|as|per|via|through|within|across|along|around|behind|beyond|despite|except|inside|outside|unlike|plus|versus|and|or|but|so|yet|nor|than|that|which|who)\b/i;

const PARTICIPLE = /^\p{L}+ing\b/iu;

/**
 * The last place in a fragment where the writer paused.
 *
 * A colon, a semicolon or a dash always opens a new clause. A comma only does
 * when what follows it begins one — a capital letter or a conjunction. Without
 * that rule the cut lands in the middle of a list: "the processor, peripherals,
 * timers" is not a pause, it is three of four items.
 *
 * The continuation is the whole text that follows the fragment, not only what
 * is left inside the limit: a comma in the last word of a cut is still a
 * comma, and the word after it is what says whether the clause ends there.
 *
 * The soft pass is the fallback for a sentence with no full stop in it at all.
 * There the comma is the only boundary there is, and a preposition or a
 * participle after it is enough to say the clause ended there.
 */
function lastClause(fragment: string, continuation: string, soft = false): number {
  const marks = [': ', '; ', ' — ', ', '];
  const found: { at: number; len: number; strong: boolean }[] = [];

  for (const mark of marks) {
    let at = fragment.lastIndexOf(mark);
    while (at !== -1) {
      found.push({ at, len: mark.length, strong: mark !== ', ' });
      at = fragment.lastIndexOf(mark, at - 1);
    }
  }

  found.sort((a, b) => b.at - a.at);

  for (const c of found) {
    if (c.strong) return c.at;
    const rest = continuation.slice(c.at + c.len);
    if (/^["'(\p{Lu}]/u.test(rest)) return c.at;
    if (/^(?:and|but|or|so|yet|because|since|when|while|if|that|which)\b/i.test(rest)) {
      return c.at;
    }
    if (soft && (CLAUSE_OPENER.test(rest) || PARTICIPLE.test(rest))) return c.at;
  }

  return -1;
}

/**
 * Cut a summary back to the last bracket that was closed.
 *
 * A cut that lands inside a bracket leaves "(e.g." at the end of a line, which
 * reads as a typo rather than a summary. The text before the last unmatched
 * bracket is whole, so that is where the summary ends.
 */
function closeBrackets(text: string): string {
  const open: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') open.push(i);
    else if (text[i] === ')' && open.length) open.pop();
  }
  return open.length ? text.slice(0, open[0]).trimEnd() : text;
}

/**
 * A bracket that closes the sentence.
 *
 * "…usually between two components (MCU and Sensor, LCD etc)" — the bracket is
 * a supplement, and a summary that keeps it spends its last characters on a
 * list of examples. When the bracket closes the sentence, the sentence reads
 * better without it.
 *
 * The index of the bracket in the fragment, or -1 when there is none.
 */
function trailingBracket(fragment: string, continuation: string): number {
  const at = fragment.lastIndexOf('(');
  if (at === -1) return -1;

  const close = continuation.indexOf(')', at);
  if (close === -1) return -1;

  // Only a supplement: it closes the sentence and it is short.
  if (!/^\.?\s*$/.test(continuation.slice(close + 1))) return -1;
  if (close - at > 60) return -1;

  return at;
}

/**
 * Cut a summary to a limit without leaving it mid-thought.
 *
 * A sentence is the first place to stop. Failing that, a clause — the writer's
 * own pause. Failing that, a bracket that only adds examples. Failing that,
 * the last whole word, marked honestly with an ellipsis, which is the one place
 * a summary is allowed to end unfinished.
 */
function cut(text: string, limit: number): string {
  if (text.length <= limit) return text;

  const head = text.slice(0, limit);

  // The last complete sentence inside the limit. When the head ends inside a
  // sentence, that sentence is the fragment to be cut further.
  const stop = Math.max(
    head.lastIndexOf('. '),
    head.lastIndexOf('! '),
    head.lastIndexOf('? '),
    head.endsWith('.') ? head.length - 1 : -1
  );

  const done = stop >= 0 ? text.slice(0, stop + 1) : '';
  let start = stop >= 0 ? stop + 1 : 0;
  if (text[start] === ' ') start += 1;

  const fragment = text.slice(start, limit);
  const continuation = text.slice(start);

  const clause = lastClause(fragment, continuation);
  if (clause >= 0) {
    const tail = fragment.slice(0, clause).trimEnd();
    return closeBrackets(done ? `${done} ${tail}`.trimEnd() : tail);
  }

  // A complete sentence beats a broken one, even when it is shorter.
  if (done) return closeBrackets(done.trimEnd());

  // A bracket that only adds examples is not worth the characters.
  const bracket = trailingBracket(fragment, continuation);
  if (bracket >= 0) {
    const tail = fragment.slice(0, bracket).trimEnd().replace(/[,;:]$/, '');
    return closeBrackets(done ? `${done} ${tail}`.trimEnd() : tail);
  }

  // A sentence with no full stop in it has one boundary left: its last comma.
  // The line is better off ending at a comma than in the middle of a word.
  const soft = lastClause(fragment, continuation, true);
  if (soft >= 0) {
    const tail = fragment.slice(0, soft).trimEnd();
    return closeBrackets(done ? `${done} ${tail}`.trimEnd() : tail);
  }

  const word = head.lastIndexOf(' ');
  return closeBrackets(head.slice(0, word > 0 ? word : limit).trimEnd()) + '…';
}

/**
 * End a summary as a sentence.
 *
 * A cut can leave the line without a full stop. The last clause came off at a
 * comma, or a bracket was dropped to keep the text whole, or the paragraph
 * itself opened a list with a colon that the summary does not carry. On a card
 * that reads as a truncation rather than as a sentence, so the line gets its
 * punctuation back.
 *
 * A line that already ends on a full stop, a question mark, an exclamation or
 * an ellipsis is left exactly as it is, and so is a line that ends on a word
 * that cannot end a sentence: "…under the" becomes "…under the toolkit." is
 * not an improvement, so such a line loses its last word instead.
 */
const DANGLING = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'so', 'yet', 'nor', 'of', 'to', 'in',
  'on', 'at', 'by', 'with', 'from', 'as', 'into', 'onto', 'over', 'under',
  'about', 'after', 'before', 'between', 'through', 'that', 'which', 'who',
  'whose', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'their', 'his', 'her', 'this', 'these', 'those', 'my', 'your', 'our', 'not',
  'than', 'then', 'if', 'when', 'while', 'because', 'since',
]);

function finish(text: string): string {
  let line = text.trimEnd();
  if (!line) return line;
  if (line.endsWith('…')) return line;
  if (/[.!?]["'”’)\]]*$/.test(line)) return line;

  // A colon or a semicolon opens a list or a quote that the summary does not
  // carry. As the last mark on the line it promises something the line does
  // not deliver, so it becomes a full stop.
  if (/[:;]$/.test(line)) return `${line.slice(0, -1)}.`;

  // A line that ends on a word which cannot end a sentence has been cut in the
  // wrong place. The word goes; the punctuation takes its place.
  for (;;) {
    const word = /([\p{L}\p{N}'’-]+)[,;:]?$/u.exec(line);
    if (!word) break;
    if (!DANGLING.has(word[1].toLowerCase())) break;
    line = line.slice(0, line.length - word[0].length).trimEnd();
    if (!line) return text.trimEnd();
  }

  return `${line}.`;
}

/**
 * Build a summary out of whole sentences.
 *
 * The first sentence that runs past the limit is the one that gets cut, and the
 * cut happens at a clause, at a bracket, or at the last whole word — never in
 * the middle of a word. A complete sentence always beats a broken one, so the
 * cut gives up rather than leaving a fragment.
 */
function build(paras: string[], limit: number): string {
  let text = '';

  for (const para of paras) {
    for (const sentence of sentencesOf(para)) {
      const candidate = text ? `${text} ${sentence}` : sentence;
      if (candidate.length > limit) return finish(cut(candidate, limit));
      text = candidate;
      if (text.length >= MIN_DESCRIPTION) return finish(text);
    }
  }

  return finish(text);
}

/**
 * The first real paragraph of a post, as one line.
 *
 * This is what the agent map shows next to each post: one honest line about
 * what it is.
 */
export function summarize(body: string | undefined): string {
  const paras = paragraphs(body);
  return paras.length ? build(paras, MAX_DESCRIPTION) : '';
}

/**
 * A description for a post: its own if it has one, otherwise the first real
 * sentences of its body.
 *
 * The title is the last resort, and it is only used when the body yields
 * nothing at all — a description that repeats the title is what this whole
 * exercise exists to stop.
 *
 * A short first sentence is padded with the sentences that follow it: a
 * ninety-character description is cut short in the results, and the sentence
 * that follows it is the same post's anyway.
 */
export function describe(
  title: string,
  body: string | undefined,
  own?: string,
  limit = MAX_DESCRIPTION
): string {
  if (own && own.trim()) return own.trim();

  const paras = paragraphs(body);
  if (!paras.length) return title;

  return build(paras, limit);
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
