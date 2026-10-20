// Renders the social card. `og:image` was pointing at favicon.png — a 512px
// square icon declared with twitter:card=summary_large_image, which asks for at
// least 1200x630. Every link preview on the site rendered as a tiny square.
//
// The card is built from the same ramps as the phosphore theme, so a preview
// looks like the page it links to. Run after changing the palette:
//
//   node _gen_og.mjs
//
// Writes static/og.png.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const W = 1200, H = 630;

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
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
    font-size: 82px; line-height: 1.04; letter-spacing: -2px;
    text-transform: uppercase; font-weight: 700; color: #ffe2b0;
    max-width: 16ch;
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
</style></head>
<body>
  <div class="top">
    <span class="mark">A|M</span>
    <span class="host">maltsev-dev.github.io</span>
  </div>
  <div>
    <h1>Agentic <em>engineering</em> that carries real work</h1>
    <p class="lede">AI operational systems · embedded and distributed systems · automation</p>
  </div>
  <div class="foot">
    <span class="dot"></span><span>available for work</span><span class="rule"></span>
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
const buf = await page.screenshot({ type: 'png' });
await browser.close();

writeFileSync('static/og.png', buf);
console.log(`static/og.png written — ${W}x${H}, ${(buf.length / 1024).toFixed(0)} KB`);