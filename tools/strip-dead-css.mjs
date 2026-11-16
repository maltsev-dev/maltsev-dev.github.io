// Remove the CSS rules that style nothing the site ships.
//
//   node tools/strip-dead-css.mjs <dead-json> <stylesheet> [...]
//
// The rule that decides: a CSS rule requires every class in its selector to
// be present on the element, so one dead class is enough to kill it —
// `.card-row.is-scrollable` can never match if nothing ever carries
// `card-row`, however often the script sets `is-scrollable`. The exception
// is a class inside `:not(...)`, which asks for the *absence* of a class
// and so does not require it to exist.
//
// A selector *list* is a set of alternatives, so one dead selector does not
// kill the rule: `.section-head h2, .sticky-head h2` still styles the
// section head after the sticky head is gone.
//
// A comment that documents a rule that is going is taken with it, and a
// conditional group whose rules are all going is taken whole. @keyframes,
// @font-face and @page are kept: they are not class selectors, and the
// dead-class measurement does not see them.
//
// How it works: the comments are swapped for one-character placeholders, the
// stylesheet is parsed, the edits are computed and applied, and the comments
// are put back. A placeholder that was inside a deleted rule is never put
// back, which is exactly the behaviour wanted — the comment documenting a
// rule that is going goes with it.
//
// The file is edited in place. Read the diff before keeping it.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonPath = process.argv[2];
const sheets = process.argv.slice(3);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const dead = new Set(JSON.parse(readFileSync(join(repoRoot, jsonPath), 'utf8')));

/** Swap every comment for a placeholder that no rule can mistake for one. */
function maskComments(css) {
  const comments = [];
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const close = css.indexOf('*/', i + 2);
      const end = close === -1 ? css.length : close + 2;
      comments.push(css.slice(i, end));
      out += `${comments.length - 1}`;
      i = end;
      continue;
    }
    out += css[i];
    i++;
  }
  return { masked: out, comments };
}

/** The classes a selector needs, ignoring the ones inside `:not(...)`. */
function classesOf(selector) {
  const s = selector.replace(/:not\([^)]*\)/g, ' ');
  return [...s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
}

/** Split a selector list on its top-level commas. */
function splitSelectors(selector) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(selector.slice(start, i));
      start = i + 1;
    }
  }
  out.push(selector.slice(start));
  return out;
}

/** The selectors of a rule that still match something. */
function liveSelectors(selector) {
  return splitSelectors(selector)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !classesOf(s).some((c) => dead.has(c)));
}

/**
 * Rewrite a selector list, keeping the whitespace at its edges.
 *
 * The range being replaced runs from the end of the previous item to the
 * opening brace, so the space before the brace and the newline before the
 * selector are inside it. Both have to come back.
 */
function rewriteSelector(selector, live) {
  const lead = selector.match(/^\s*/)[0];
  const trail = selector.match(/\s*$/)[0];
  return lead + live.join(',\n') + trail;
}

/**
 * The items of a stylesheet.
 *
 * Each is { kind, start, end, selStart, braceAt } where kind is one of
 * 'comment', 'rule' or 'at'.
 */
function items(css) {
  const out = [];
  let i = 0;
  let selStart = 0;
  while (i < css.length) {
    const ch = css[i];

    if (ch === '@') {
      const brace = css.indexOf('{', i);
      const semi = css.indexOf(';', i);
      if (semi !== -1 && (brace === -1 || semi < brace)) {
        out.push({ kind: 'at', start: i, end: semi + 1 });
        i = semi + 1;
        selStart = i;
        continue;
      }
      let depth = 0;
      let j = brace;
      for (; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      out.push({ kind: 'at', start: i, end: j + 1 });
      i = j + 1;
      selStart = i;
      continue;
    }

    if (ch === '}') {
      i++;
      continue;
    }

    const brace = css.indexOf('{', i);
    if (brace === -1) break;
    let depth = 0;
    let j = brace;
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push({ kind: 'rule', start: selStart, end: j + 1, selStart, braceAt: brace });
    i = j + 1;
    selStart = i;
  }
  return out;
}

const isGroup = (text) => /^\s*@(media|supports|layer|container)\b/.test(text);

/** The edits a conditional group needs. Returns null when it ends up empty. */
function groupEdits(text, offset, edits) {
  const open = text.indexOf('{');
  const head = text.slice(0, open);
  const body = text.slice(open + 1, text.lastIndexOf('}'));
  const inner = items(body);
  const kept = [];

  for (const it of inner) {
    if (it.kind === 'rule') {
      const selector = body.slice(it.selStart, it.braceAt);
      const live = liveSelectors(selector);
      if (!live.length) {
        edits.push({ start: offset + it.start, end: offset + it.end, text: '' });
        continue;
      }
      const all = splitSelectors(selector).filter((s) => s.trim());
      if (live.length !== all.length) {
        edits.push({
          start: offset + it.selStart,
          end: offset + it.braceAt,
          text: rewriteSelector(selector, live),
        });
      }
      kept.push(it);
    } else if (it.kind === 'at' && isGroup(text.slice(it.start, it.end))) {
      if (groupEdits(text.slice(it.start, it.end), offset + it.start, edits)) {
        kept.push(it);
      } else {
        edits.push({ start: offset + it.start, end: offset + it.end, text: '' });
      }
    } else {
      kept.push(it);
    }
  }

  return kept.length ? head : null;
}

for (const sheet of sheets) {
  const path = join(repoRoot, sheet);
  const original = readFileSync(path, 'utf8');
  const { masked, comments } = maskComments(original);
  const list = items(masked);
  const edits = [];

  for (let n = 0; n < list.length; n++) {
    const it = list[n];

    if (it.kind === 'at') {
      const text = masked.slice(it.start, it.end);
      if (!isGroup(text)) continue;
      if (groupEdits(text, it.start, edits)) continue;
      // The group is empty: take it, and the comment that documents it.
      const prev = list[n - 1];
      edits.push({ start: it.start, end: it.end, text: '' });
      if (prev && prev.kind === 'comment') {
        edits.push({ start: prev.start, end: prev.end, text: '' });
      }
      continue;
    }

    const selector = masked.slice(it.selStart, it.braceAt);
    const live = liveSelectors(selector);
    if (!live.length) {
      const prev = list[n - 1];
      edits.push({ start: it.start, end: it.end, text: '' });
      if (prev && prev.kind === 'comment') {
        edits.push({ start: prev.start, end: prev.end, text: '' });
      }
      continue;
    }
    const all = splitSelectors(selector).filter((s) => s.trim());
    if (live.length !== all.length) {
      edits.push({
        start: it.selStart,
        end: it.braceAt,
        text: rewriteSelector(selector, live),
      });
    }
  }

  // Apply the edits from the end of the file backwards, so the offsets of
  // the earlier ones stay valid.
  edits.sort((a, b) => b.start - a.start);
  let out = masked;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }

  // Put the comments back. A placeholder that was inside a deleted rule is
  // gone with it, and that is what should happen.
  out = out.replace(/(\d+)/g, (_, n) => comments[Number(n)] ?? '');

  writeFileSync(path, out, 'utf8');
  console.log(
    `${sheet}: ${original.split('\n').length} → ${out.split('\n').length} lines ` +
      `(${edits.filter((e) => !e.text).length} rules removed)`
  );
}
