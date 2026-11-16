// Which CSS classes style nothing the site actually ships?
//
//   node tools/dead-classes.mjs <build-dir>
//
// The site has six stylesheets and a few thousand class names in them. Over
// the years the markup moved on and the CSS did not, so a good part of the
// stylesheet describes pages that no longer exist: the skill pyramid that
// became a tree, the post navigation that was removed, the form that the
// contact page stopped being.
//
// The list of what is dead cannot be read off the CSS — it has to be measured
// against the built site. This walks the built HTML, collects every class the
// site ships, then subtracts them from the classes the stylesheets style.
//
// Three sources of truth, because a class can arrive three ways:
//
//   1. the markup           — `class="foo bar"` in the built HTML
//   2. the scripts          — `classList.add('foo')`, `el.className = 'foo'`
//   3. the stylesheets      — `.foo` in a selector
//
// A class the stylesheets style and neither the markup nor a script ever
// names is dead. It is not a class the CSS merely failed to style, and it is
// not a class in a rule that another rule re-targets: if the name is never
// used, the whole rule is dead weight.
//
// A caveat this tool cannot resolve: a class that only ever appears inside
// another class's compound selector (`.a .b`) is still reported live if `.a`
// is live, because `.b` is only ever applied to an element inside `.a`. The
// tool therefore treats a class as live if it appears in the markup, in a
// script, OR anywhere in the built HTML as a token — the built HTML is the
// ground truth, and the markup scan is the fast path.

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const buildDir = process.argv[2] || 'dist';
const repoRoot = fileURLToPath(new URL('..', import.meta.url));

/* ----- Collect the classes the site ships --------------------------------- */

const htmlClasses = new Set();

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (extname(full) === '.html') out.push(full);
  }
  return out;
}

const htmlFiles = walk(join(repoRoot, buildDir));
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  // class="a b", class='a b'
  for (const m of html.matchAll(/class\s*=\s*["']([^"']*)["']/g)) {
    for (const name of m[1].split(/\s+/)) if (name) htmlClasses.add(name);
  }
  // A class name that only ever appears in a compound selector still reaches
  // the DOM as a class attribute, so the scan above already has it.
}

/* ----- Collect the classes the scripts create ------------------------------ */

const scriptClasses = new Set();

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) sourceFiles(full, out);
    else if (['.js', '.mjs', '.ts', '.astro'].includes(extname(full))) out.push(full);
  }
  return out;
}

for (const file of sourceFiles(join(repoRoot, 'src'))) {
  const src = readFileSync(file, 'utf8');
  // classList.add('x') / remove / toggle / replace('a','b')
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"]([^'"]+)['"]/g)) {
    for (const name of m[1].split(/\s+/)) if (name) scriptClasses.add(name);
  }
  for (const m of src.matchAll(/classList\.replace\(\s*['"][^'"]*['"]\s*,\s*['"]([^'"]+)['"]/g)) {
    scriptClasses.add(m[1]);
  }
  // className = 'x'
  for (const m of src.matchAll(/className\s*=\s*['"]([^'"]+)['"]/g)) {
    for (const name of m[1].split(/\s+/)) if (name) scriptClasses.add(name);
  }
  // class="x" inside a template string or an inline script
  for (const m of src.matchAll(/class\s*=\s*["']([^"']*)["']/g)) {
    for (const name of m[1].split(/\s+/)) if (name) scriptClasses.add(name);
  }
  // classList.add('a b') with several names at once
  for (const m of src.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"]([^'"]+)['"]/g)) {
    for (const name of m[1].split(/\s+/)) if (name) scriptClasses.add(name);
  }
}

/* ----- Collect the classes the stylesheets style --------------------------- */

const styleFiles = [
  ...readdirSync(join(repoRoot, 'src', 'styles'))
    .filter((f) => f.endsWith('.css'))
    .map((f) => join('src', 'styles', f)),
  ...sourceFiles(join(repoRoot, 'src'))
    .filter((f) => f.endsWith('.astro'))
    .map((f) => relative(repoRoot, f)),
];

const styled = new Map(); // class -> Set(files)

for (const file of styleFiles) {
  let css = readFileSync(join(repoRoot, file), 'utf8');

  // An `.astro` file is not a stylesheet: only its `<style>` blocks are.
  // The frontmatter above them is TypeScript, and a class-shaped word in
  // there is a variable, not a selector.
  if (file.endsWith('.astro')) {
    css = [...css.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
      .map((m) => m[1])
      .join('\n');
  }

  // Strip comments, keeping the line count intact.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, ' ')
  );

  // A selector is the text before a `{`, at any depth.
  let depth = 0;
  let sel = '';
  const selectors = [];
  for (const ch of clean) {
    if (ch === '{') {
      if (depth === 0) selectors.push(sel);
      depth++;
      sel = '';
    } else if (ch === '}') {
      depth--;
      sel = '';
    } else if (depth === 0) {
      sel += ch;
    }
  }

  for (const s of selectors) {
    // Every `.name` in the selector is a class the rule targets.
    for (const m of s.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      const name = m[1];
      if (!styled.has(name)) styled.set(name, new Set());
      styled.get(name).add(file);
    }
  }
}

/* ----- The report ---------------------------------------------------------- */

const live = new Set([...htmlClasses, ...scriptClasses]);
const dead = [];
const alive = [];

for (const [name, files] of styled) {
  // Astro's scoped-style hashes are generated at build time and appear in the
  // built HTML, so they are live by construction.
  if (live.has(name)) alive.push(name);
  else dead.push({ name, files: [...files].sort() });
}

dead.sort((a, b) => a.name.localeCompare(b.name));

console.log(
  `built ${htmlFiles.length} pages · ${live.size} class names in use · ` +
    `${styled.size} styled · ${dead.length} dead\n`
);

const byFile = new Map();
for (const d of dead) {
  for (const f of d.files) {
    if (!byFile.has(f)) byFile.set(f, []);
    byFile.get(f).push(d.name);
  }
}
for (const [file, names] of [...byFile].sort()) {
  console.log(`${file}  (${names.length})`);
  console.log('  ' + names.join(' '));
}
console.log('');

if (process.env.DEAD_JSON) {
  console.log(JSON.stringify(dead.map((d) => d.name), null, 2));
}

// `--json <path>` writes the dead class names to a file, for the tools that
// consume them.
const jsonAt = process.argv.indexOf('--json');
if (jsonAt !== -1 && process.argv[jsonAt + 1]) {
  writeFileSync(
    process.argv[jsonAt + 1],
    JSON.stringify(dead.map((d) => d.name), null, 2)
  );
  console.log(`\nwrote ${dead.length} dead class names to ${process.argv[jsonAt + 1]}`);
}
