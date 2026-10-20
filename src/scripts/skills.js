// The hover card on the skill chips.
//
// One card element for the whole page, moved to whichever chip the pointer or
// the keyboard is on. It is absolutely positioned in document coordinates and
// follows the chip down the page while the reader is still over it, closing as
// soon as the chip is left behind.
//
// Three facts per skill and no prose: how many jobs it was used on, what
// certifies it, and where it shipped. The data is src/data/skills.ts, the same
// objects the pyramid above is rendered from.

(function () {
  'use strict';

  var section = document.querySelector('[data-skills]');
  if (!section) return;

  var chips = Array.prototype.slice.call(section.querySelectorAll('[data-skill]'));
  var card = document.querySelector('[data-skill-card]');
  var dataNode = document.getElementById('skills-data');
  if (!chips.length || !card || !dataNode) return;

  var data;
  try {
    data = JSON.parse(dataNode.textContent);
  } catch (e) {
    return;
  }

  var GAP = 8; // between the chip and the card
  var EDGE = 12; // never let the card run off the side of the window

  // Whether there is a pointer to hover with at all. A tap on a touch screen
  // makes the browser fire a compatibility mouseenter at the tap point, and if
  // that opened the card then the click that follows it in the same gesture
  // would toggle it straight back shut — a touch screen showing nothing. So on
  // a device with no hover, hover does nothing and the click is a plain toggle.
  var canHover = window.matchMedia('(hover: hover)').matches;

  var open = null; // the chip currently holding the card
  var timer = null;

  /**
   * One row of the card: a label and how many things are behind it.
   *
   * The count alone, not the names. Printed in full, five certificates pushed
   * the card to six lines and turned a glance into a read, and the reader who
   * wants the names has them in the profile — what the card is for is seeing how
   * much is behind a chip before deciding to ask.
   *
   * A row with nothing behind it is left out entirely rather than shown as a
   * dash: most skills have no certification, so a third of the card would be
   * empty evidence of absence, which is not evidence of anything.
   * Returns null, and the caller skips it.
   */
  function row(label, items) {
    if (!items.length) return null;

    var dt = document.createElement('dt');
    dt.textContent = label;

    var dd = document.createElement('dd');
    dd.textContent = items.length;

    return [dt, dd];
  }

  function fill(skill) {
    card.textContent = '';

    var name = document.createElement('p');
    name.className = 'skill-card-name';
    name.textContent = skill.name;
    card.appendChild(name);

    var dl = document.createElement('dl');

    // append, not appendChild: the row is a pair, and appendChild takes one.
    [
      row('Jobs', skill.jobs),
      row('Certs', skill.certs),
      row('Projects', skill.projects),
    ].forEach(function (pair) {
      if (pair) dl.append.apply(dl, pair);
    });

    card.appendChild(dl);
  }

  /** Below the chip if there is room, above it if there is not. */
  function place(chip) {
    var r = chip.getBoundingClientRect();
    var box = card.getBoundingClientRect();

    var top = window.scrollY + r.bottom + GAP;
    if (r.bottom + box.height + GAP > window.innerHeight && r.top - box.height - GAP > 0) {
      top = window.scrollY + r.top - box.height - GAP;
    }

    var left = window.scrollX + r.left + r.width / 2 - box.width / 2;
    left = Math.max(EDGE, Math.min(left, window.scrollX + window.innerWidth - box.width - EDGE));

    card.style.top = Math.round(top) + 'px';
    card.style.left = Math.round(left) + 'px';
  }

  function show(chip) {
    var skill = data[chip.getAttribute('data-skill')];
    if (!skill) return;

    fill(skill);
    card.style.visibility = 'hidden';
    card.setAttribute('data-open', '');
    place(chip);
    card.style.visibility = '';

    if (open && open !== chip) open.classList.remove('is-open');
    chip.classList.add('is-open');
    open = chip;
  }

  function hide(chip) {
    if (chip) chip.classList.remove('is-open');
    else if (open) open.classList.remove('is-open');
    card.removeAttribute('data-open');
    // Put it back at the origin rather than leaving it wherever it last was.
    // It is absolutely positioned, so a card closed at the far end of a wide
    // screen keeps widening the document — on a phone that is a horizontal
    // scrollbar with nothing in it. Hiding first means the jump is not seen.
    card.style.visibility = 'hidden';
    card.style.top = '0px';
    card.style.left = '0px';
    open = null;
  }

  chips.forEach(function (chip) {
    // A short delay on the way out, so moving between two neighbouring chips
    // does not flash the card closed and open again.
    chip.addEventListener('mouseenter', function () {
      if (!canHover) return;
      clearTimeout(timer);
      show(chip);
    });

    chip.addEventListener('mouseleave', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (!open || !open.matches(':hover')) hide(chip);
      }, 120);
    });

    // Keyboard and touch both arrive as focus, which is also why the chips are
    // buttons rather than list items: there has to be something to focus.
    chip.addEventListener('focus', function () {
      clearTimeout(timer);
      show(chip);
    });

    chip.addEventListener('blur', function () {
      if (!open || !open.matches(':hover')) hide(chip);
    });

    // A tap is the only way to open or dismiss on a touch screen, where there is
    // no pointer to move away, so the click is a plain toggle. On a device with
    // a pointer the hover has already opened the card by the time the click
    // lands, and the same toggle closes it again — which is what a click on a
    // thing that is already open should do.
    chip.addEventListener('click', function () {
      clearTimeout(timer);
      if (open === chip) hide(chip);
      else show(chip);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  // While the page scrolls the card follows its chip rather than shutting: the
  // reader is still pointing at the same chip, and a card that vanished under
  // the pointer would be read as the chip being unresponsive. Scrolled past the
  // chip, it closes.
  var pending = false;
  window.addEventListener(
    'scroll',
    function () {
      if (pending || !open) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        if (!open) return;
        if (open.matches(':hover') || open === document.activeElement) place(open);
        else hide();
      });
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    if (open) place(open);
  });
})();