/**
 * The portrait, on the front page.
 *
 * The picture itself is the tool's own — its shaders, its points, its loop,
 * its drag. All this file does is tell it what colour to draw in, because
 * the site has three themes and a picture drawn for one of them is wrong
 * on the other two.
 *
 * The two terminal themes draw the picture in their own colour: an amber
 * tube has one colour and a green one has one colour, and the tool's
 * single-colour mode is exactly that — one colour, with the tone of the
 * photograph carried by how bright it is. The paper theme draws the same
 * picture in ink on paper, and there the tone of the photograph is carried
 * the other way round: by how close the ink is to the paper.
 */
import { createPortrait } from '../lib/portrait';
import {
  PORTRAIT_COLS,
  PORTRAIT_ROWS,
  PORTRAIT_LIGHT_MIN,
  PORTRAIT_LIGHT_MAX,
  PORTRAIT_PICTURE,
  PORTRAIT_HEIGHT,
} from '../data/portrait';

/**
 * The face the characters are drawn in.
 *
 * The same face the site uses for code. The characters have to be a
 * monospaced face or the sheet comes out ragged.
 */
function fontStack() {
  const stack = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-mono')
    .trim();

  return stack || 'ui-monospace, monospace';
}

/** A colour, as the three numbers the shader wants. */
function rgb(value) {
  const clean = value.trim().replace('#', '');

  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) / 255,
      parseInt(clean[1] + clean[1], 16) / 255,
      parseInt(clean[2] + clean[2], 16) / 255,
    ];
  }

  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
}

/**
 * The colour of the picture, for the theme that is on.
 *
 * The terminal themes draw the picture in their own brightest colour, the
 * way an amber tube draws everything in amber. The paper theme draws it in
 * ink, on paper, and there the tone of the photograph rides on how close
 * the ink is to the paper rather than on the colour of the ink itself.
 */
function colours() {
  const theme = document.documentElement.dataset.theme || 'phosphore';
  const style = getComputedStyle(document.documentElement);
  const paper = theme === 'pierre';

  return {
    mono: true,
    light: paper,
    ink: rgb(style.getPropertyValue(paper ? '--encre' : '--creme')),
    ground: rgb(style.getPropertyValue('--papier')),
    weight: 0.18,
  };
}

function start() {
  const canvas = document.querySelector('[data-portrait]');
  if (!canvas) return;

  const status = document.querySelector('[data-portrait-status]');
  if (status) {
    status.textContent = `cat portrait.asc · ${PORTRAIT_COLS}×${PORTRAIT_ROWS}`;
  }

  const theme = colours();


  createPortrait({
    canvas,
    picture: PORTRAIT_PICTURE,
    height: PORTRAIT_HEIGHT,
    font: fontStack(),
    mono: theme.mono,
    ink: theme.ink,
    ground: theme.ground,
    light: theme.light,
    weight: theme.weight,
    range: [PORTRAIT_LIGHT_MIN, PORTRAIT_LIGHT_MAX],
  })
    .then((portrait) => {
      /* The theme changes the colour the picture is drawn in. */
      new MutationObserver(() => {
        const next = colours();
        portrait.mono(next.mono);
        portrait.light(next.light);
        portrait.ink(next.ink);
        portrait.ground(next.ground);
        portrait.weight(next.weight);
      }).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });

      /*
        The face is a web font, and a sheet of glyphs drawn in a font that
        has not arrived yet is a sheet of the wrong characters. The picture
        is drawn again in the real face when it turns up.
      */
      if (document.fonts?.ready) {
        document.fonts.ready.then(() => {
          portrait.atlas(fontStack());
        });
      }
    })
    .catch(() => {
      /* No WebGL, no picture. The window is still a window. */
      canvas.setAttribute('hidden', '');
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
