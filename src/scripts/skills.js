// The hover card on the skill chips.
//
// One card per chip, each with its own id, and each chip pointing at its own
// card. There used to be a single card for the whole page that every chip
// described: its text was whatever chip was hovered last, so a screen reader
// read the description of one skill while the reader was on another.
//
// The card is absolutely positioned in document coordinates and follows the
// chip down the page while the reader is still over it, closing as soon as the
// chip is left behind.
//
// Three facts per skill and no prose: how many jobs it was used on, what
// certifies it, and where it shipped. The data is src/data/skills.ts, the same
// objects the pyramid above is rendered from.

(function () {
  'use strict';

  var section = document.querySelector('[data-skills]');
  if (!section) return;

  var chips = Array.prototype.slice.call(section.querySelectorAll('[data-skill]'));
  var dataNode = document.getElementById('skills-data');
  if (!chips.length || !dataNode) return;

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

  // One card per chip, and the chip that owns it. The cards are in the markup
  // now — one per chip, each with its own id, so a chip's `aria-describedby`
  // points at a card that is in the HTML before this script runs at all. The
  // script finds them by id and takes them over: it owns where they sit, when
  // they open and when they close. A card that is somehow missing is built
  // here, so the behavior never depends on the markup being right.
  var cards = {};

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

  function fill(card, skill) {
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

  // Take the cards over. The card that is open is the only one shown, so the
  // page still shows one card at a time.
  chips.forEach(function (chip) {
    var id = chip.getAttribute('data-skill');
    var skill = data[id];
    if (!skill) return;

    var card = document.getElementById('skill-card-' + id);
    if (!card) {
      card = document.createElement('div');
      card.className = 'skill-card';
      card.id = 'skill-card-' + id;
      card.setAttribute('data-skill-card', id);
      document.body.appendChild(card);
    }
    card.setAttribute('role', 'tooltip');
    // While it is closed the card is out of the accessibility tree, so a
    // screen reader reading the page in order does not walk through every
    // closed card before the content.
    card.setAttribute('aria-hidden', 'true');
    fill(card, skill);

    cards[id] = card;
    chip.setAttribute('aria-describedby', card.id);
  });

  /** Below the chip if there is room, above it if there is not. */
  function place(chip, card) {
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

  function cardFor(chip) {
    return chip ? cards[chip.getAttribute('data-skill')] : null;
  }

  function show(chip) {
    var card = cardFor(chip);
    if (!card) return;

    // Another chip's card is open: close it first, or the page shows two.
    if (open && open !== chip) closeCard(open);

    card.style.visibility = 'hidden';
    card.setAttribute('data-open', '');
    // The card is the chip's description, so it has to be in the tree while
    // the chip is focused.
    card.removeAttribute('aria-hidden');
    place(chip, card);
    card.style.visibility = '';

    chip.classList.add('is-open');
    open = chip;
  }

  /**
   * Put a card away: out of the tree, out of the document flow, and back at
   * the origin rather than wherever it last was. It is absolutely positioned,
   * so a card closed at the far end of a wide screen keeps widening the
   * document — on a phone that is a horizontal scrollbar with nothing in it.
   * Hiding first means the jump is not seen.
   */
  function closeCard(chip) {
    if (!chip) return;
    var card = cardFor(chip);
    if (!card) return;
    card.removeAttribute('data-open');
    card.setAttribute('aria-hidden', 'true');
    card.style.visibility = 'hidden';
    card.style.top = '0px';
    card.style.left = '0px';
    chip.classList.remove('is-open');
  }

  function hide(chip) {
    if (chip) chip.classList.remove('is-open');
    closeCard(open);
    open = null;
  }

  chips.forEach(function (chip) {
    // A short delay on the way out, so moving between two neighboring chips
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
        if (open.matches(':hover') || open === document.activeElement) place(open, cardFor(open));
        else hide();
      });
    },
    { passive: true }
  );

  window.addEventListener('resize', function () {
    if (open) place(open, cardFor(open));
  });
})();