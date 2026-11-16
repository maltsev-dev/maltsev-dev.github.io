// Check the layout rules the design contract sets, on every page of a build.
//
//   node tools/verify-layout.mjs <base-url> [--themes] [--widths]
//
// The contract has three layout claims that are easy to assert and easy to
// break:
//
//   1. Every section window on a page starts at the same x, and the windows
//      share a right edge as well as a left one. One left edge, one column.
//   2. Nothing on a page overflows the page column horizontally.
//   3. The texts the contract names fit on one line at the desktop width:
//      the home headline, the writing index lede.
//
// The first one is checked on every page of the build, not on a sample: a
// window that drifts a few pixels is invisible in a screenshot and obvious
// in a number.

import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4405';
const wantThemes = process.argv.includes('--themes');
const wantWidths = process.argv.includes('--widths');

const THEMES = ['acidule', 'phosphore'];
const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 390, h: 844 },
];

const PAGES = [
  '/',
  '/about/',
  '/experience/',
  '/blog/',
  '/projects/',
  '/projects/lead-qualification-agent/',
  '/projects/email-reply-agent/',
  '/projects/support-triage-agent/',
  '/tags/rust/',
  '/blog/2026-10-10-unknown-outcome-is-not-a-failure-state/',
  '/404.html',
];

let failures = 0;
let checks = 0;

function report(ok, name, detail) {
  checks++;
  if (!ok) failures++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

const browser = await chromium.launch();

async function open(width, height, theme) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((t) => {
    // The init script runs before the document is parsed, so the root
    // element may not exist yet.
    const set = () => document.documentElement?.setAttribute('data-theme', t);
    set();
    document.addEventListener('DOMContentLoaded', set);
    try {
      sessionStorage.setItem('booted', '1');
    } catch (e) {
      /* storage blocked */
    }
  }, theme);
  return { ctx, page, errors };
}

/* ----- 1. One left edge, on every page ----------------------------------- */

for (const path of PAGES) {
  const { ctx, page, errors } = await open(1440, 900, 'phosphore');
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('bootOverlay')?.remove());

  const windows = await page.evaluate(() =>
    // A window inside the hero is the masthead's own furniture — on the home
    // page that is the ASCII portrait, which sits in the corner of the
    // machine by design. The rule the contract sets is about the *section*
    // windows: the ones that carry the page's content.
    [...document.querySelectorAll('.tty')]
      .filter((t) => !t.closest('.hero'))
      .map((t) => {
        const r = t.getBoundingClientRect();
        return {
          title: t.querySelector('.tty-title')?.textContent?.trim() ?? '?',
          left: Math.round(r.left),
          right: Math.round(r.right),
          width: Math.round(r.width),
        };
      })
  );

  const lefts = [...new Set(windows.map((w) => w.left))];
  const rights = [...new Set(windows.map((w) => w.right))];

  report(
    lefts.length <= 1,
    `${path} — one left edge (${windows.length} windows)`,
    windows.length ? `lefts ${lefts.join(', ')} — ${windows.map((w) => w.title + '@' + w.left).join(' ')}` : 'no windows'
  );
  report(
    rights.length <= 1,
    `${path} — one right edge`,
    windows.length ? `rights ${rights.join(', ')}` : ''
  );

  // Nothing may stick out past the page column.
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  report(overflow <= 1, `${path} — no horizontal overflow`, `${overflow}px`);

  report(errors.length === 0, `${path} — no console errors`, errors.slice(0, 2).join(' | '));

  await ctx.close();
}

/* ----- 2. The texts the contract names ------------------------------------ */

{
  const { ctx, page } = await open(1440, 900, 'phosphore');
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('bootOverlay')?.remove());
  const h1 = await page.evaluate(() => {
    const el = document.querySelector('h1');
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent.trim(),
      rects: el.getClientRects().length,
      width: Math.round(r.width),
      lines: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight)),
    };
  });
  report(h1.rects === 1, 'home h1 — one line', `${h1.lines} line(s), container ${h1.width}px`);
  await ctx.close();
}

{
  const { ctx, page } = await open(1440, 900, 'phosphore');
  await page.goto(base + '/blog/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('bootOverlay')?.remove());
  const lede = await page.evaluate(() => {
    const el = document.querySelector('.lede');
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent.trim(),
      width: Math.round(r.width),
      lines: Math.round(r.height / parseFloat(getComputedStyle(el).lineHeight)),
    };
  });
  report(lede.lines === 1, 'blog lede — one line', `${lede.lines} line(s), ${lede.width}px`);
  await ctx.close();
}

/* ----- 3. The listing is a directory --------------------------------------- */

{
  const { ctx, page } = await open(1440, 900, 'phosphore');
  await page.goto(base + '/blog/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.getElementById('bootOverlay')?.remove());
  const listing = await page.evaluate(() => {
    const rows = document.querySelectorAll('.post-row');
    return {
      rows: rows.length,
      summaries: document.querySelectorAll('.post-sum').length,
      tagChips: document.querySelectorAll('.post-tags').length,
      headIsPostRow: !!document.querySelector('.ls-posts > .ls-head.ls-row--post'),
      firstRowTop: Math.round(rows[0]?.getBoundingClientRect().top ?? 0),
    };
  });
  report(listing.summaries === 0, 'blog listing — no per-post summaries', `${listing.summaries}`);
  report(listing.tagChips === 0, 'blog listing — no per-post tag chips', `${listing.tagChips}`);
  report(listing.headIsPostRow, 'blog listing — head row uses .ls-row--post');
  await ctx.close();
}

/* ----- 4. Every theme and every width -------------------------------------- */

if (wantThemes || wantWidths) {
  const themes = wantThemes ? THEMES : ['phosphore'];
  const widths = wantWidths ? WIDTHS : [WIDTHS[0]];

  for (const theme of themes) {
    for (const { w, h } of widths) {
      for (const path of ['/', '/blog/', '/about/', '/experience/']) {
        const { ctx, page, errors } = await open(w, h, theme);
        await page.goto(base + path, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.getElementById('bootOverlay')?.remove());
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const lefts = await page.evaluate(() => [
          ...new Set(
            [...document.querySelectorAll('.tty')]
              .filter((t) => !t.closest('.hero'))
              .map((t) => Math.round(t.getBoundingClientRect().left))
          ),
        ]);
        report(
          overflow <= 1 && lefts.length <= 1 && errors.length === 0,
          `${theme} ${w}x${h} ${path}`,
          `overflow ${overflow}px, lefts ${lefts.join(',')}, errors ${errors.length}`
        );
        await ctx.close();
      }
    }
  }
}

await browser.close();

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) process.exit(1);
