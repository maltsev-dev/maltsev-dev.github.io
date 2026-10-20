// Sideways track.
//
// Two modes, told apart by `data-track-mode` on the runway:
//
//   wheel  (default on /experience/) — the page does not scroll. The wrapper is
//          one viewport tall and the wheel feeds the row directly: a trackpad
//          swipe arrives as deltaX, a mouse wheel as deltaY, and both mean the
//          same thing here. Arrow keys step one card at a time.
//   scroll (/projects/)             — the page scrolls down and the runway's
//          height carries the row's travel, exactly as before.
//
// Both modes share one render path: a progress fraction in, a transform and a
// lit panel out.

(function () {
  'use strict';

  var runway = document.querySelector('[data-track-scroll]');
  var track = document.querySelector('[data-track]');
  var row = document.querySelector('[data-track-row]');
  if (!runway || !track || !row) return;

  var panels = Array.prototype.slice.call(row.children);
  var branches = document.querySelector('[data-branches]');
  var branchNodes = branches
    ? Array.prototype.slice.call(branches.querySelectorAll('.branch-list li'))
    : [];
  var hudCurrent = document.querySelector('[data-hud-current]');
  // The career track has the rail; the projects track has a progress bar in its
  // readout instead. Both are drawn from the same --track-progress.
  var hudBar = document.querySelector('[data-hud-bar]');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wheelMode = runway.getAttribute('data-track-mode') === 'wheel';
  var pos = 0;

  // Stacked layouts (narrow screens, reduced motion) need no travel at all —
  // CSS removes the transform and shows every panel, so stand down.
  function isHorizontal() {
    return !reduce && window.matchMedia('(min-width: 52.1rem)').matches;
  }

  function clamp(v) {
    return Math.min(1, Math.max(0, v));
  }

  // The row's own overflow width less one screen.
  //
  // The trailing padding is counted by hand because scrollWidth stops at the
  // last panel — a row's end padding is not part of its scrollable overflow —
  // and that padding is what holds the last card clear of the frame's right edge
  // at the end of the travel. Without it the travel ends a card's width short
  // and the last panel stops flush right instead of centred.
  function travel() {
    var w = row.scrollWidth;
    if (w <= track.clientWidth) return 0;
    var padEnd = parseFloat(window.getComputedStyle(row).paddingRight) || 0;
    return w + padEnd - track.clientWidth;
  }

  // The centring padding at the head of the row: how far the row sits from where
  // it wants to start, once spent.
  function lead() {
    return parseFloat(window.getComputedStyle(row).paddingLeft) || 0;
  }

  // How far the row actually moves between the two ends of the travel: the
  // travel less the leading padding, which is wound off before the row starts
  // moving. This — not `travel()` — is what a notch of wheel has to be measured
  // against, or the row would need a screenful of scrolling more than it does.
  function span() {
    return Math.max(0, travel() - lead());
  }

  // Light the one rung the current panel belongs to. A panel can be off a rail
  // entirely — the toolkit card is not a job — so nothing is lit then.
  function lightStage(id) {
    branchNodes.forEach(function (node) {
      node.classList.toggle('is-on', !!id && node.getAttribute('data-stage') === id);
    });
  }

  function render(p) {
    // The row's padding holds its first and last cards clear of the frame's
    // edges, which is right for the end of the travel and wrong for the start:
    // on arrival the opening panel sits half a card in, leaving that much empty
    // frame to its left — a hole that only closes once the reader has scrolled.
    // So the row starts wound forward by its own leading padding and unwinds
    // across the travel: flush against the page margin at the start, last card
    // centred at the end. Linear in p, so one constant speed the whole way.
    var offset = -(lead() + span() * p);
    row.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
    if (branches) branches.style.setProperty('--track-progress', p.toFixed(4));
    if (hudBar) hudBar.style.setProperty('--track-progress', p.toFixed(4));

    // Light the panel nearest the centre of the frame, and only that one.
    //
    // Not by measuring the panels now — they are mid-transform, and the opening
    // one sits flush against the page margin rather than near the middle, so a
    // proximity test lights its neighbour on arrival. Instead the same question
    // is asked of the geometry: at what fraction of the travel is each card
    // centred? Each card is one pitch further along, so that fraction is linear
    // in the index.
    //
    // Clamped to the travel, because at the ends it falls outside: the first
    // card is centred a little *before* the row starts and the last a little
    // after it ends. Left unclamped the first card would never be the nearest to
    // anything and the page would open one card along, with the panel the
    // reader actually arrived at sitting dark to the left. Clamped, a card owns
    // the end of the travel its centre falls short of, which is what it is.
    var current = 0;
    var reach = span();
    if (reach > 0 && panels.length > 1) {
      var first = panels[0].getBoundingClientRect();
      var pitch = panels[1].getBoundingClientRect().left - first.left;
      var rest = (first.width - track.clientWidth) / 2;
      var best = Infinity;

      panels.forEach(function (panel, i) {
        var at = clamp((i * pitch + rest) / reach);
        var d = Math.abs(at - p);
        if (d < best) {
          best = d;
          current = i;
        }
      });
    }

    panels.forEach(function (panel, i) {
      panel.classList.toggle('is-current', i === current);
    });
    lightStage(panels[current].getAttribute('data-stage'));
    if (hudCurrent) hudCurrent.textContent = String(current + 1).padStart(2, '0');
  }

  function standDown() {
    row.style.transform = '';
    pos = 0;
    panels.forEach(function (p) {
      p.classList.remove('is-current');
    });
    if (branches) branches.style.setProperty('--track-progress', '0');
    if (hudBar) hudBar.style.setProperty('--track-progress', '0');
    lightStage(null);
  }

  // ----- wheel mode --------------------------------------------------------

  function onWheel(e) {
    if (!wheelMode || !isHorizontal()) return;
    var t = span();
    if (!t) return;

    // Nothing on the page scrolls, but the wheel event still bubbles to the
    // viewport and rubber-bands on macOS. Swallow it.
    e.preventDefault();

    // A trackpad swipe arrives on x, a mouse wheel on y; either one means
    // sideways here. deltaMode 1 is lines and 2 is pages — both arrive as a
    // bare number otherwise and would scroll the row by a pixel at a time.
    var raw = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    var unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;

    pos = clamp(pos + (raw * unit) / t);
    render(pos);
  }

  function onKey(e) {
    if (!wheelMode || !isHorizontal()) return;
    var t = span();
    var pitch = t && panels.length > 1
      ? Math.abs(panels[1].getBoundingClientRect().left - panels[0].getBoundingClientRect().left)
      : t;
    var step = t ? pitch / t : 0;
    var next;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        next = pos + step;
        break;
      case 'ArrowLeft':
      case 'PageUp':
        next = pos - step;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    pos = clamp(next);
    render(pos);
  }

  // ----- scroll mode -------------------------------------------------------

  function onScroll() {
    if (!isHorizontal()) {
      standDown();
      return;
    }
    if (travel() === 0) return;

    // Progress comes from the runway, not the frame: the frame is sticky, so
    // its own position barely moves and would report no travel at all. The
    // runway is the element whose height encodes the scroll distance.
    var runTop = runway.offsetTop;
    var runRange = runway.offsetHeight - track.offsetHeight;
    var p = runRange > 0 ? clamp((window.scrollY - runTop) / runRange) : 0;
    pos = p;
    render(p);
  }

  // ----- wiring ------------------------------------------------------------

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      if (wheelMode) {
        // Only the layout can invalidate the row — no scroll to watch.
        if (!isHorizontal()) standDown();
        else render(pos);
      } else {
        onScroll();
      }
      queued = false;
    });
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKey);

  // Fonts land after first paint and change the card widths, which changes how
  // far the row has to travel.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule);
  }

  schedule();
})();