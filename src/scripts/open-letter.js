// Opens the letter modal on arrival.
//
// Loaded only by /contact/. The boot overlay locks scrolling for about a
// second and paints over the page, so this waits for it to finish rather than
// opening underneath — otherwise the modal appears, then is covered, then
// reappears, which reads as a glitch.

(function () {
  'use strict';

  var delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;

  function open() {
    var opener = document.querySelector('[data-open-letter]');
    if (!opener) return;
    opener.click();
  }

  function whenReady(fn) {
    var overlay = document.getElementById('bootOverlay');
    if (!overlay || overlay.hidden) {
      setTimeout(fn, delay);
      return;
    }
    // The overlay sets .is-done and then hides itself; either is a good cue.
    overlay.addEventListener('animationend', () => setTimeout(fn, 120), { once: true });
    setTimeout(fn, delay + 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => whenReady(open), { once: true });
  } else {
    whenReady(open);
  }
})();