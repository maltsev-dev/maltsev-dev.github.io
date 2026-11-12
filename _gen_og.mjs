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
//
// ── the look ───────────────────────────────────────────────────────────────
//
// The card is the site, shrunk. It is a terminal window: the bar with its
// lamps, the prompt with the command that read the page, the title in the
// terminal face, the rule along the bottom with the date and the topic.
//
// The palette is the amber phosphor the site runs on, taken from the same
// tokens — P3 amber, the dark ground, the ember accent. A card that used a
// different palette would look like a card from another site.

import { chromium } from 'playwright';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { stripPictograms } from './src/plugins/rehype-strip-pictograms.mjs';

const W = 1200,
  H = 630;
const POSTS_DIR = 'src/content/posts';
const OUT_DIR = 'static/og';
const FONT_DIR = resolve('static/fonts');

/** The wordmark, in block characters. The same drawing the site uses. */
const BANNER = [
  '█   █   ███   █      █████   ████  █████  █   █',
  '██ ██  █   █  █        █    █      █      █   █',
  '█ █ █  █   █  █        █    █      █      █   █',
  '█   █  █████  █        █     ███   ████   █   █',
  '█   █  █   █  █        █        █  █      █   █',
  '█   █  █   █  █        █        █  █       █ █',
  '█   █  █   █  █████    █    ████   █████    █',
];

/** The faces, as absolute file URLs the browser can load. */
const fontUrl = (name) =>
  `url("file:///${join(FONT_DIR, name).replace(/\\/g, '/')}")`;

// ── the shared card look ────────────────────────────────────────────────────
//
// Everything below is inlined rather than linked, because the card is
// rendered by a browser that has never fetched the site. The fonts are the
// exception: they are the site's own files, read off disk.

const CARD_CSS = `
  @font-face {
    font-family: 'JetBrains Mono';
    src: ${fontUrl('jetbrains-mono-latin.woff2')} format('woff2');
    font-weight: 100 800;
    font-display: block;
  }
  @font-face {
    font-family: 'Cascadia Mono Art';
    src: ${fontUrl('cascadia-mono-art.woff2')} format('woff2');
    font-display: block;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --papier: #0d0a05;
    --rouille: #1a1207;
    --grid: #402c0e;
    --braise: #ff7a18;
    --encre: #ffb000;
    --creme: #ffe0a8;
    --fort: #e09a20;
  }

  body {
    width: ${W}px; height: ${H}px; overflow: hidden;
    background: var(--papier);
    color: var(--creme);
    font-family: 'JetBrains Mono', ui-monospace, 'Cascadia Mono', monospace;
    position: relative;
  }

  /* The grid the site draws behind its panels. */
  .grid {
    position: absolute; inset: 0; pointer-events: none;
    background:
      repeating-linear-gradient(0deg, transparent 0 39px, rgba(64,44,14,.55) 39px 40px),
      repeating-linear-gradient(90deg, transparent 0 39px, rgba(64,44,14,.34) 39px 40px);
  }

  /* The scanlines. The site draws them on a screen; a card is a picture of
     a screen, so it carries them too. */
  .scan {
    position: absolute; inset: 0; pointer-events: none;
    background: repeating-linear-gradient(
      0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px
    );
    mix-blend-mode: multiply;
  }

  /* The bloom: a lit panel throws light onto the bezel around it. */
  .bloom {
    position: absolute; inset: 0; pointer-events: none;
    box-shadow: inset 0 0 120px rgba(255,176,0,.10);
  }

  /* The window. */
  .frame {
    position: absolute; inset: 46px;
    border: 1px solid var(--grid);
    background: rgba(13,10,5,.72);
    box-shadow: 0 0 34px -10px rgba(255,122,24,.55);
    display: flex; flex-direction: column;
  }

  /* The bar. */
  .bar {
    display: flex; align-items: center; gap: 14px;
    height: 46px; padding: 0 18px;
    border-bottom: 1px solid var(--grid);
    font-size: 18px; letter-spacing: 2px;
    color: var(--fort);
  }
  .leds { display: inline-flex; gap: 7px; }
  .leds i { width: 10px; height: 10px; background: var(--grid); display: block; }
  .leds i.on { background: var(--encre); box-shadow: 0 0 9px rgba(255,176,0,.75); }
  .chip { color: var(--braise); text-shadow: 0 0 10px rgba(255,122,24,.55); }
  .chip::before { content: '\\2500\\00a0'; color: var(--grid); }
  .chip::after { content: '\\00a0\\2500'; color: var(--grid); }
  .right { margin-left: auto; color: var(--fort); opacity: .75; }

  /* The body of the window. */
  .body {
    flex: 1; padding: 30px 46px 0;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  /* The prompt. */
  .prompt {
    font-size: 21px; letter-spacing: .3px; line-height: 1.5;
    color: var(--braise);
  }
  .prompt .who { color: var(--creme); }
  .prompt .sep { color: var(--fort); opacity: .7; }
  .prompt .path { color: var(--fort); }
  .prompt .cmd { color: var(--creme); text-shadow: 0 0 10px rgba(255,176,0,.35); }

  /* The title. It is set in the terminal face, in the site's amber, with
     the same bloom the headings carry on the page. */
  h1 {
    margin-top: 26px;
    font-size: 46px; line-height: 1.14; letter-spacing: -1px;
    font-weight: 700; color: var(--encre);
    text-shadow: 0 0 18px rgba(255,176,0,.38);
    max-width: 26ch;
  }

  /* The wordmark, for the site card. */
  .banner {
    font-family: 'Cascadia Mono Art', 'JetBrains Mono', monospace;
    font-size: 15px; line-height: 1.06; letter-spacing: 0;
    color: var(--encre);
    text-shadow: 0 0 16px rgba(255,176,0,.45);
    white-space: pre;
  }

  .lede {
    margin-top: 20px;
    font-size: 20px; line-height: 1.5; color: var(--fort);
    max-width: 52ch;
  }
  .lede .tag { color: var(--braise); }

  /* The foot. A rule with the date and the topic on the left of it. */
  .foot {
    display: flex; align-items: center; gap: 18px;
    height: 66px; padding: 0 48px;
    border-top: 1px solid var(--grid);
    font-size: 19px; letter-spacing: 2.5px; text-transform: uppercase;
    color: var(--fort);
  }
  .rule {
    flex: 1; height: 1px;
    background-image: linear-gradient(to right, var(--grid) 0 4px, transparent 4px 9px);
    background-size: 9px 1px; background-repeat: repeat-x;
  }
  .avail { display: inline-flex; align-items: center; gap: 10px; color: var(--encre); }
  .avail i { width: 10px; height: 10px; background: var(--encre); display: block;
             box-shadow: 0 0 9px rgba(255,176,0,.7); }
`;

/** Wrap card content in the shared shell. */
function card(inner) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${CARD_CSS}</style></head>
<body>
  <div class="grid"></div>
  <div class="bloom"></div>
  ${inner}
  <div class="scan"></div>
</body></html>`;
}

/** The bar every card carries. */
function bar(path, right) {
  return `<div class="bar">
    <span class="leds"><i class="on"></i><i></i><i></i></span>
    <span class="chip">${path}</span>
    <span class="right">${right}</span>
  </div>`;
}

/** The prompt every card carries. */
function prompt(dir, cmd) {
  return `<div class="prompt"><span class="who">root</span><span class="sep">@</span><span>amaltsev</span>><span class="sep">:</span><span class="path">${dir}</span><span class="sep">$</span> <span class="cmd">${cmd}</span></div>`;
}

/** The foot every card carries. */
function foot(left) {
  return `<div class="foot">
    <span>${left}</span>
    <span class="rule"></span>
    <span class="avail"><i></i>available</span>
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
 * The rule is the site's own, so a title cannot be decorated on the card and
 * plain on the page.
 */
function cardTitle(title) {
  const stripped = stripPictograms(title).replace(/[ \t]{2,}/g, ' ').trim();
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
    `<div class="frame">
  ${bar('~', 'maltsev-dev.github.io')}
  <div class="body">
    <pre class="banner">${BANNER.join('\n')}</pre>
    ${prompt('~', 'cat about.md')}
    <h1>I build AI systems that survive production.</h1>
    <p class="lede">Agent runtime security · retrieval quality · the reliability layer underneath both</p>
  </div>
  ${foot('Anatolii Maltsev')}
</div>`
  );
}

/** One post's card: its title, its date and its first tag. */
function postCard(post) {
  const tag = post.tags[0] ? post.tags[0].replace(/_/g, ' ') : '';
  const date = cardDate(post.date);

  const meta = [date, tag].filter(Boolean).join(' · ');

  return card(
    `<div class="frame">
  ${bar('~/blog', 'post')}
  <div class="body">
    ${prompt('~/blog', `cat ${post.slug}.md`)}
    <h1>${cardTitle(post.title)}</h1>
    ${meta && `<p class="lede">${meta}</p>`}
  </div>
  ${foot('Anatolii Maltsev')}
</div>`
  );
}

// ── the run ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const onlySite = args.includes('--site');
const onlyPosts = args.includes('--posts');

// The cards are written to a file and opened from it, because the browser
// will not load a file:// font into a page that was set from a string.
const TMP_DIR = join(tmpdir(), 'og-cards');
mkdirSync(TMP_DIR, { recursive: true });
const TMP_HTML = join(TMP_DIR, 'card.html');

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});

/** Render one card and write it. */
async function shoot(html, path) {
  writeFileSync(TMP_HTML, html, 'utf-8');
  await page.goto('file:///' + TMP_HTML.replace(/\\/g, '/'), {
    waitUntil: 'load',
  });
  await page.evaluate(() => document.fonts.ready);
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
  body { width: 180px; height: 180px; background: #ff7a18; }
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
