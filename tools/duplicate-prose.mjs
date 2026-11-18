// Which sentences does the site say more than once?
//
//   node tools/duplicate-prose.mjs <build-dir>
//
// The contract's fifth decision is "nothing is said twice": six places where
// one sentence appears on two or three pages, and four places where one page
// says the same thing twice. That claim is checkable, and it is checked here
// against the built site rather than against the source.
//
// The measure is a sentence: a run of words that ends in a full stop, a
// question mark or an exclamation mark. Short runs are ignored — a sentence
// of three words is a label, and the site's labels are supposed to repeat
// ("names", "index.html", "the service").
//
// A sentence that appears on two pages is a duplicate. A sentence that appears
// twice on the same page is a duplicate. Both are reported.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = process.argv[2] || 'dist';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const MIN_WORDS = 6;

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.html')) out.push(full);
  }
  return out;
}

/** The page's own words, with the markup and the scripts taken out. */
function visibleText(html) {
  // The comments come out first: a comment in the markup mentions `<main>`,
  // and a comment is not part of the page.
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Only the page itself. The chrome — the menu bar, the footer, the letter
  // dialog — lives outside `<main>`, and its words are printed once on the
  // site rather than once per page: they are the frame around the pages, not a
  // sentence the site says twice.
  const main = s.match(/<main\b[\s\S]*?<\/main>/i);
  s = main ? main[0] : s;
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
  return s.replace(/\s+/g, ' ').trim();
}

/** Split a run of text into sentences. */
function sentences(text) {
  const out = [];
  for (const part of text.split(/(?<=[.!?])\s+/)) {
    const clean = part.replace(/\s+/g, ' ').trim();
    const words = clean.split(' ').filter(Boolean);
    if (words.length >= MIN_WORDS) out.push({ text: clean, words: words.length });
  }
  return out;
}

const pages = walk(join(repoRoot, buildDir));
const seen = new Map(); // sentence -> [page, count]

for (const file of pages) {
  const rel = relative(join(repoRoot, buildDir), file).replace(/\\/g, '/');
  const text = visibleText(readFileSync(file, 'utf8'));
  const counted = new Map();
  for (const s of sentences(text)) {
    counted.set(s.text, (counted.get(s.text) ?? 0) + 1);
  }
  for (const [text, n] of counted) {
    if (!seen.has(text)) seen.set(text, []);
    seen.get(text).push({ page: rel, n });
  }
}

const crossPage = [...seen.entries()].filter(([, v]) => v.length > 1);
const inPage = [...seen.entries()].filter(([, v]) => v.length === 1 && v[0].n > 1);

console.log(`built ${pages.length} pages\n`);

console.log(`--- said on more than one page (${crossPage.length}) ---`);
for (const [text, where] of crossPage.sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n"${text}"`);
  for (const w of where) console.log(`    ${w.page}`);
}

console.log(`\n--- said twice on one page (${inPage.length}) ---`);
for (const [text, where] of inPage) {
  console.log(`\n"${text}"  x${where[0].n}  ${where[0].page}`);
}
console.log('');
