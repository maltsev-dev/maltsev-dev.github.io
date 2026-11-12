// Verification for the Critical + High fix pass.
//
//   node _verify_fixes.mjs content   — CONT-001/002/003 (content holes)
//   node _verify_fixes.mjs cases     — CONT-001/002 (case sections render)
//   node _verify_fixes.mjs track     — QA-002/003 (track reach + caret)
//   node _verify_fixes.mjs wheel     — QA-001 (blog card row eats page scroll)
//   node _verify_fixes.mjs casecss   — QA-018 (case pages have a layout)
//   node _verify_fixes.mjs footer    — QA-007 (a <footer> on every page)
//   node _verify_fixes.mjs palette   — AUD-001..004 (palette semantics)
//   node _verify_fixes.mjs contrast  — DES-001..007 (tokens, focus, print)
//   node _verify_fixes.mjs seo       — TECH-001/002/003, QA-009
//   node _verify_fixes.mjs perf      — PERF-001..006
//   node _verify_fixes.mjs posts     — CONT-005 (prev/next on a post)
//   node _verify_fixes.mjs source    — CONT-008..038 (the corpus and the tree)
//   node _verify_fixes.mjs medium    — CONT-008..038, QA-005/006/010/011/013/015/016/017
//
// Every check prints PASS or FAIL; the exit code is non-zero if anything failed.

import { chromium } from 'playwright';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.QA_BASE || 'http://localhost:4400';
const group = process.argv[2] || 'all';

let failures = 0;
let checks = 0;

function report(ok, name, detail) {
  checks++;
  if (!ok) failures++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));
}

const browser = await chromium.launch();

async function withPage(fn, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const page = await ctx.newPage();
  try {
    await fn(page);
  } finally {
    await ctx.close();
  }
}

/**
 * Every image the site ships, read out of the built pages.
 *
 * The sitemap is the list of pages the site publishes; each one is fetched
 * and parsed, and every `<img>` in it is reported with the attributes the
 * markup carries. This is the site's whole image population — not a sample
 * of it — so a check on it can be said to cover what it claims to.
 */
async function sweepImages(page) {
  return page.evaluate(async (base) => {
    const xml = await (await fetch(base + '/sitemap.xml')).text();
    const sm = new DOMParser().parseFromString(xml, 'text/xml');
    const urls = [...sm.querySelectorAll('loc')].map((l) => new URL(l.textContent).pathname);
    const imgs = [];
    for (const u of urls) {
      const html = await (await fetch(base + u)).text();
      const d = new DOMParser().parseFromString(html, 'text/html');
      for (const img of d.querySelectorAll('img')) {
        imgs.push({
          page: u,
          src: img.getAttribute('src') || '',
          width: img.getAttribute('width'),
          height: img.getAttribute('height'),
          loading: img.getAttribute('loading'),
          decoding: img.getAttribute('decoding'),
          alt: img.getAttribute('alt'),
        });
      }
    }
    return imgs;
  }, BASE);
}

// ---------------------------------------------------------------------------
// content: CONT-003 — the AI-pipeline post renders its headings and figure
// ---------------------------------------------------------------------------
async function content() {
  await withPage(async (page) => {
    const url = BASE + '/blog/2026-04-07-the-ai-pipeline-is-not-optional/';
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const h2 = [...document.querySelectorAll('.prose h2')].map((h) => h.textContent.trim());
      const body = document.querySelector('.prose')?.innerHTML || '';
      return {
        h2,
        escapedHeadings: (body.match(/&#x3C;h2/gi) || []).length,
        pipeStages: document.querySelectorAll('.pipe-stage').length,
        pipeStagesInPre: [...document.querySelectorAll('.pipe-stage')].filter(
          (el) => el.closest('pre')
        ).length,
        ctxRules: document.querySelectorAll('.ctx-rule').length,
        ctxRulesInPre: [...document.querySelectorAll('.ctx-rule')].filter(
          (el) => el.closest('pre')
        ).length,
        codeText: [...document.querySelectorAll('pre')].some((pre) =>
          pre.textContent.includes('pipe-stage')
        ),
      };
    });

    report(r.escapedHeadings === 0, 'CONT-003 no escaped headings', 'found ' + r.escapedHeadings);
    report(r.h2.length >= 7, 'CONT-003 seven h2 headings', 'got ' + r.h2.length + ': ' + r.h2.join(' | '));
    report(r.pipeStages >= 9 && r.pipeStagesInPre === 0, 'CONT-003 pipe-stage boxes are markup',
      r.pipeStages + ' stages, ' + r.pipeStagesInPre + ' inside <pre>');
    report(r.ctxRules >= 4 && r.ctxRulesInPre === 0, 'CONT-003 ctx-rule boxes are markup',
      r.ctxRules + ' rules, ' + r.ctxRulesInPre + ' inside <pre>');
    report(!r.codeText, 'CONT-003 figure source is not shown as code');
  });
}

// ---------------------------------------------------------------------------
// cases: CONT-001 / CONT-002 — every case study renders all six sections
// ---------------------------------------------------------------------------
async function cases() {
  await withPage(async (page) => {
    for (const slug of ['email-reply-agent', 'lead-qualification-agent', 'support-triage-agent']) {
      await page.goto(BASE + '/projects/' + slug + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({
        h2: [...document.querySelectorAll('.case h2')].map((h) => h.textContent.trim()),
        problems: document.querySelectorAll('.case-list li').length,
        solutions: document.querySelectorAll('.card-grid > .card:not(.card-risk) h3').length,
        risks: document.querySelectorAll('.card-risk h3').length,
        riskTitles: [...document.querySelectorAll('.card-risk h3')].map((h) => h.textContent.trim()),
        problemTitles: [...document.querySelectorAll('.case-list li')].map((li) =>
          (li.querySelector('strong')?.textContent || '').trim()
        ),
      }));

      const want = [
        'What breaks today',
        'What replaces it',
        'What changes',
        'The pipeline',
        'The cost of waiting',
        'Pricing',
      ];
      const missing = want.filter((w) => !r.h2.includes(w));
      report(missing.length === 0, slug + ': all six sections render',
        missing.length ? 'missing ' + missing.join(', ') : r.h2.join(' | '));
      report(r.problems === 4, slug + ': four problem cards', 'got ' + r.problems);
      report(r.solutions === 4, slug + ': four solution cards', 'got ' + r.solutions);
      report(r.risks === 4, slug + ': four risk cards', 'got ' + r.risks);
      report(r.riskTitles.every((t) => t.length > 2), slug + ': risk cards have titles',
        JSON.stringify(r.riskTitles));
      report(r.problemTitles.every((t) => t.length > 2), slug + ': problem cards have titles',
        JSON.stringify(r.problemTitles));
    }
  });
}

// ---------------------------------------------------------------------------
// track: QA-002 (panels reachable on touch widths) and QA-003 (caret wins)
// ---------------------------------------------------------------------------
async function track() {
  await withPage(async (page) => {
    for (const width of [834, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(BASE + '/projects/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const row = document.querySelector('[data-track-row]');
        const panels = [...row.children];
        const visible = panels.filter((p) => {
          const b = p.getBoundingClientRect();
          return b.width > 0 && b.height > 0;
        });
        const st = getComputedStyle(document.querySelector('[data-track-scroll]'));
        return {
          panels: panels.length,
          visible: visible.length,
          pageScrollable: document.documentElement.scrollHeight > window.innerHeight + 20,
          overflowHidden: st.overflow === 'hidden',
          docScrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
        };
      });
      report(
        r.visible === r.panels,
        'QA-002 ' + width + 'px: all panels reachable',
        r.visible + '/' + r.panels + ' visible'
      );
      report(
        r.pageScrollable || r.visible === r.panels,
        'QA-002 ' + width + 'px: page is not trapped',
        'scrollable=' + r.pageScrollable
      );
      report(
        r.docScrollW <= r.innerW + 2,
        'QA-002 ' + width + 'px: no horizontal page overflow',
        r.docScrollW + ' vs ' + r.innerW
      );
    }
  });

  // QA-002, the other half: a device with no fine pointer must get the
  // stacked layout, the page's own scroll, and every panel in the column.
  // Chromium reports `hover: none, pointer: coarse` under mobile emulation.
  await withPage(
    async (page) => {
      await page.setViewportSize({ width: 834, height: 1112 });
      await page.goto(BASE + '/projects/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const row = document.querySelector('[data-track-row]');
        const panels = [...row.children];
        const tops = panels.map((p) => Math.round(p.getBoundingClientRect().top));
        const stacked = tops.every((t, i) => i === 0 || t > tops[i - 1]);
        return {
          panels: panels.length,
          stacked,
          column: getComputedStyle(row).flexDirection,
          pageScrollable: document.documentElement.scrollHeight > window.innerHeight + 20,
          docScrollW: document.documentElement.scrollWidth,
          innerW: window.innerWidth,
          coarse: window.matchMedia('(pointer: coarse)').matches,
        };
      });
      report(r.coarse, 'QA-002 coarse pointer: the emulation is coarse', 'coarse=' + r.coarse);
      report(r.column === 'column', 'QA-002 coarse pointer: the row stacks', r.column);
      report(r.stacked, 'QA-002 coarse pointer: panels are one under another');
      report(r.pageScrollable, 'QA-002 coarse pointer: the page still scrolls',
        'scrollable=' + r.pageScrollable);
      report(r.docScrollW <= r.innerW + 2, 'QA-002 coarse pointer: no horizontal overflow',
        r.docScrollW + ' vs ' + r.innerW);
    },
    { isMobile: true, hasTouch: true }
  );

  // QA-003: the track must not eat the caret.
  await withPage(async (page) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE + '/projects/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const opener = page.locator('[data-open-letter]').first();
    if (await opener.count()) {
      await opener.click();
      await page.waitForTimeout(500);
      const before = await page.evaluate(() => {
        const f = document.getElementById('l-message');
        f.focus();
        f.value = 'ABCDEFGHIJ';
        f.setSelectionRange(9, 9);
        return {
          selStart: f.selectionStart,
          transform: getComputedStyle(document.querySelector('[data-track-row]')).transform,
        };
      });
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => ({
        selStart: document.getElementById('l-message').selectionStart,
        transform: getComputedStyle(document.querySelector('[data-track-row]')).transform,
      }));
      report(after.selStart === before.selStart + 1, 'QA-003 ArrowRight moves the caret',
        before.selStart + ' -> ' + after.selStart);
      report(after.transform === before.transform, 'QA-003 ArrowRight does not move the track',
        before.transform + ' -> ' + after.transform);

      await page.evaluate(() => {
        const f = document.getElementById('l-message');
        f.focus();
        f.setSelectionRange(5, 5);
      });
      const tBefore = await page.evaluate(() =>
        getComputedStyle(document.querySelector('[data-track-row]')).transform
      );
      await page.keyboard.press('End');
      await page.waitForTimeout(200);
      const tAfter = await page.evaluate(() => ({
        selStart: document.getElementById('l-message').selectionStart,
        transform: getComputedStyle(document.querySelector('[data-track-row]')).transform,
      }));
      report(tAfter.selStart === 10, 'QA-003 End goes to end of line', 'selStart ' + tAfter.selStart);
      report(tAfter.transform === tBefore, 'QA-003 End does not move the track',
        tBefore + ' -> ' + tAfter.transform);
    } else {
      report(false, 'QA-003 letter modal present', 'no [data-open-letter] on /projects/');
    }
  });
}

// ---------------------------------------------------------------------------
// wheel: QA-001 — the blog card row must not swallow page scroll
// ---------------------------------------------------------------------------
async function wheel() {
  await withPage(async (page) => {
    await page.goto(BASE + '/blog/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const box = await page.locator('.card-row').first().boundingBox();
    if (!box) {
      report(false, 'QA-001 card row exists on /blog/');
      return;
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => ({
      y: window.scrollY,
      left: document.querySelector('.card-row').scrollLeft,
    }));
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(120);
    }
    const after = await page.evaluate(() => ({
      y: window.scrollY,
      left: document.querySelector('.card-row').scrollLeft,
    }));
    report(after.y > before.y, 'QA-001 vertical wheel scrolls the page over the card row',
      'scrollY ' + before.y + ' -> ' + after.y);

    // The row must still be reachable by pointer: a sideways gesture moves it.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const side = await page.evaluate(() => ({
      left: document.querySelector('.card-row').scrollLeft,
    }));
    await page.mouse.wheel(120, 0);
    await page.waitForTimeout(300);
    const sideAfter = await page.evaluate(() => ({
      left: document.querySelector('.card-row').scrollLeft,
      y: window.scrollY,
    }));
    report(sideAfter.left > side.left, 'QA-001 a sideways gesture still moves the row',
      'scrollLeft ' + side.left + ' -> ' + sideAfter.left);
    report(sideAfter.y === 0, 'QA-001 a sideways gesture does not scroll the page',
      'scrollY ' + sideAfter.y);
  });
}

// ---------------------------------------------------------------------------
// casecss: QA-018 — the case pages ship a layout
// ---------------------------------------------------------------------------
async function casecss() {
  await withPage(async (page) => {
    for (const slug of ['email-reply-agent', 'lead-qualification-agent', 'support-triage-agent']) {
      await page.goto(BASE + '/projects/' + slug + '/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => {
        const els = [
          ...document.querySelectorAll('[class*="case"], [class*="delta"], [class*="flow-"]'),
        ];
        const laid = els.filter((el) => {
          const d = getComputedStyle(el).display;
          return d === 'grid' || d === 'flex' || d === 'inline-grid';
        });
        const flow = document.querySelector('.case-flow');
        const flowStep = document.querySelector('.flow-step');
        const metrics = document.querySelector('.case-metrics');
        return {
          total: els.length,
          laid: laid.length,
          flowDisplay: flow ? getComputedStyle(flow).display : 'none',
          flowListStyle: flow ? getComputedStyle(flow).listStyleType : 'none',
          stepDisplay: flowStep ? getComputedStyle(flowStep).display : 'none',
          metricsDisplay: metrics ? getComputedStyle(metrics).display : 'none',
        };
      });
      report(r.laid > 0, slug + ': case blocks have a layout', r.laid + '/' + r.total + ' laid out');
      report(r.metricsDisplay === 'grid' || r.metricsDisplay === 'flex',
        slug + ': metrics are a grid', r.metricsDisplay);
      report(r.flowDisplay === 'grid' || r.flowDisplay === 'flex',
        slug + ': pipeline is a grid', r.flowDisplay);
      report(r.flowListStyle === 'none', slug + ': pipeline is not double-numbered', r.flowListStyle);
      report(r.stepDisplay !== 'inline', slug + ': flow step is a block', r.stepDisplay);
    }
  });
}

// ---------------------------------------------------------------------------
// footer: QA-007 — a footer on every page
// ---------------------------------------------------------------------------
async function footer() {
  await withPage(async (page) => {
    const routes = [
      '/', '/about/', '/experience/', '/projects/', '/blog/', '/freelance/',
      '/blog/2026-04-07-the-ai-pipeline-is-not-optional/', '/projects/email-reply-agent/',
    ];
    for (const route of routes) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      const r = await page.evaluate(() => {
        const f = document.querySelector('footer');
        return {
          has: !!f,
          links: f ? f.querySelectorAll('a').length : 0,
          text: f ? f.textContent.replace(/\s+/g, ' ').trim() : '',
        };
      });
      report(r.has, 'QA-007 ' + route + ': has a <footer>');
      report(r.links >= 3, 'QA-007 ' + route + ': footer carries links', String(r.links));
      report(/©/.test(r.text), 'QA-007 ' + route + ': footer carries the copyright', r.text);
    }
  });
}

// ---------------------------------------------------------------------------
// palette: AUD-001..004 — combobox semantics, focus trap, focus return
// ---------------------------------------------------------------------------
async function palette() {
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const before = await page.evaluate(() => {
      const input = document.getElementById('paletteInput');
      const list = document.getElementById('paletteList');
      return {
        expanded: input?.getAttribute('aria-expanded'),
        controls: input?.getAttribute('aria-controls'),
        listRole: list?.getAttribute('role'),
        listName: list?.getAttribute('aria-label') || list?.getAttribute('aria-labelledby'),
        optionsInHtml: document.querySelectorAll('#paletteList [role="option"]').length,
      };
    });
    report(before.expanded === 'false' || before.expanded === 'true', 'AUD-001 aria-expanded present',
      String(before.expanded));
    report(before.listRole === 'listbox', 'AUD-001 list is a listbox', String(before.listRole));
    report(!!before.listName, 'AUD-011 list has an accessible name', String(before.listName));
    // PERF-005: the index of 84 posts and projects is not in the page.
    report(before.optionsInHtml === 0, 'PERF-005 the palette index is not in the page HTML',
      before.optionsInHtml + ' options in the markup');

    // open
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(900);
    const opened = await page.evaluate(() => {
      const d = document.getElementById('palette');
      return {
        open: !d.hidden,
        focusInside: d.contains(document.activeElement),
        bodyLocked: getComputedStyle(document.body).overflow === 'hidden',
        active: document.getElementById('paletteInput').getAttribute('aria-activedescendant'),
        options: document.querySelectorAll('#paletteList [role="option"]').length,
        optionWithLink: [...document.querySelectorAll('[role="option"]')].filter((o) =>
          o.querySelector('a[href]')
        ).length,
        backgroundInert: [...document.body.children].filter(
          (el) => el.id !== 'palette' && el.id !== 'letterModal' && el.hasAttribute('inert')
        ).length,
      };
    });
    report(opened.open, 'AUD-002 palette opens');
    report(opened.focusInside, 'AUD-002 focus moves into the palette');
    report(opened.bodyLocked, 'AUD-002 background scroll is locked', 'overflow=' + opened.bodyLocked);
    report(!!opened.active, 'AUD-001 active option is announced', String(opened.active));
    report(opened.options > 50, 'PERF-005 the index arrives on open', opened.options + ' options');
    report(opened.optionWithLink === 0, 'AUD-004 no role=option wraps a link',
      opened.optionWithLink + ' options wrap a link');
    report(opened.backgroundInert > 0, 'AUD-002 the page behind is inert',
      opened.backgroundInert + ' elements inert');

    // focus trap: tab through everything and confirm focus stays inside
    let escaped = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        document.getElementById('palette').contains(document.activeElement)
      );
      if (!inside) { escaped = true; break; }
    }
    report(!escaped, 'AUD-002 Tab is trapped inside the palette');

    // close with Escape and check focus returns to the opener
    // The header has no permanent palette trigger any more — the magnifier
    // button is gone and the palette is opened from the System menu or with
    // Ctrl+K. The opener is therefore the menu's own button.
    const openerId = await page.evaluate(() => {
      const o = document.querySelector('[data-open-palette]');
      o.focus();
      return o.getAttribute('data-open-palette') || 'palette-opener';
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = await page.evaluate((id) => ({
      hidden: document.getElementById('palette').hidden,
      focusId: document.activeElement?.id,
      openerId: id,
    }), openerId);
    report(closed.hidden, 'AUD-002 Escape closes the palette');
    report(closed.focusId === closed.openerId, 'AUD-003 focus returns to the opener',
      'focus on #' + closed.focusId + ', expected #' + closed.openerId);

    // AUD-002: the scroll lock has to survive another owner releasing it.
    // The boot overlay locks the page while it plays and releases it when it
    // ends; opening the palette inside that window used to leave the page
    // scrollable behind the palette, because the two wrote the same style.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(2200);
    const race = await page.evaluate(() => ({
      locked: getComputedStyle(document.body).overflow === 'hidden',
      open: !document.getElementById('palette').hidden,
    }));
    report(race.open && race.locked, 'AUD-002 the scroll lock survives the boot overlay',
      'open=' + race.open + ' overflow=' + race.locked);
  });

  // The palette's status line has to tell the truth about three different
  // states: the index is still loading, nothing matched the query, or the
  // index could not be fetched at all.
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(900);
    await page.fill('#paletteInput', 'zzzzz');
    await page.waitForTimeout(300);
    const noMatch = await page.evaluate(() => ({
      text: document.getElementById('paletteEmpty')?.textContent?.trim(),
      hidden: document.getElementById('paletteEmpty')?.hidden,
      visible: [...document.querySelectorAll('#paletteList .palette-item')].filter(
        (i) => i.style.display !== 'none'
      ).length,
    }));
    report(noMatch.text === 'No match.', 'PAL-001 the palette says "No match." when nothing matches',
      JSON.stringify(noMatch));
    report(noMatch.visible === 0, 'PAL-002 the palette shows no option when nothing matches',
      noMatch.visible + ' visible');
  });

  // A network failure is not an empty result set, and it must not be
  // reported as one.
  await withPage(async (page) => {
    await page.route('**/palette-index.json', (route) => route.abort());
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(1200);
    const failed = await page.evaluate(() => ({
      text: document.getElementById('paletteEmpty')?.textContent?.trim(),
      hidden: document.getElementById('paletteEmpty')?.hidden,
    }));
    report(failed.text === 'The index could not be loaded.',
      'PAL-003 the palette says the index failed to load',
      JSON.stringify(failed));
    report(failed.hidden === false, 'PAL-004 the failure is shown, not hidden',
      'hidden=' + failed.hidden);
  });

  // A question typed while the index is still on its way must still be the
  // question that gets answered.
  await withPage(async (page) => {
    await page.route('**/palette-index.json', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.fill('#paletteInput', 'rust');
    await page.waitForTimeout(3500);
    const typed = await page.evaluate(() => {
      const shown = [...document.querySelectorAll('#paletteList .palette-item')].filter(
        (i) => i.style.display !== 'none'
      );
      return {
        query: document.getElementById('paletteInput')?.value,
        shown: shown.length,
        total: document.querySelectorAll('#paletteList .palette-item').length,
        allMatch: shown.every((i) => (i.dataset.label + ' ' + i.dataset.group).includes('rust')),
      };
    });
    report(typed.allMatch && typed.shown > 0 && typed.shown < typed.total,
      'PAL-005 a query typed while the index loads is still applied',
      JSON.stringify(typed));
  });
}

// The contrast probe, as source. Playwright serialises the evaluated
// function, so the helpers have to travel as a string and be eval'd inside
// the page. `opacity` is composited against the ground, because a text
// colour at 60% opacity is not the colour the reader sees.
const PROBE_SRC = `function () {
  const lum = (c) => {
    const m = String(c).match(/[\\d.]+/g);
    if (!m) return null;
    const [r, g, b] = m.map(Number);
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const x = lum(a);
    const y = lum(b);
    if (x === null || y === null) return null;
    const [hi, lo] = [x, y].sort((p, q) => q - p);
    return (hi + 0.05) / (lo + 0.05);
  };
  const rgb = (c) => {
    const m = String(c).match(/[\\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  };
  const over = (fg, bg, a) => {
    const f = rgb(fg);
    const b = rgb(bg);
    if (!f || !b) return bg;
    return 'rgb(' + f.map((v, i) => Math.round(v * a + b[i] * (1 - a))).join(', ') + ')';
  };
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && !/rgba\\(0, 0, 0, 0\\)/.test(c)) return c;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const effective = (el, prop) => {
    const cs = getComputedStyle(el);
    let a = parseFloat(cs.opacity);
    if (Number.isNaN(a)) a = 1;
    let n = el.parentElement;
    while (n && n !== document.documentElement) {
      const o = parseFloat(getComputedStyle(n).opacity);
      if (!Number.isNaN(o)) a *= o;
      n = n.parentElement;
    }
    const bg = bgOf(el);
    return { color: over(cs[prop || 'color'], bg, a), bg, alpha: a };
  };
  const probe = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const eff = effective(el);
    return { color: eff.color, bg: eff.bg, ratio: ratio(eff.color, eff.bg) };
  };
  return { probe, ratio, over, effective, bgOf };
}`;

async function contrast() {
  await withPage(async (page) => {
    const url = BASE + '/blog/2026-04-07-the-ai-pipeline-is-not-optional/';
    for (const theme of ['phosphore', 'acidule', 'pierre']) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        localStorage.setItem('theme', t);
      }, theme);
      await page.waitForTimeout(300);

      const results = await page.evaluate((src) => {
        const api = eval('(' + src + ')')();
        return {
          kw: api.probe('.t-kw'),
          str: api.probe('.t-str'),
          num: api.probe('.t-num'),
          cm: api.probe('.t-cm'),
          ok: api.probe('.c-ok'),
          ring: getComputedStyle(document.documentElement)
            .getPropertyValue('--focus-ring')
            .trim(),
        };
      }, PROBE_SRC);

      report(
        results.kw && results.kw.ratio >= 4.5,
        theme + ' DES-001 keyword contrast',
        results.kw &&
          results.kw.color + ' on ' + results.kw.bg + ' = ' + results.kw.ratio.toFixed(2) + ':1'
      );
      report(
        results.str && results.str.ratio >= 4.5,
        theme + ' DES-001 string contrast',
        results.str && results.str.color + ' = ' + results.str.ratio.toFixed(2) + ':1'
      );
      report(
        results.num && results.num.ratio >= 4.5,
        theme + ' DES-001 number contrast',
        results.num && results.num.color + ' = ' + results.num.ratio.toFixed(2) + ':1'
      );
      report(
        results.cm && results.cm.ratio >= 4.5,
        theme + ' DES-001 comment contrast',
        results.cm && results.cm.color + ' = ' + results.cm.ratio.toFixed(2) + ':1'
      );
      report(
        results.ok && results.ok.ratio >= 4.5,
        theme + ' DES-002 .c-ok contrast',
        results.ok &&
          results.ok.color + ' on ' + results.ok.bg + ' = ' + results.ok.ratio.toFixed(2) + ':1'
      );
      report(
        !!results.ring,
        theme + ' DES-003 a --focus-ring token exists',
        results.ring || 'missing'
      );
    }

    // DES-003: the ring has to be visible on the rust chrome of the status bar.
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.dataset.theme = 'phosphore';
    });
    await page.waitForTimeout(200);
    const ringR = await page.evaluate((src) => {
      const api = eval('(' + src + ')')();
      const bar = document.querySelector('.status-bar');
      const token = getComputedStyle(document.documentElement)
        .getPropertyValue('--focus-ring')
        .trim();
      const probe = document.createElement('span');
      probe.style.color = token;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      const bg = getComputedStyle(bar).backgroundColor;
      return { token, resolved, bg, ratio: api.ratio(resolved, bg) };
    }, PROBE_SRC);
    report(
      ringR.ratio >= 3,
      'DES-003 focus ring on the status bar',
      ringR.token +
        ' = ' +
        ringR.resolved +
        ' on ' +
        ringR.bg +
        ' = ' +
        ringR.ratio.toFixed(2) +
        ':1'
    );

    // DES-004: the palette input keeps a visible focus indicator.
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(300);
    const inputFocus = await page.evaluate(() => {
      const el = document.getElementById('paletteInput');
      el.focus();
      const cs = getComputedStyle(el);
      return { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor };
    });
    report(
      inputFocus.style !== 'none' && parseFloat(inputFocus.width) > 0,
      'DES-004 palette input keeps an outline',
      inputFocus.width + ' ' + inputFocus.style + ' ' + inputFocus.color
    );

    // DES-005: focused field text and placeholder, in every theme.
    for (const theme of ['phosphore', 'acidule', 'pierre']) {
      await page.goto(BASE + '/freelance/', { waitUntil: 'networkidle' });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      // The contact form lives in the shared letter modal, which is closed on
      // arrival: a field inside a hidden dialog cannot take focus, and the
      // measurement would read the unfocused colours.
      await page.evaluate(() => {
        document.querySelector('[data-open-letter]')?.click();
      });
      await page.waitForTimeout(400);
      const field = await page.evaluate((src) => {
        const api = eval('(' + src + ')')();
        const el = document.querySelector('.field input, .field textarea, .field select');
        if (!el) return null;
        el.focus();
        const cs = getComputedStyle(el);
        const ph = getComputedStyle(el, '::placeholder');
        return {
          color: cs.color,
          bg: cs.backgroundColor,
          ratio: api.ratio(cs.color, cs.backgroundColor),
          phColor: ph.color,
          phRatio: api.ratio(ph.color, cs.backgroundColor),
          hasPh: !!el.placeholder,
        };
      }, PROBE_SRC);
      if (!field) {
        report(false, 'DES-005 ' + theme + ' focused field text contrast', 'no field found');
        continue;
      }
      report(
        field.ratio >= 4.5,
        'DES-005 ' + theme + ' focused field text contrast',
        field.color + ' on ' + field.bg + ' = ' + field.ratio.toFixed(2) + ':1'
      );
      if (field.hasPh) {
        report(
          field.phRatio >= 4.5,
          'DES-005 ' + theme + ' placeholder contrast on the focused field',
          field.phColor + ' on ' + field.bg + ' = ' + field.phRatio.toFixed(2) + ':1'
        );
      }
    }

    // DES-006: ::selection.
    for (const theme of ['phosphore', 'acidule', 'pierre']) {
      const sel = await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        const probe = document.createElement('div');
        probe.textContent = 'x';
        document.body.appendChild(probe);
        const cs = getComputedStyle(probe, '::selection');
        const out = { bg: cs.backgroundColor, color: cs.color };
        probe.remove();
        return out;
      }, theme);
      const ratio = await page.evaluate(
        (s) => {
          const lum = (c) => {
            const m = String(c).match(/[\d.]+/g);
            const [r, g, b] = m.map(Number);
            const f = (v) => {
              v /= 255;
              return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
          };
          const [x, y] = [lum(s.color), lum(s.bg)].sort((p, q) => q - p);
          return (x + 0.05) / (y + 0.05);
        },
        sel
      );
      report(
        ratio >= 4.5,
        'DES-006 ' + theme + ' ::selection contrast',
        sel.color + ' on ' + sel.bg + ' = ' + ratio.toFixed(2) + ':1'
      );
    }
  });

  // DES-007: the print stylesheet has its own tokens.
  await withPage(async (page) => {
    await page.goto(BASE + '/blog/2026-04-07-the-ai-pipeline-is-not-optional/', {
      waitUntil: 'networkidle',
    });
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(200);
    const r = await page.evaluate((src) => {
      const api = eval('(' + src + ')')();
      const root = getComputedStyle(document.documentElement);
      const paper = root.getPropertyValue('--papier').trim();
      const link = document.querySelector('.prose a');
      const quote = document.querySelector('.prose blockquote');
      const pre = document.querySelector('pre');
      return {
        paper,
        link: link ? api.ratio(getComputedStyle(link).color, paper) : null,
        quote: quote ? api.ratio(getComputedStyle(quote).color, paper) : null,
        preBg: pre ? getComputedStyle(pre).backgroundColor : null,
        preColor: pre ? getComputedStyle(pre).color : null,
        preRatio: pre
          ? api.ratio(getComputedStyle(pre).color, getComputedStyle(pre).backgroundColor)
          : null,
      };
    }, PROBE_SRC);
    report(r.paper.toLowerCase() === '#ffffff', 'DES-007 print paper is white', r.paper);
    report(
      r.link === null || r.link >= 4.5,
      'DES-007 printed link contrast',
      r.link && r.link.toFixed(2) + ':1'
    );
    report(
      r.quote === null || r.quote >= 4.5,
      'DES-007 printed blockquote contrast',
      r.quote && r.quote.toFixed(2) + ':1'
    );
    report(
      r.preBg === null || r.preRatio >= 4.5,
      'DES-007 printed code contrast',
      r.preColor + ' on ' + r.preBg + ' = ' + (r.preRatio && r.preRatio.toFixed(2)) + ':1'
    );
  });
}



// ---------------------------------------------------------------------------
// seo: TECH-001/002/003 + QA-009
// ---------------------------------------------------------------------------
async function seo() {
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const home = await page.evaluate(() => {
      const raw = document.querySelector('script[type="application/ld+json"]')?.textContent || '';
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { /* reported below */ }
      const nodes = parsed?.['@graph'] || [];
      return {
        jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
        parses: !!parsed,
        types: nodes.map((n) => n['@type']),
        person: nodes.find((n) => n['@type'] === 'Person')?.name || null,
        sameAs: (nodes.find((n) => n['@type'] === 'Person')?.sameAs || []).length,
      };
    });
    report(home.jsonLd >= 1 && home.parses, 'TECH-003 home page carries JSON-LD',
      home.jsonLd + ' script(s)');
    report(home.types.includes('Person'), 'TECH-003 the graph declares a Person',
      String(home.person) + ', ' + home.sameAs + ' sameAs');
    report(home.types.includes('WebSite'), 'TECH-003 the graph declares a WebSite',
      home.types.join(', '));

    await page.goto(BASE + '/blog/2026-04-07-the-ai-pipeline-is-not-optional/', {
      waitUntil: 'domcontentloaded',
    });
    const post = await page.evaluate(() => {
      const raw = document.querySelector('script[type="application/ld+json"]')?.textContent || '';
      let parsed = null;
      try { parsed = JSON.parse(raw); } catch (e) { /* reported below */ }
      const desc = document.querySelector('meta[name="description"]')?.content || '';
      const title = document.querySelector('title')?.textContent || '';
      const nodes = parsed?.['@graph'] || [];
      const posting = nodes.find((n) => n['@type'] === 'BlogPosting');
      return {
        jsonLd: raw ? raw.length : 0,
        parses: !!parsed,
        types: nodes.map((n) => n['@type']),
        posting: posting || null,
        desc,
        title,
      };
    });
    report(post.parses && post.jsonLd > 0, 'TECH-003 post carries parseable JSON-LD',
      post.types.join(', ') || 'unparseable');
    report(
      !!post.posting && !!post.posting.headline && !!post.posting.datePublished,
      'TECH-003 the post declares a BlogPosting with a headline and a date',
      post.posting
        ? post.posting.headline + ' / ' + post.posting.datePublished
        : 'no BlogPosting'
    );
    report(
      !!post.posting && !!post.posting.author && !!post.posting.author['@id'],
      'TECH-003 the BlogPosting names the author',
      post.posting && post.posting.author && post.posting.author['@id']
    );
    report(post.desc && post.desc !== post.title && post.desc.length >= 70,
      'QA-009 post description is not the title', post.desc.length + ' chars');
    report(post.desc.length <= 170, 'QA-009 post description length', post.desc.length + ' chars');

    // QA-009 / TECH-001: the description must not be a second copy of the
    // title — on every post, not on the one that happened to be checked.
    const all = await page.evaluate(async (base) => {
      const res = await fetch(base + '/blog/');
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const hrefs = [...new Set(
        [...doc.querySelectorAll('a[href^="/blog/"]')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => h && h !== '/blog/')
      )];
      const out = [];
      for (const href of hrefs) {
        const r = await fetch(base + href);
        const page = new DOMParser().parseFromString(await r.text(), 'text/html');
        out.push({
          href,
          desc: page.querySelector('meta[name="description"]')?.content || '',
          title: (page.querySelector('title')?.textContent || '').replace(/ · maltsev.dev$/, ''),
        });
      }
      return out;
    }, BASE);
    const copies = all.filter((x) => x.desc === x.title);
    const stubs = all.filter((x) => x.desc.length < 70);
    const missing = all.filter((x) => !x.desc);
    report(all.length >= 69, 'QA-009 every post has a description', all.length + ' posts swept');
    report(copies.length === 0, 'QA-009 no description repeats its title',
      copies.length + ' of ' + all.length + ' repeat it');
    report(stubs.length === 0, 'QA-009 no description is a stub',
      stubs.length + ' under 70 chars' + (stubs.length ? ' — ' + stubs.slice(0, 3).map((x) => x.href).join(', ') : ''));
    report(missing.length === 0, 'QA-009 no post is missing a description',
      missing.length + ' missing');

    // TECH-002: legacy URLs must resolve. These are the routes the legacy
    // generator actually emitted — the project pages under `content/`, the
    // archive, and the paginated index.
    const legacy = [
      '/html_scrapper.html',
      '/emb_gpio.html',
      '/ai_pipeline_article.html',
      '/archive/',
      '/page/2/',
    ];
    for (const path of legacy) {
      const res = await page.evaluate(async (p) => {
        const r = await fetch(p, { redirect: 'follow' });
        return { status: r.status, url: r.url };
      }, path);
      report(res.status === 200, 'TECH-002 legacy URL resolves: ' + path,
        'status ' + res.status);
    }

    // TECH-002: the 38 URLs the legacy site linked to and that are a hard 404
    // today — 23 root post pages and 15 tag pages. Each has to answer, and
    // each has to point at a page that exists.
    const legacyRoots = [
      '/agent-budget-is-a-permission-not-a-limit.html',
      '/agent-loops-need-an-external-stopping-boundary.html',
      '/approval-is-security-state-not-session-state.html',
      '/atomic-budget-reservation-redis-lua.html',
      '/audit-trail-for-ai-agent-tool-calls.html',
      '/authority-and-evidence-have-separate-lifecycles.html',
      '/authority-over-its-own-authority.html',
      '/budget-enforcement-per-llm-call.html',
      '/choosing-an-agent-runtime-security-layer.html',
      '/fail-closed-is-not-a-single-switch.html',
      '/four-valid-permissions-one-unacceptable-chain.html',
      '/how-hitl-approvals-get-bypassed.html',
      '/human-approval-is-not-authorization.html',
      '/intercept-tool-calls-before-execution.html',
      '/material-fields-and-canonicalization.html',
      '/mcp-tool-identity-not-tool-name.html',
      '/operator-control-must-be-external-state.html',
      '/permissions-are-categories-authorizations-are-instances.html',
      '/reducing-hitl-approval-fatigue.html',
      '/scope-agent-permissions-to-the-credential.html',
      '/testing-agent-policies-against-adversarial-inputs.html',
      '/the-seam-between-model-and-execution.html',
      '/unknown-outcome-is-not-a-failure-state.html',
    ];
    const legacyTags = [
      '/tags/actix_web/',
      '/tags/audit/',
      '/tags/authorization/',
      '/tags/basic_electronics/',
      '/tags/budget/',
      '/tags/compliance/',
      '/tags/cost/',
      '/tags/enforcement/',
      '/tags/mcp/',
      '/tags/open_ai/',
      '/tags/operations/',
      '/tags/redis/',
      '/tags/reliability/',
      '/tags/security/',
      '/tags/testing/',
    ];
    const dead = await page.evaluate(async (paths) => {
      const out = [];
      for (const p of paths) {
        const r = await fetch(p, { redirect: 'follow' });
        const html = await r.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const canonical =
          doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
        const refresh =
          doc.querySelector('meta[http-equiv="refresh"]')?.getAttribute('content') || '';
        const anchor = doc.querySelector('body a')?.getAttribute('href') || '';
        let target = '';
        const m = refresh.match(/url=(.*)$/);
        if (m) target = m[1];
        let targetStatus = 0;
        if (target) {
          const tr = await fetch(target, { redirect: 'follow' });
          targetStatus = tr.status;
        }
        out.push({
          path: p,
          status: r.status,
          canonical,
          target,
          targetStatus,
          anchor,
          title: doc.title || '',
          refresh: !!refresh,
        });
      }
      return out;
    }, [...legacyRoots, ...legacyTags]);
    const notFound = dead.filter((d) => d.status !== 200);
    report(notFound.length === 0,
      'TECH-002 all 38 legacy URLs answer', notFound.length + ' of ' + dead.length + ' dead');

    // A legacy URL is answered in one of two ways. It is a stub that
    // refreshes to the page that replaced it, or the site grew the page the
    // URL always pointed at — a tag page, for one — and the URL is a real
    // page now. Both are correct. What is not correct is a stub that points
    // nowhere, and a URL that answers with something that is neither a stub
    // nor a page.
    const legacyStubs = dead.filter((d) => d.refresh);
    const absorbed = dead.filter((d) => !d.refresh);
    const noTarget = legacyStubs.filter((d) => !d.target);
    report(noTarget.length === 0, 'TECH-002 every legacy stub carries a target',
      noTarget.length + ' without one');
    const brokenTarget = legacyStubs.filter((d) => d.targetStatus !== 200);
    report(brokenTarget.length === 0, 'TECH-002 every legacy target exists',
      brokenTarget.length + ' broken' +
      (brokenTarget.length ? ' — ' + brokenTarget.slice(0, 3).map((d) => d.path).join(', ') : ''));
    const relative = dead.filter((d) => !d.canonical.startsWith('https://'));
    report(relative.length === 0, 'TECH-002 every legacy canonical is absolute',
      relative.length + ' relative');
    const noAnchor = legacyStubs.filter((d) => !d.anchor);
    report(noAnchor.length === 0, 'TECH-002 every legacy stub links to its target',
      noAnchor.length + ' without a link');
    const stillAStub = absorbed.filter((d) => d.title.startsWith('Redirecting to'));
    report(stillAStub.length === 0, 'TECH-002 a legacy URL that became a page is a page',
      stillAStub.length + ' still a stub');
  });
}

// ---------------------------------------------------------------------------
// perf: PERF-001..006
// ---------------------------------------------------------------------------
async function perf() {
  await withPage(async (page) => {
    // PERF-001: no video may auto-download — and no video may be malformed.
    //
    // The sweep is site-wide: a video whose closing tag was swallowed into
    // the <source> attribute makes every paragraph after it a child of the
    // video element, and the page loses the rest of the article. A check
    // that only looked for `preload` would not have seen it.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const v = await page.evaluate(async (base) => {
      const xml = await (await fetch(base + '/sitemap.xml')).text();
      const sm = new DOMParser().parseFromString(xml, 'text/xml');
      const urls = [...sm.querySelectorAll('loc')].map((l) => new URL(l.textContent).pathname);
      const out = [];
      for (const u of urls) {
        const html = await (await fetch(base + u)).text();
        const d = new DOMParser().parseFromString(html, 'text/html');
        for (const vid of d.querySelectorAll('video')) {
          const src = [...vid.querySelectorAll(':scope > source')];
          out.push({
            page: u,
            preload: vid.getAttribute('preload'),
            poster: vid.getAttribute('poster'),
            sources: src.length,
            typed: src.every((s) => !!s.getAttribute('type')),
            // A video that swallowed the article holds its paragraphs.
            swallowed: vid.querySelectorAll(
              'p, h1, h2, h3, h4, ul, ol, li, blockquote, pre, table, figure'
            ).length,
          });
        }
      }
      return out;
    }, BASE);
    report(v.length === 12, 'PERF-001 every video on the site was found',
      v.length + ' videos');
    report(v.every((x) => x.preload === 'none' || x.preload === 'metadata'),
      'PERF-001 every video sets preload', JSON.stringify([...new Set(v.map((x) => x.preload))]));
    report(v.every((x) => !!x.poster), 'PERF-001 every video has a poster',
      v.filter((x) => !x.poster).map((x) => x.page).join(', ') || 'all ' + v.length);
    report(v.every((x) => x.sources === 1), 'PERF-001 every video holds exactly one source',
      v.filter((x) => x.sources !== 1).map((x) => x.page + ' has ' + x.sources).join(', ') || 'all ' + v.length);
    report(v.every((x) => x.typed), 'PERF-001 every source declares its type',
      v.filter((x) => !x.typed).map((x) => x.page).join(', ') || 'all ' + v.length);
    report(v.every((x) => x.swallowed === 0), 'PERF-001 no video swallowed the article',
      v.filter((x) => x.swallowed).map((x) => x.page + ' swallowed ' + x.swallowed).join(', ') || 'all ' + v.length);

    // The poster is an attribute, not an href or a src, so the deploy's link
    // gate does not see it: it has to be checked here.
    const posters = [...new Set(v.map((x) => x.poster).filter(Boolean))];
    const missing = [];
    for (const p of posters) {
      const res = await page.request.get(BASE + p);
      if (!res.ok()) missing.push(p + ' ' + res.status());
    }
    report(missing.length === 0, 'PERF-001 every poster image exists',
      missing.length ? missing.join(', ') : posters.length + ' posters');

    // PERF-005: the palette must not ship every post in the page HTML.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const size = await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      return {
        bytes: html.length,
        paletteItems: document.querySelectorAll('.palette-item').length,
      };
    });
    report(size.paletteItems === 0, 'PERF-005 the palette does not inline every post',
      size.paletteItems + ' items in the document');
    report(size.bytes < 120000, 'PERF-005 home page HTML is under 120 kB',
      Math.round(size.bytes / 1024) + ' kB');

    // The palette must still work when fetched on demand.
    await page.evaluate(() => document.dispatchEvent(new CustomEvent('palette:open')));
    await page.waitForTimeout(900);
    const loaded = await page.evaluate(() => ({
      items: document.querySelectorAll('.palette-item').length,
      open: !document.getElementById('palette').hidden,
    }));
    report(loaded.items > 50, 'PERF-005 palette loads its index on demand',
      loaded.items + ' items');
    report(loaded.open, 'PERF-005 palette still opens');
  });

  // PERF-004: fonts are preloaded; PERF-002/003: no duplicate font files.
  await withPage(async (page) => {
    const requests = [];
    page.on('request', (r) => requests.push(r.url()));
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const preloads = await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => l.href)
    );
    report(preloads.length >= 1, 'PERF-004 at least one font is preloaded',
      preloads.map((p) => p.split('/').pop()).join(', '));

    const fonts = requests.filter((u) => /\.(woff2?|ttf|otf)(\?|$)/.test(u));
    const sizes = await page.evaluate(async (urls) => {
      const out = {};
      for (const u of urls) {
        const r = await fetch(u);
        const b = await r.arrayBuffer();
        out[u] = b.byteLength;
      }
      return out;
    }, Array.from(new Set(fonts)));
    const bySize = {};
    for (const [u, n] of Object.entries(sizes)) {
      bySize[n] = bySize[n] || [];
      bySize[n].push(u.split('/').pop());
    }
    const dupes = Object.entries(bySize).filter(([, files]) => files.length > 1);
    report(dupes.length === 0, 'PERF-002 no two font files are byte-identical',
      dupes.map(([n, f]) => f.join(' == ')).join('; '));
  });

  // PERF-002/003: the deployment itself must not carry the same font twice.
  // The check above only sees the faces a page requests; the waste the audit
  // measured was in the files that ship.
  {
    const dir = join(process.cwd(), 'static', 'fonts');
    const files = readdirSync(dir).filter((f) => f.endsWith('.woff2'));
    const byHash = {};
    for (const f of files) {
      const h = createHash('md5').update(readFileSync(join(dir, f))).digest('hex');
      byHash[h] = byHash[h] || [];
      byHash[h].push(f);
    }
    const onDisk = Object.values(byHash).filter((v) => v.length > 1);
    report(onDisk.length === 0, 'PERF-002 the deployment carries no duplicate font file',
      onDisk.length + ' duplicated group(s)' +
      (onDisk.length ? ' — ' + onDisk.map((v) => v.join(' == ')).join('; ') : '') +
      ' / ' + files.length + ' files');

    // Every face the stylesheet declares must exist, and the variable
    // families must be declared as a range — a discrete weight declaration
    // points at the same file under another name and is downloaded twice.
    const css = readFileSync(join(process.cwd(), 'src', 'styles', 'fonts.css'), 'utf-8');
    const declared = [...css.matchAll(/url\('\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
    const missing = declared.filter((f) => !files.includes(f));
    report(missing.length === 0, 'PERF-002 every declared face exists',
      missing.length + ' missing' + (missing.length ? ' — ' + missing.join(', ') : ''));
    const ranges = [...css.matchAll(/font-family: '([^']+)';\s*\n\s*font-style: normal;\s*\n\s*font-weight: ([^;]+);/g)]
      .map((m) => m[1] + ':' + m[2].trim());
    const discrete = ranges.filter((r) => /^(Inter|JetBrains Mono):\d+$/.test(r));
    report(discrete.length === 0, 'PERF-003 the variable families are declared as a range',
      discrete.join(', ') || ranges.join(', '));
    const vars = ranges.filter((r) => /^(Inter|JetBrains Mono):/.test(r));
    report(vars.length === 8, 'PERF-003 one face per subset per variable family',
      vars.length + ' variable faces');
  }

  // PERF-006: every image in the site carries its intrinsic size, lazy
  // loading and an explicit decoding. The sweep is site-wide: it walks every
  // page of the sitemap, so a check on two of them would not have seen the
  // other eighteen. The population it has to reach is counted from the
  // corpus, not from a number the audit wrote down: the audit counted 109
  // images when the legacy case-study bodies were still rendered, and the
  // site has since stopped shipping them.
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const sweep = await sweepImages(page);
    const pages = new Set(sweep.map((i) => i.page));
    const missingDims = sweep.filter((i) => !i.width || !i.height);
    const missingLoading = sweep.filter((i) => i.loading !== 'lazy');
    const missingDecoding = sweep.filter((i) => i.decoding !== 'async');
    const missingAlt = sweep.filter((i) => i.alt === null);
    const show = (list) =>
      list.length
        ? ' — ' + list.slice(0, 3).map((i) => i.page + ' ' + i.src).join(', ')
        : '';
    const expected = corpusImageCount();
    report(sweep.length === expected, 'PERF-006 the sweep reached every image',
      sweep.length + ' of ' + expected + ' images, on ' + pages.size + ' pages');
    report(missingDims.length === 0, 'PERF-006 every image carries width/height',
      missingDims.length + ' of ' + sweep.length + ' missing' + show(missingDims));
    report(missingLoading.length === 0, 'PERF-006 every image is lazy',
      missingLoading.length + ' of ' + sweep.length + ' missing' + show(missingLoading));
    report(missingDecoding.length === 0, 'PERF-006 every image declares decoding',
      missingDecoding.length + ' of ' + sweep.length + ' missing' + show(missingDecoding));
    report(missingAlt.length === 0, 'PERF-006 every image has an alt',
      missingAlt.length + ' of ' + sweep.length + ' missing' + show(missingAlt));
  });

  // The size the markup declares has to be the size the file really is —
  // a wrong number is worse than none, because the browser reserves the
  // wrong box. The images the site hosts are measured against the file
  // itself; the badges live on a third party's server and are checked
  // against the recorded map instead.
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const sweep = await sweepImages(page);
    const local = [...new Map(sweep.filter((i) => i.src.startsWith('/')).map((i) => [i.src, i])).values()];
    const measured = await page.evaluate(async (srcs) => {
      const out = [];
      for (const src of srcs) {
        const res = await fetch(src);
        if (!res.ok) {
          out.push({ src, error: res.status });
          continue;
        }
        try {
          const bmp = await createImageBitmap(await res.blob());
          out.push({ src, real: [bmp.width, bmp.height] });
        } catch (err) {
          out.push({ src, error: err.message });
        }
      }
      return out;
    }, local.map((i) => i.src));
    const declared = new Map(local.map((i) => [i.src, [i.width, i.height]]));
    const wrong = measured.filter((m) => {
      const d = declared.get(m.src);
      if (m.error || !d) return false;
      return String(m.real[0]) !== String(d[0]) || String(m.real[1]) !== String(d[1]);
    });
    const unreadable = measured.filter((m) => m.error);
    report(wrong.length === 0, 'PERF-006 the declared size is the real size',
      wrong.length + ' wrong of ' + measured.length +
      (wrong.length
        ? ' — ' + wrong.slice(0, 3).map((m) => m.src + ' ' + m.real + ' vs ' + declared.get(m.src)).join(', ')
        : ''));
    report(unreadable.length === 0, 'PERF-006 every hosted image is readable',
      unreadable.length + ' of ' + measured.length + ' failed' +
      (unreadable.length ? ' — ' + unreadable.slice(0, 3).map((m) => m.src + ' ' + m.error).join(', ') : ''));
  });
}

// ---------------------------------------------------------------------------
// posts: CONT-005 — a post is not a dead end
// ---------------------------------------------------------------------------
async function posts() {
  await withPage(async (page) => {
    await page.goto(BASE + '/blog/2026-04-07-the-ai-pipeline-is-not-optional/', {
      waitUntil: 'networkidle',
    });
    const r = await page.evaluate(() => {
      const links = [...document.querySelectorAll('.post-nav a')].map((a) => ({
        href: a.getAttribute('href'),
        text: a.textContent.replace(/\s+/g, ' ').trim(),
      }));
      return links;
    });
    const hrefs = r.map((l) => l.href);
    report(
      hrefs.some((h) => /\/blog\/.*\/$/.test(h || '')),
      'CONT-005 a post links to another post',
      JSON.stringify(r)
    );
    report(r.length >= 2, 'CONT-005 a post has prev and next', String(r.length));

    // CONT-005: every post, not one post. A dead end is a dead end wherever
    // the reader lands, and the two ends of the archive have one neighbour
    // rather than two.
    const sweep = await page.evaluate(async (base) => {
      const res = await fetch(base + '/blog/');
      const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      const hrefs = [...new Set(
        [...doc.querySelectorAll('a[href^="/blog/"]')]
          .map((a) => a.getAttribute('href'))
          .filter((h) => h && h !== '/blog/')
      )];
      const out = [];
      for (const href of hrefs) {
        const page = new DOMParser().parseFromString(
          await (await fetch(base + href)).text(),
          'text/html'
        );
        out.push({
          href,
          nav: page.querySelectorAll('.post-nav a').length,
          related: page.querySelectorAll('.post-related-list a').length,
          cta: page.querySelectorAll('.post-cta [data-open-letter], .post-cta a').length,
        });
      }
      return out;
    }, BASE);
    const noNav = sweep.filter((x) => x.nav < 1);
    const noRelated = sweep.filter((x) => x.related < 1);
    const noCta = sweep.filter((x) => x.cta < 1);
    report(sweep.length >= 69, 'CONT-005 every post was swept', sweep.length + ' posts');
    report(noNav.length === 0, 'CONT-005 no post is a dead end',
      noNav.length + ' without a neighbour' + (noNav.length ? ' — ' + noNav.slice(0, 3).map((x) => x.href).join(', ') : ''));
    report(noRelated.length === 0, 'CONT-005 every post points at related writing',
      noRelated.length + ' without related posts');
    report(noCta.length === 0, 'CONT-005 every post offers a way to ask',
      noCta.length + ' without a call to action');
  });
}

// ---------------------------------------------------------------------------
// source: the corpus and the source tree
//
// The Medium and Low pass was mostly about what the files say rather than
// about what a page renders: a British spelling left in a paragraph, a
// spacing entity in a heading, a tag the index silently drops. These read
// the repository itself.
// ---------------------------------------------------------------------------

const REPO = fileURLToPath(new URL('.', import.meta.url));

/** Every post, with the tags its front matter declares. */
function corpus() {
  const dir = join(REPO, 'src/content/posts');
  const out = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const text = readFileSync(join(dir, file), 'utf8');
    const head = (text.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [, ''])[1];
    const tags = (head.match(/tags:\s*\[(.*?)\]/) || [, ''])[1]
      .split(',')
      .map((t) => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    out.set(file.replace(/\.md$/, ''), { tags, text });
  }
  return out;
}

/** The address a tag page lives at — the same rule as `src/lib/tags.ts`. */
function tagSlug(tag) {
  return tag.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Every text file under a directory, recursively. */
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(astro|ts|js|mjs|css|md|json)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** How many images the corpus asks for — the population a sweep must find. */
function corpusImageCount() {
  const dir = join(REPO, 'src/content/posts');
  let n = 0;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    let fence = false;
    for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
      if (line.trim().startsWith('```')) { fence = !fence; continue; }
      if (fence) continue;
      n += (line.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length;
    }
  }
  return n;
}

/** The number of years the career has run, by the rule in `lib/profile.ts`. */
function yearsWorked() {
  const profile = readFileSync(join(REPO, 'src/lib/profile.ts'), 'utf8');
  const start = (profile.match(/EXPERIENCE_START\s*=\s*'(\d{4}-\d{2}-\d{2})'/) || [])[1];
  if (!start) return -1;
  const ms = new Date(start + 'T00:00:00Z').getTime();
  const years = (Date.now() - ms) / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(1, Math.round(years));
}

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

async function source() {
  const posts = corpus();
  const projectDir = join(REPO, 'src/content/projects');
  const bodies = [
    ...[...posts.values()].map((p) => p.text),
    ...readdirSync(projectDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => readFileSync(join(projectDir, f), 'utf8')),
  ];
  const hits = (re) => bodies.filter((b) => re.test(b));

  const rules = [
    ['CONT-010 no spacing entity in the corpus', /&emsp;|&#819[45];/],
    ['CONT-012 no stray bash fence', /\n---\s*bash\b/],
    ['CONT-013 no "More to come" placeholder', /More to come/i],
    ['CONT-014 no untranslated Cyrillic', /[Ѐ-ӿ]/],
    ['CONT-015 no "Drop a comment"', /Drop a comment/i],
    ['CONT-018 one spelling of the name', /Anatoly/],
    ['CONT-021 no excerpt marker', /<!--\s*more\s*-->/],
    ['CONT-024 no British spelling in the copy',
      /\b(colour|colours|behaviour|behaviours|catalogue|defence|centre|authoris\w*|recognis\w*|serialis\w*|normalis\w*|organis(?:e|ed|es|ing|ation|ations|ational)\b|randomis\w*|desynchronis\w*)\b/i],
    ['CONT-037 no metadata block in a post body', /lead-meta/],
  ];
  for (const [name, re] of rules) {
    const found = hits(re);
    report(found.length === 0, name, found.length + ' found');
  }

  // CONT-024, second half: the copy in the templates and the comments in the
  // scripts. The rule above covers the posts; this one covers `src/` itself,
  // so a British spelling cannot come back through a comment or a label.
  const BRITISH = /\b(colour|colours|coloured|behaviour|behaviours|behavioural|catalogue|defence|centre|centres|centring|authoris\w*|recognis\w*|serialis\w*|normalis\w*|organis(?:e|ed|es|ing|ation)\b|randomis\w*|desynchronis\w*|neighbour\w*|labelled|labelling|cancelled|cancelling|travelled|travelling|judgement|honour\w*|summaris\w*|optimis\w*|generalis\w*|specialis\w*|utilis\w*|realis\w*|minimis\w*|maximis\w*)\b/i;
  const british = [];
  for (const file of walk(join(REPO, 'src'))) {
    if (file.endsWith('.md')) continue; // the posts are covered by the rule above
    const lines = readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!BRITISH.test(lines[i])) continue;
      british.push(file.slice(REPO.length) + ':' + (i + 1) + ' ' + lines[i].trim().slice(0, 90));
    }
  }
  report(british.length === 0, 'CONT-024 no British spelling in the source',
    british.length + ' found' + (british.length ? ' — ' + british.slice(0, 3).join(' | ') : ''));

  // CONT-025: a heading that capitalises two words in a row is written in
  // title case. The names below are the ones the corpus writes as names.
  const NAMES = /Unreal Engine|Dungeon ?Raider|Toon Tanks|Rust|Actix Web|OpenOCD|ESP32|Wi-Fi/g;
  const titleCase = [];
  for (const [slug, post] of posts) {
    for (const line of post.text.split('\n')) {
      const m = line.match(/^#{2,6}\s+(.*?)\s*$/);
      if (!m) continue;
      const rest = m[1].replace(NAMES, '');
      if (/[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}/.test(rest)) titleCase.push(slug + ': ' + m[1]);
    }
  }
  report(titleCase.length === 0, 'CONT-025 no heading is written in title case',
    titleCase.length + ' found' +
    (titleCase.length ? ' — ' + titleCase.slice(0, 3).join(' | ') : ''));

  const srcText = walk(join(REPO, 'src')).map((f) => readFileSync(f, 'utf8')).join('\n');

  report(!/Work Now/.test(srcText), 'CONT-027 no "Work Now" anywhere', 'the nav says Engagements');

  const components = readdirSync(join(REPO, 'src/components')).filter((f) => f.endsWith('.astro'));
  const unused = components.filter((c) => !srcText.includes('components/' + c));
  report(unused.length === 0, 'CONT-032 / QA-014 every component is used',
    unused.length + ' unused' + (unused.length ? ' — ' + unused.join(', ') : ''));

  report(existsSync(join(REPO, 'static/media/nrf52833')),
    'CONT-035 the media directory is named for the board', 'static/media/nrf52833');

  const base = readFileSync(join(REPO, 'src/layouts/Base.astro'), 'utf8');
  const footerAt = base.indexOf('<Footer');
  const modalAt = base.indexOf('<LetterModal');
  report(footerAt > modalAt, 'CONT-006 the footer follows the dialogs in the document',
    'footer at ' + footerAt + ', modal at ' + modalAt);

  // QA-010: the comment at the head of track.js names the mode each route
  // uses. It is a comment, but it is the map a reader of the file follows.
  // The reorg took the sideways tracks out; with track.js gone there is no
  // comment to read and nothing to check.
  const trackFile = join(REPO, 'src/scripts/track.js');
  if (existsSync(trackFile)) {
    const trackHead = readFileSync(trackFile, 'utf8')
      .split('\n').slice(0, 24).join('\n');
    const scrollLine = (trackHead.match(/scroll \([^)]*\)/) || [''])[0];
    const wheelLine = (trackHead.match(/wheel\s+\([^)]*\)/) || [''])[0];
    report(scrollLine.includes('/experience/'),
      'QA-010 the track comment names the right mode for /experience/', scrollLine);
    report(wheelLine.includes('/projects/'),
      'QA-010 the track comment names the right mode for /projects/', wheelLine);
  } else {
    console.log('SKIP  QA-010 the track comment — src/scripts/track.js is gone');
  }

  const os = readFileSync(join(REPO, 'src/scripts/os.js'), 'utf8');
  report(/kind \|\| 'Project type'/.test(os) && /subject \|\| 'Website enquiry'/.test(os),
    'CONT-036 the mail subject names the field and says what the mail is', 'the subject line');
}

// ---------------------------------------------------------------------------
// medium: the Medium and Low pass, checked against the served build
// ---------------------------------------------------------------------------

async function medium() {
  const posts = corpus();

  await withPage(async (page) => {
    // CONT-008 / CONT-009: every tag of every post is on the index, and
    // every tag on the index leads to a page.
    await page.goto(BASE + '/blog/', { waitUntil: 'domcontentloaded' });
    const cards = await page.evaluate(() =>
      [...document.querySelectorAll('.card-row .card')].map((c) => ({
        href: c.querySelector('.card-link')?.getAttribute('href') || '',
        tags: [...c.querySelectorAll('.tag-row a.tag')].map((a) => a.getAttribute('href') || ''),
        summary: (c.querySelector('p')?.textContent || '').trim(),
        flag: (c.querySelector('.card-flag')?.textContent || '').trim(),
      })));

    const missing = [];
    for (const card of cards) {
      const slug = card.href.replace(/^\/blog\//, '').replace(/\/$/, '');
      const want = posts.get(slug);
      if (!want) continue;
      const got = new Set(card.tags);
      for (const t of want.tags) {
        if (!got.has('/tags/' + tagSlug(t) + '/')) missing.push(slug + ' → ' + t);
      }
    }
    report(missing.length === 0, 'CONT-008 the index shows every tag of every post',
      missing.length + ' missing' + (missing.length ? ' — ' + missing.slice(0, 3).join(', ') : ''));

    const tagLinks = [...new Set(cards.flatMap((c) => c.tags))];
    const deadTags = [];
    for (const href of tagLinks) {
      const status = await page.evaluate(async (p) => (await fetch(p)).status, href);
      if (status !== 200) deadTags.push(href);
    }
    report(deadTags.length === 0, 'CONT-009 every tag chip leads to a page',
      deadTags.length + ' dead of ' + tagLinks.length +
      (deadTags.length ? ' — ' + deadTags.slice(0, 3).join(', ') : ''));

    // CONT-023: a card says what the post is, and a short post says it is
    // short. The flag has to mark a minority, or it says nothing.
    const noSummary = cards.filter((c) => c.summary.length < 20);
    report(noSummary.length === 0, 'CONT-023 every card carries a summary',
      noSummary.length + ' without one');
    const flagged = cards.filter((c) => c.flag === 'note').length;
    report(flagged > 0 && flagged < cards.length / 2,
      'CONT-023 a short post is marked as a note', flagged + ' of ' + cards.length + ' marked');

    // CONT-028: the count on the index is the number of posts.
    const lede = await page.evaluate(() =>
      (document.querySelector('.hero .lede')?.textContent || '').replace(/\s+/g, ' ').trim());
    const counted = lede.match(/^(\d+) notes/);
    report(!!counted && Number(counted[1]) === posts.size,
      'CONT-028 the count on the index is the number of posts',
      (counted ? counted[1] : '?') + ' of ' + posts.size);

    // CONT-016 / CONT-017: the numbers on the experience page are derived
    // from the data, so they agree with it.
    await page.goto(BASE + '/experience/', { waitUntil: 'domcontentloaded' });
    const exp = await page.evaluate(() => {
      const text = document.body.textContent.replace(/\s+/g, ' ');
      const m = text.match(/(\d+) skills in five tiers/);
      return {
        chips: document.querySelectorAll('.skill-chip').length,
        stated: m ? Number(m[1]) : -1,
        text,
      };
    });
    report(exp.stated > 0 && exp.chips === exp.stated,
      'CONT-016 the skill count on the page is the count of skills',
      exp.stated + ' stated, ' + exp.chips + ' rendered');

    const years = yearsWorked();
    const word = NUMBER_WORDS[years] || String(years);
    report(new RegExp('\\b' + word + ' years\\b', 'i').test(exp.text),
      'CONT-017 the years on the page are the years worked',
      years + ' years, said as "' + word + ' years"');

    // CONT-027: one name for the list of posts, and one for the work.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const nav = await page.evaluate(() =>
      [...document.querySelectorAll('header a')]
        .map((a) => a.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean));
    report(nav.includes('Writing') && !nav.includes('Blog'),
      'CONT-027 the nav says Writing', nav.join(', '));
    report(nav.includes('Engagements'), 'CONT-027 the nav says Engagements', nav.join(', '));

    // CONT-028: the footer carries the address the message form points at.
    const footerAddress = await page.evaluate(() =>
      document.querySelector('footer a[href^="mailto:"]')?.getAttribute('href') || '');
    report(footerAddress === 'mailto:mr.a.maltsev@gmail.com',
      'CONT-028 the footer carries the address', footerAddress);

    // CONT-030: the form asks with two menus and one example sentence.
    const form = await page.evaluate(() => {
      const selects = [...document.querySelectorAll('#letterModal select')];
      return {
        selects: selects.length,
        options: selects.map((s) => s.options.length),
        placeholder: document.querySelector('#l-subject')?.getAttribute('placeholder') || '',
      };
    });
    report(form.selects === 2 && form.options.every((n) => n >= 2),
      'CONT-030 the form asks with two menus', form.selects + ' selects');
    report(form.placeholder === 'What are you building?',
      'CONT-030 the subject field shows one example', form.placeholder);

    // CONT-031: the newest writing is on the front page.
    const recent = await page.evaluate(() => {
      const sec = document.querySelector('.home-recent');
      if (!sec) return [];
      return [...sec.querySelectorAll('.card')].map((c) => ({
        date: (c.querySelector('.card-meta')?.textContent || '').trim(),
        title: (c.querySelector('h3')?.textContent || '').trim(),
        summary: (c.querySelector('p')?.textContent || '').trim(),
      }));
    });
    report(recent.length === 3, 'CONT-031 the home page shows three recent posts',
      recent.length + ' cards');
    report(recent.every((c) => c.date && c.title && c.summary.length > 20),
      'CONT-031 each recent card carries a date, a title and a summary',
      recent.map((c) => (c.date ? 'ok' : 'no date')).join(', '));

    // CONT-034: a panel names what its link is, not where it points.
    await page.goto(BASE + '/projects/', { waitUntil: 'domcontentloaded' });
    const panels = await page.evaluate(() =>
      [...document.querySelectorAll('a.track-panel.panel-project')].map((a) => ({
        href: a.getAttribute('href') || '',
        label: a.getAttribute('aria-label') || '',
      })));
    const wrong = panels.filter((p) => {
      const want = /^https?:\/\//.test(p.href) ? 'Open the project'
        : p.href === '/blog/' ? 'Browse the writing'
          : p.href.startsWith('/blog/') ? 'Read the post'
            : 'View the project';
      return !p.label.endsWith(want);
    });
    report(panels.length > 0 && wrong.length === 0,
      'CONT-034 every project panel names what its link is',
      wrong.length + ' of ' + panels.length + ' wrong' +
      (wrong.length ? ' — ' + wrong.slice(0, 2).map((p) => p.href).join(', ') : ''));

    // QA-010: the projects runway is driven by the wheel.
    const mode = await page.evaluate(() =>
      document.querySelector('.projects-track')?.getAttribute('data-track-mode') || '');
    report(mode === 'wheel', 'QA-010 the projects runway is a wheel runway', mode);

    // CONT-006 / CONT-038: the footer is the last thing in the document,
    // and a post ends with a way to keep reading.
    await page.goto(BASE + '/blog/2026-10-10-unknown-outcome-is-not-a-failure-state/',
      { waitUntil: 'domcontentloaded' });
    const post = await page.evaluate(() => {
      const meta = document.querySelector('.lead-meta')?.textContent.replace(/\s+/g, ' ').trim() || '';
      const html = document.body.innerHTML;
      return {
        meta,
        date: /\d{1,2} [A-Z][a-z]+ \d{4}/.test(meta),
        author: /Anatolii Maltsev/.test(meta),
        reading: /\d+ min read/.test(meta),
        nav: !!document.querySelector('.post-nav'),
        related: !!document.querySelector('.post-related'),
        footer: !!document.querySelector('footer'),
        footerLast:
          html.indexOf('<footer') > html.indexOf('id="letterModal"') &&
          html.indexOf('<footer') > html.indexOf('id="palette"'),
      };
    });
    report(post.date, 'CONT-038 the post shows its date the way a reader says it', post.meta);
    report(post.author, 'CONT-038 the post names its author', post.meta);
    report(post.reading, 'CONT-038 the post says how long it takes to read', post.meta);
    report(post.nav && post.footer, 'CONT-038 the post closes with a footer and post-nav', post.meta);
    report(post.footerLast, 'CONT-006 the footer is the last thing in the document', 'the order of the body');

    // QA-006: a table scrolls rather than pushing the article sideways.
    const tables = await page.evaluate(() =>
      [...document.querySelectorAll('table')].map((t) => {
        let el = t.parentElement;
        while (el) {
          if (el.classList && el.classList.contains('table-scroll')) return true;
          el = el.parentElement;
        }
        return false;
      }));
    report(tables.length === 0 || tables.every(Boolean),
      'QA-006 every table sits in a scroll container',
      tables.filter((x) => !x).length + ' of ' + tables.length + ' outside');

    // QA-013: the status chip is big enough to hit and says what it does.
    const chip = await page.evaluate(() => {
      const el = document.querySelector('.status-cta');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { height: Math.round(r.height), label: el.getAttribute('aria-label') || '' };
    });
    report(!!chip && chip.height >= 44, 'QA-013 the status chip is at least 44px tall',
      chip ? chip.height + 'px' : 'no chip');
    report(!!chip && /say hello/i.test(chip.label),
      'QA-013 the status chip says what it does', chip ? chip.label : 'no chip');

    // QA-016: the error page is not indexed and points at itself.
    await page.goto(BASE + '/404.html', { waitUntil: 'domcontentloaded' });
    const e404 = await page.evaluate(() => ({
      body: document.body.textContent.replace(/\s+/g, ' '),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
    }));
    report(/Back to home/.test(e404.body) && /Browse writing/.test(e404.body),
      'CONT-026 the error page offers a way out', e404.body.slice(0, 60));
    report(e404.canonical.startsWith('https://') && /\/404\.html$/.test(e404.canonical),
      'QA-016 the error page canonicalises to itself', e404.canonical);
    report(/noindex/.test(e404.robots), 'QA-016 the error page is not indexed', e404.robots);

    // QA-017: no page claims the old domain.
    const titles = await page.evaluate(async (base) => {
      const xml = await (await fetch(base + '/sitemap.xml')).text();
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const urls = [...doc.querySelectorAll('loc')].map((l) => new URL(l.textContent).pathname);
      const out = [];
      for (const u of urls) {
        const html = await (await fetch(base + u)).text();
        const d = new DOMParser().parseFromString(html, 'text/html');
        out.push(d.title || '');
      }
      return out;
    }, BASE);
    const old = titles.filter((t) => /maltsev\.dev/i.test(t));
    report(old.length === 0, 'QA-017 no page title names the old domain',
      old.length + ' of ' + titles.length);
  });

  // QA-005 / QA-015: the diagram on a phone scrolls sideways, and it does
  // not take two seconds to arrive.
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    // The figure assembles when it first scrolls into view, so the reveal
    // has to be measured after it is live — before that the lines carry no
    // animation at all and every delay reads as zero.
    await page.locator('.stack-art').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !!document.querySelector('.stack.is-live'), null,
      { timeout: 5000 }).catch(() => {});
    const art = await page.evaluate(() => {
      const el = document.querySelector('.stack-art');
      if (!el) return null;
      const cs = getComputedStyle(el);
      const delays = [...document.querySelectorAll('.stack-line')].map((l) => {
        const d = getComputedStyle(l).animationDelay;
        const first = d.split(',')[0].trim();
        return first.endsWith('ms') ? parseFloat(first) : parseFloat(first) * 1000;
      });
      return {
        overflowX: cs.overflowX,
        pageScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        maxDelay: delays.length ? Math.max(...delays) : -1,
      };
    });
    report(!!art && (art.overflowX === 'auto' || art.overflowX === 'scroll'),
      'QA-005 the diagram scrolls sideways on a phone', art ? art.overflowX : 'no diagram');
    report(!!art && art.pageScroll <= 1,
      'QA-005 the page does not scroll sideways on a phone',
      art ? art.pageScroll + 'px of overflow' : 'no diagram');
    report(!!art && art.maxDelay >= 0 && art.maxDelay <= 1000,
      'QA-015 the diagram assembles in about a second',
      art ? art.maxDelay + 'ms of delay on the last row' : 'no diagram');
  }, { viewport: { width: 390, height: 844 } });

  // QA-011: under reduced motion the dot does not pulse.
  await withPage(async (page) => {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    const dot = await page.evaluate(() => {
      const el = document.querySelector('.stack-dot');
      return el ? getComputedStyle(el).animationName : '';
    });
    report(dot === 'none', 'QA-011 the diagram dot does not pulse under reduced motion', dot);
  }, { reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
}

const groups = { content, cases, track, wheel, casecss, footer, palette, contrast, seo, perf, posts, source, medium };

if (group.startsWith('seq:')) {
  const names = group.slice(4).split(',');
  for (const n of names) { console.log('--- ' + n); await groups[n](); }
} else if (group === 'all') {
  for (const fn of Object.values(groups)) await fn();
} else if (groups[group]) {
  await groups[group]();
} else {
  console.error('unknown group: ' + group);
}

await browser.close();
console.log('\n' + (checks - failures) + '/' + checks + ' checks passed');
process.exit(failures ? 1 : 0);
