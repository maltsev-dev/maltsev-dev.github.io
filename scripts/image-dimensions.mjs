// Measure the images the site does not host and record their size.
//
//   node scripts/image-dimensions.mjs
//
// The site hosts its own figures and their size is read from the file header
// at build time (src/plugins/rehype-image-attrs.mjs). The badges — the
// shields.io version badges and the GitHub action badges — live on someone
// else's server, so their size is measured once, here, and written to
// src/data/image-dimensions.json. The build itself never reaches the
// network: a build that depends on a third party answering is a build that
// fails when that third party is down.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from '../src/plugins/image-size.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const STATIC = join(ROOT, 'static');
const OUT = join(ROOT, 'src', 'data', 'image-dimensions.json');
const SOURCES = [
  join(ROOT, 'src', 'content', 'posts'),
  join(ROOT, 'src', 'content', 'projects'),
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

/** Every image URL the Markdown bodies reference. */
function imageSources() {
  const found = new Set();
  for (const dir of SOURCES) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const text = readFileSync(join(dir, name), 'utf-8');
      for (const m of text.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)) found.add(m[1]);
      for (const m of text.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) found.add(m[1]);
    }
  }
  return [...found].sort();
}

async function fetchSize(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return imageSize(buf);
}

async function main() {
  const sources = imageSources();
  const remote = sources.filter((s) => /^https?:/i.test(s));
  const local = sources.filter((s) => !/^https?:/i.test(s));

  const missing = local.filter((s) => {
    let path = s.split('#')[0].split('?')[0];
    try {
      path = decodeURIComponent(path);
    } catch {
      /* keep the raw path */
    }
    return !existsSync(join(STATIC, path.replace(/^\/+/, '')));
  });
  if (missing.length) {
    console.log(`[WARN] ${missing.length} local image(s) not found in static/:`);
    for (const m of missing) console.log('       ' + m);
  }

  const map = {};
  for (const url of remote) {
    try {
      const size = await fetchSize(url);
      if (!size) {
        console.log(`[WARN] no size for ${url}`);
        continue;
      }
      map[url] = { width: size[0], height: size[1] };
      console.log(`[OK] ${size[0]}x${size[1]}  ${url}`);
    } catch (err) {
      console.log(`[WARN] ${url} — ${err.message}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(map, null, 2) + '\n', 'utf-8');
  console.log(`\nwrote ${Object.keys(map).length} measured images to src/data/image-dimensions.json`);
}

await main();
