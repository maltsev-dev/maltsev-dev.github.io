// Generic dialog wiring for DetailModal: any element carrying [data-dialog]
// holds panels marked [data-panel], and any trigger anywhere on the page with
// data-open-dialog="<that id>" plus data-panel="<panel id>" opens one.
//
// Same contract as the letter and stage dialogs in os.js — Escape closes, Tab
// is trapped inside, and focus returns to the trigger so a keyboard visitor is
// never dropped back at the top of the page. Kept generic because the freelance
// page opens two of these from two separate grids.
(function detailDialogs() {
  var modals = Array.prototype.slice.call(document.querySelectorAll('[data-dialog]'));
  if (!modals.length) return;

  var FOCUSABLE =
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  // Every panel lives in the DOM at once and all but one are hidden, so the
  // selector alone returns the close button of every panel. Trap only on what
  // is on screen, or Tab walks out of an open dialog into a panel nobody can
  // reach.
  function focusables(root) {
    return Array.prototype.slice.call(root.querySelectorAll(FOCUSABLE)).filter(function (el) {
      return el.getClientRects().length > 0;
    });
  }

  var current = null;

  modals.forEach(function (modal) {
    var panels = Array.prototype.slice.call(modal.querySelectorAll('[data-panel]'));
    var box = modal.querySelector('.dlg-box');
    var lastFocus = null;

    function close() {
      if (modal.hidden) return;
      panels.forEach(function (p) {
        p.hidden = true;
      });
      modal.hidden = true;
      document.body.style.overflow = '';
      if (current && current.modal === modal) current = null;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function open(panel, trigger) {
      lastFocus = trigger || document.activeElement;
      panels.forEach(function (p) {
        p.hidden = p !== panel;
      });
      modal.hidden = false;
      // Re-point the dialog's accessible name at the panel now on screen. The
      // markup ships a default, but ten panels share one dialog and only the
      // open one can describe it.
      var titleId = panel.querySelector('[id]') && panel.querySelector('[id]').id;
      if (titleId) modal.setAttribute('aria-labelledby', titleId);
      document.body.style.overflow = 'hidden';
      // The box is the scroller and is shared by every panel, so without this
      // the second item opens halfway down, where the last one was left.
      if (box) box.scrollTop = 0;
      focusables(panel)[0] && focusables(panel)[0].focus();
      current = { modal: modal, close: close };
    }

    // One delegated listener per dialog rather than one per close button: the
    // panels are re-rendered markup, and a closer that is off-screen still has
    // to be wired.
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-dialog]')) close();
    });

    Array.prototype.slice.call(
      document.querySelectorAll('[data-open-dialog="' + modal.dataset.dialog + '"]')
    ).forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        var id = trigger.dataset.panel;
        var panel = id && modal.querySelector('[data-panel="' + id + '"]');
        if (panel) open(panel, trigger);
      });
    });
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      current.close();
      return;
    }

    if (e.key !== 'Tab') return;

    var items = focusables(current.modal);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
})();
