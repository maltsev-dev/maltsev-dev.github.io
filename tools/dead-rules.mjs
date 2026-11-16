// Print every CSS rule that mentions a dead class, so the sweep can be done
// by hand rather than by regex.
//
//   node tools/dead-rules.mjs <dead-json> <stylesheet>

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsonPath = process.argv[2] || 'tmp/dead.json';
const sheet = process.argv[3] || 'src/styles/global.css';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const dead = new Set(JSON.parse(readFileSync(join(repoRoot, jsonPath), 'utf8')));
const css = readFileSync(join(repoRoot, sheet), 'utf8');

/** The stylesheet as rules: { start, end, selector }. */
const rules = [];
let depth = 0;
let selStart = 0;
let braceAt = 0;
for (let i = 0; i < css.length; i++) {
  const ch = css[i];
  if (ch === '{') {
    if (depth === 0) braceAt = i;
    depth++;
  } else if (ch === '}') {
    depth--;
    if (depth === 0) {
      // The selector is the text between the previous rule and this brace.
      const selector = css.slice(selStart, braceAt).trim();
      rules.push({ start: selStart, end: i + 1, selector });
    }
  }
  if (depth === 0 && ch === '}') selStart = i + 1;
}

let printed = 0;
for (const rule of rules) {
  // A rule requires every class in its selector to be present. So one dead
  // class is enough to kill it: `.card-row.is-scrollable` can never match
  // if no element ever carries `card-row`, however often the script sets
  // `is-scrollable`. The exception is a class inside `:not(...)`, which asks
  // for the *absence* of a class and so does not require it to exist.
  const selector = rule.selector.replace(/:not\([^)]*\)/g, ' ');
  const classes = [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
  if (!classes.length) continue;
  const d = classes.filter((c) => dead.has(c));
  if (!d.length) continue;
  const line = css.slice(0, rule.start).split('\n').length;
  console.log(`DEAD  ${sheet}:${line}  ${rule.selector.replace(/\s+/g, ' ')}`);
  printed++;
}
console.log(`\n${printed} rules are dead.`);
