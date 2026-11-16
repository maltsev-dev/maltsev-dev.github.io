// Screenshot a page of a served build.
//
//   node tools/shot.mjs <base> <path> <out.png> [width] [height] [theme]
//
// The reveal animation is neutralised before the capture, and the scroll is
// instant: `html { scroll-behavior: smooth }` turns window.scrollTo into an
// animation, so a capture that fires straight after it photographs a page
// that has not moved yet.

import { chromium } from 'playwright';

const [base, path, out, w = '1440', h = '900', theme = 'phosphore'] =
  process.argv.slice(2);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
});
const page = await ctx.newPage();

await page.goto(base + path, { waitUntil: 'networkidle' });

// The theme is set after the load, not before it: the page's own bootstrap
// reads localStorage and writes the attribute, so an init script that sets
// it is overwritten before the first paint.
await page.evaluate((t) => {
  document.documentElement.setAttribute('data-theme', t);
}, theme);

await page.addStyleTag({
  content: '[data-reveal]{opacity:1!important;transform:none!important;}',
});
// The boot overlay is `position: fixed`, so in a full-page capture it is
// painted once over the top of the page and hides whatever is under it.
// Take it out of the document before the shot.
await page.evaluate(() => {
  const o = document.getElementById('bootOverlay');
  if (o) o.remove();
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
});
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: true });

await browser.close();
console.log(out);
