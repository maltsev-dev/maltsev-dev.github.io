// Renders the social cards.
//
// The first version of this file rendered one card: `/og.png`, a single
// picture every page on the site shared. A link preview that says nothing
// about the page it links to is worth very little — in a chat, a card that
// shows the site's homepage image is a card the reader swipes past.
//
// So the cards are generated per page. The site card stays as it was, and
// every post gets its own, carrying its title, its date and its first tag.
//
//   node _gen_og.mjs            # the site card plus one per post
//   node _gen_og.mjs --site     # only the site card
//   node _gen_og.mjs --posts    # only the post cards
//
// Writes static/og.png and static/og/<post-slug>.png.
//
// The cards are committed rather than built: they are images, and a build
// step that needs a browser would make the site unbuildable on a machine
// without one. Run this after a post is added or renamed.

import { chromium } from 'playwright';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const W = 1200,
  H = 630;
const POSTS_DIR = 'src/content/posts';
const OUT_DIR = 'static/og';

// ── the shared card look ────────────────────────────────────────────────────
//
// Everything below is inlined rather than linked, because the card is
// rendered by a browser that has never fetched the site.

const CARD_CSS = `
  @font-face { font-family: 'Anton'; src: local('Arial Narrow'); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    background: #14100a;
    color: #ffe2b0;
    font-family: 'Consolas', 'Cascadia Mono', ui-monospace, monospace;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 64px 72px;
    position: relative;
  }
  /* the same faint rule-work the site draws behind its panels */
  body::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background:
      repeating-linear-gradient(0deg, transparent 0 39px, rgba(58,42,20,.55) 39px 40px),
      repeating-linear-gradient(90deg, transparent 0 39px, rgba(58,42,20,.35) 39px 40px);
  }
  .top { display: flex; align-items: center; gap: 18px; position: relative; }
  .mark {
    width: 46px; height: 46px; display: grid; place-items: center;
    background: #e0501e; color: #14100a;
    font-weight: 700; font-size: 22px; letter-spacing: -1px;
    box-shadow: 5px 5px 0 #8c2a18;
  }
  .host { font-size: 22px; letter-spacing: 2px; color: #ffa02e; }
  h1 {
    position: relative;
    font-size: 74px; line-height: 1.06; letter-spacing: -2px;
    text-transform: uppercase; font-weight: 700; color: #ffe2b0;
    max-width: 20ch;
  }
  h1 em { font-style: normal; color: #e0501e; }
  .lede {
    position: relative;
    margin-top: 30px; font-size: 25px; line-height: 1.4; color: #ffa02e;
    max-width: 46ch;
  }
  .foot {
    position: relative; display: flex; align-items: center; gap: 16px;
    margin-top: 34px;
    font-size: 20px; letter-spacing: 3px; text-transform: uppercase;
    color: #ffe2b0;
  }
  .dot { width: 10px; height: 10px; background: #e0501e; border-radius: 50%; }
  .rule { flex: 1; height: 3px; background: #3a2a14; }
  .meta { display: flex; align-items: center; gap: 14px; }
  .meta .sep { opacity: .45; }
  .meta .tag { color: #e0501e; }
`;

/** Wrap card content in the shared shell. */
function card(inner) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${CARD_CSS}</style></head>
<body>${inner}</body></html>`;
}

/** The header line every card carries. */
function top() {
  return `<div class="top">
    <span class="mark">A|M</span>
    <span class="host">maltsev-dev.github.io</span>
  </div>`;
}

/** The footer line every card carries. */
function foot(text) {
  return `<div class="foot">
    <span class="dot"></span><span>${text}</span><span class="rule"></span>
  </div>`;
}

// ── front matter ───────────────────────────────────────────────────────────
//
// The posts are read straight off disk rather than through the content
// collection, because this script runs outside Astro. The front matter is
// three fields in a fixed shape, so a small reader is enough — and it keeps
// the script dependency-free.

/** The scalar value of a `key: value` front-matter line. */
function scalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

/** The tags of a post, from either an inline list or a block list. */
function frontmatter(raw) {
  if (!raw.startsWith('---')) return { title: '', date: '', tags: [] };
  const parts = raw.split('---', 2);
  if (parts.length < 2) return { title: '', date: '', tags: [] };

  const lines = parts[1].split('\n');
  let title = '';
  let date = '';
  const tags = [];
  let inTags = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (inTags) {
      if (trimmed.startsWith('- ')) {
        tags.push(scalar(trimmed.slice(2)));
        continue;
      }
      inTags = false;
    }

    if (trimmed.startsWith('title:')) {
      title = scalar(trimmed.slice(6));
    } else if (trimmed.startsWith('date:')) {
      date = scalar(trimmed.slice(5));
    } else if (trimmed.startsWith('tags:')) {
      const inline = trimmed.slice(5).trim();
      if (inline.startsWith('[') && inline.endsWith(']')) {
        for (const tag of inline.slice(1, -1).split(',')) {
          const value = scalar(tag);
          if (value) tags.push(value);
        }
      } else if (!inline) {
        inTags = true;
      }
    }
  }

  return { title, date, tags };
}

/** The posts on disk, with their front matter. */
function loadPosts() {
  let files = [];
  try {
    files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  } catch {
    return [];
  }

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const raw = readFileSync(join(POSTS_DIR, file), 'utf-8');
      return { slug, ...frontmatter(raw) };
    })
    .filter((post) => post.title);
}

/**
 * The title as the card shows it.
 *
 * Older posts carry a leading emoji as a section marker. It reads fine on the
 * page and badly on a card — a line of decoration in front of the words.
 */
function cardTitle(title) {
  const stripped = title.replace(/^[\p{Extended_Pictographic}\s️]+/u, '').trim();
  return stripped || title;
}

/** "2026-10-10" becomes "10 October 2026". */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function cardDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!match) return '';
  const [, year, month, day] = match;
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

// ── the cards ──────────────────────────────────────────────────────────────

/** The site card: what the site is, for every page that has nothing better. */
function siteCard() {
  return card(
    `${top()}
  <div>
    <h1>Agentic <em>engineering</em> that carries real work</h1>
    <p class="lede">AI operational systems · embedded and distributed systems · automation</p>
  </div>
  ${foot('available for work')}`
  );
}

/** One post's card: its title, its date and its first tag. */
function postCard(post) {
  const tag = post.tags[0] ? post.tags[0].replace(/_/g, ' ') : '';
  const meta = [cardDate(post.date), tag].filter(Boolean).join(' · ');

  return card(
    `${top()}
  <div>
    <h1>${cardTitle(post.title)}</h1>
    ${meta && `<p class="lede"><span class="meta">${meta}</span></p>`}
  </div>
  ${foot('Anatolii Maltsev')}`
  );
}

// ── the run ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const onlySite = args.includes('--site');
const onlyPosts = args.includes('--posts');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

/** Render one card and write it. */
async function shoot(html, path) {
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png' });
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  return buf.length;
}

if (!onlyPosts) {
  const size = await shoot(siteCard(), 'static/og.png');
  console.log(`static/og.png written — ${W}x${H}, ${(size / 1024).toFixed(0)} KB`);
}

// The touch icon.
//
// Apple does not read SVG favicons: a home-screen shortcut on iOS asks for a
// PNG and gets nothing if the site only offers the vector mark. The mark is
// drawn here from the same SVG the browser tab uses, at the 180 pixels iOS
// asks for, on the opaque background iOS expects — a transparent PNG is
// composited onto black by the launcher.
if (!onlyPosts) {
  const mark = readFileSync('static/favicon.svg', 'utf-8');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; }
  body { width: 180px; height: 180px; background: #e0501e; }
  svg { display: block; width: 180px; height: 180px; }
</style></head>
<body>${mark.replace(/width="64" height="64"/, 'width="180" height="180"')}</body></html>`;

  await page.setViewportSize({ width: 180, height: 180 });
  await page.setContent(html, { waitUntil: 'load' });
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  writeFileSync('static/apple-touch-icon.png', buf);
  console.log(`static/apple-touch-icon.png written — 180x180, ${(buf.length / 1024).toFixed(0)} KB`);
  await page.setViewportSize({ width: W, height: H });
}

if (!onlySite) {
  const posts = loadPosts();
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;

  for (const post of posts) {
    const size = await shoot(postCard(post), join(OUT_DIR, `${post.slug}.png`));
    total += size;
  }

  await browser.close();
  console.log(
    `${OUT_DIR}/ — ${posts.length} post cards written, ${(total / 1024 / 1024).toFixed(1)} MB total`
  );
} else {
  await browser.close();
}
