// Site chrome: theme switching, scroll reveal, command palette, contact form.
// No framework — everything here is a DOM effect on pre-rendered HTML.

import { RAMPS, resolveRamp, themeColor } from '../data/themes';

(function () {
  'use strict';

  var html = document.documentElement;

  // ---- Reduced motion ----------------------------------------------------
  // Read once at startup. Every animated effect below checks it rather than
  // each having its own listener, and the media query in animation.css covers
  // the CSS side.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll lock --------------------------------------------------------
  // Four things lock the page while they are open: the boot overlay, the
  // command palette, the letter form and the stage dialog. Each used to write
  // `body.style.overflow` directly, so the first of them to finish released
  // the lock for all of them — open the palette while the boot sequence was
  // still playing and the page scrolled behind it. A counter gives every
  // owner its own release.
  var scrollLocks = 0;

  function lockScroll() {
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (!scrollLocks) document.body.style.overflow = '';
  }

  // ---- Boot sequence -----------------------------------------------------
  // Once per session. Anything already in the DOM stays interactive underneath;
  // the overlay only covers it while it plays.
  (function boot() {
    var overlay = document.getElementById('bootOverlay');
    var lines = document.getElementById('bootLines');
    if (!overlay || !lines || reduceMotion) return;

    // Respect the visitor's earlier choice: don't replay on a later pageview.
    if (sessionStorage.getItem('booted') === '1') return;

    var year = new Date().getFullYear();
    var script = [
      ['POST', 'agentic engineering'],
      ['MODE', 'static / no runtime'],
      ['THEME', html.dataset.theme || 'phosphore'],
      ['FONT', 'anton + inter'],
      ['BUILD', year],
    ];

    overlay.hidden = false;
    lockScroll();

    script.forEach(function (row, i) {
      var el = document.createElement('div');
      el.className = 'boot-line';
      el.innerHTML = '<b>' + row[0] + '</b><span>' + row[1] + '</span>';
      el.style.opacity = '0';
      lines.appendChild(el);
      // Reveal one line at a time. The overlap is what makes it read as a
      // console filling rather than a slideshow: each line starts before the
      // previous has finished fading in.
      setTimeout(function () {
        el.style.transition = 'opacity 200ms cubic-bezier(0.3, 0, 0.2, 1)';
        el.style.opacity = '1';
      }, 90 + i * 110);
    });

    setTimeout(function () {
      try {
        sessionStorage.setItem('booted', '1');
      } catch (e) {
        /* storage blocked — the overlay still closes, it just replays */
      }
      unlockScroll();
      overlay.classList.add('is-done');
      overlay.addEventListener('animationend', function () {
        overlay.hidden = true;
      }, { once: true });
      // Belt and braces: if the animation never fires (reduced-motion changes
      // mid-session, background tab throttling), still let the page through.
      setTimeout(function () {
        overlay.hidden = true;
      }, 700);
    }, 90 + script.length * 130 + 420);
  })();

  // ---- Scroll progress ---------------------------------------------------
  (function progress() {
    var bar = document.getElementById('progressBar');
    if (!bar || reduceMotion) return;

    // The bar is scaled, not resized. Writing a width on it every frame makes
    // the browser lay the bar out again on every frame, and the layout is the
    // expensive part; a transform is only painted. The fraction goes in as
    // `--progress` (0..1) and the stylesheet scales the bar with it.
    //
    // Whether the stylesheet has been switched over is asked once, here, and
    // not on every frame: with the new rule the computed transform is a
    // matrix, with the old one — the rule that drives the bar off its width —
    // it is `none`. Until the stylesheet is switched, the bar keeps being
    // sized the old way so it never goes blank in between.
    var scaled = window.getComputedStyle(bar).transform !== 'none';

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      // A page shorter than the viewport has no scroll range; avoid /0.
      var p = max > 0 ? doc.scrollTop / max : 0;
      bar.style.setProperty('--progress', p.toFixed(4));
      if (!scaled) bar.style.width = (p * 100).toFixed(2) + '%';
    }

    var pending = false;
    window.addEventListener(
      'scroll',
      function () {
        // Coalesce to one update per frame so a fast scroll can't queue up a
        // backlog of layout reads.
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          update();
          pending = false;
        });
      },
      { passive: true }
    );
    update();
  })();

  // ---- Headline typing ---------------------------------------------------
  // Wraps each character in a span so CSS can stagger them. Uses the original
  // text as the accessible name, so the split never reaches a screen reader.
  //
  // The characters are grouped into words first. A character span is an
  // inline-block, and an inline-block is an atomic inline box — the browser
  // is free to break the line between any two of them, so splitting a
  // heading per character lets it break mid-word once the line fills
  // ("Systems that carry real w" / "ork." on a phone). The word wrapper is
  // one inline-block with white-space: nowrap, so the only break points
  // left are the spaces between words.
  (function typewriter() {
    var nodes = document.querySelectorAll('[data-anim="type"]');
    if (!nodes.length || reduceMotion) return;

    nodes.forEach(function (node) {
      var text = node.textContent;
      node.setAttribute('aria-label', text);
      node.textContent = '';

      var step = Math.min(28, Math.max(6, 1100 / text.length));
      var index = 0;

      // Split on spaces and keep the spaces themselves, so the rendered text
      // is byte-for-byte the text that was there before.
      text.split(/(\s+)/).forEach(function (chunk) {
        if (!chunk) return;

        if (/^\s+$/.test(chunk)) {
          node.appendChild(document.createTextNode(chunk));
          return;
        }

        var word = document.createElement('span');
        word.className = 'word';

        Array.prototype.forEach.call(chunk, function (c) {
          var span = document.createElement('span');
          span.className = 'ch';
          span.textContent = c;
          // 16ms per glyph is faster than a frame budget allows at the tail of
          // a long line, so characters land in bursts. 28ms keeps the stagger
          // legible while staying inside a comfortable frame — but only while
          // the heading is short. A long one at a fixed 28ms takes seconds to
          // finish typing, so the step shrinks to hold the whole run near ~1.1s.
          span.style.animationDelay = index * step + 'ms';
          index++;
          word.appendChild(span);
        });

        node.appendChild(word);
      });
    });
  })();

  // ---- Card pointer highlight -------------------------------------------
  // Writes the pointer position into custom properties that the CSS gradient
  // reads. Passive and coalesced, so it costs nothing while idle.
  (function cardGlow() {
    if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener(
        'pointermove',
        function (e) {
          var r = card.getBoundingClientRect();
          card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
          card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
        },
        { passive: true }
      );
    });
  })();

  // ---- Card link names ---------------------------------------------------
  // A link that wraps a whole card takes the whole card as its name: the
  // title, the summary, the tags and the trailing "Open →" cue — forty words
  // for a screen reader to walk past, on every card of the list. The heading
  // stays inside the link, so the document outline is unchanged, and the name
  // is shortened to the title and what the link does.
  //
  // The pages that still need this are the ones whose markup has no name of
  // its own. Where the server already wrote one — the project panels, whose
  // verb depends on what the link *is* and not on a URL prefix — the markup
  // wins: the two must not disagree about the same sentence.
  (function cardNames() {
    function labelFor(a, title) {
      var href = a.getAttribute('href') || '';
      var what = href.indexOf('/blog/') !== -1 ? 'Read the post' : 'Open the project';
      return title + ' — ' + what;
    }

    document.querySelectorAll('a.track-panel.panel-project').forEach(function (a) {
      if (a.hasAttribute('aria-label')) return;
      var heading = a.querySelector('h2, h3');
      var title = heading ? heading.textContent.trim() : '';
      if (!title) return;
      a.setAttribute('aria-label', labelFor(a, title));
    });

    // The cards are `div.card` with the anchor inside the heading, so there
    // is no whole-card link left to name — `a.card` matches nothing in the
    // build, and the branch that used to name it was removed as dead code.
  })();

  // ---- Horizontal card rows ----------------------------------------------
  // A row of cards that scrolls sideways, with no scrollbar to invite the
  // gesture, so a sideways gesture over the row is what moves it: the reader
  // keeps scrolling down the page as usual, and only a gesture that was
  // already sideways travels the row instead. The fade at the end that still
  // has content is the standing hint that there is more, since nothing else
  // says so.
  //
  // Only a sideways gesture is claimed. A vertical wheel notch used to be
  // turned into sideways travel and the page's own scroll canceled with it,
  // so a reader had to spend eighteen notches on the first row before the
  // page moved at all — the page read as frozen. The row is still reachable
  // without a pointer: it is focusable and the arrow keys scroll it, and a
  // finger drags it natively.
  (function cardRows() {
    var rows = document.querySelectorAll('.card-row');
    if (!rows.length) return;

    function maxScroll(row) {
      return row.scrollWidth - row.clientWidth;
    }

    function update(row) {
      var max = maxScroll(row);
      row.classList.toggle('is-scrollable', max > 1);
      row.classList.toggle('at-start', row.scrollLeft <= 1);
      row.classList.toggle('at-end', max <= 1 || row.scrollLeft >= max - 1);
    }

    rows.forEach(function (row) {
      var settle = 0;
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)');

      // A wheel notch is not a card. A notch is worth about a hundred pixels,
      // a card is nearer three hundred, and the row snaps to cards -- so at one
      // to one a notch would move the strip and snap it straight back, and the
      // row would look frozen. Scaling up makes a notch land on the next card,
      // which is what the reader meant by turning the wheel. Firefox reports
      // lines and some setups report pages rather than pixels.
      var PER_PIXEL = 3;
      var PER_LINE = 120;
      var PER_PAGE = 1;

      // A sideways gesture, and only a sideways gesture, is the row's to take.
      //
      // The trackpad's own two-finger swipe arrives on deltaX. Shift+wheel is
      // the keyboard-and-mouse way of saying "sideways", and browsers split
      // over where they report it: Chromium turns it into deltaX, Firefox
      // leaves it on deltaY with shiftKey set. Both are honored; a plain
      // vertical notch is neither, so it goes to the page.
      function sideways(e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return true;
        return e.shiftKey && e.deltaY !== 0;
      }

      function toPixels(e) {
        var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!d) return 0;
        if (e.deltaMode === 1) d *= PER_LINE;              // lines
        else if (e.deltaMode === 2) d *= row.clientWidth * PER_PAGE; // pages
        else d *= PER_PIXEL;
        return d;
      }

      function release() {
        row.classList.remove('is-auto');
        // Nudge the row to where it already is so the browser evaluates snap
        // again now that it is back on, and eases onto the nearest card. This
        // is the settle at the end of a swipe; without it the row would sit
        // between two cards, which reads as a misaligned layout.
        row.scrollTo({ left: row.scrollLeft, behavior: calm.matches ? 'auto' : 'smooth' });
      }

      // Not passive: claiming the wheel is what keeps the page from scrolling
      // vertically at the same time.
      row.addEventListener('wheel', function (e) {
        var max = maxScroll(row);

        // Nothing sideways to show. Leave the event alone so the page scrolls
        // down, which is what the reader was trying to do.
        if (max <= 1) return;

        // A vertical notch belongs to the page. Claiming it here is what used
        // to make the page look frozen: the scroll was canceled and the row
        // moved instead, so the reader had to work through the row's whole
        // length before the page gave way.
        if (!sideways(e)) return;

        var d = toPixels(e);
        if (!d) return;

        var next = row.scrollLeft + d;
        // At either end there is nothing left to hand over to the row, so give
        // the wheel back to the page rather than swallowing it.
        if ((d < 0 && row.scrollLeft <= 0) || (d > 0 && row.scrollLeft >= max)) return;

        e.preventDefault();

        row.scrollLeft = Math.max(0, Math.min(max, next));

        // Snap is off while the wheel is turning the row, because proximity
        // snapping would tug each notch back toward the nearest card and the
        // strip would judder instead of traveling.
        row.classList.add('is-auto');
        clearTimeout(settle);
        settle = setTimeout(release, 140);
      }, { passive: false });

      window.addEventListener('resize', function () { update(row); }, { passive: true });

      update(row);
      row.addEventListener('scroll', function () { update(row); }, { passive: true });
    });
  })();

  // ---- Mobile nav strip ---------------------------------------------------
  // The flat fallback nav is wider than a phone, so it scrolls sideways. It
  // needs the same cues the card rows have, and the same JS-set classes to
  // put them on: the strip only overflows on the narrowest screens, so a
  // fixed fade would dim the last link on a screen where nothing is hidden.
  (function quickNav() {
    var strip = document.querySelector('.menu-quick');
    if (!strip) return;

    function update() {
      var max = strip.scrollWidth - strip.clientWidth;
      strip.classList.toggle('is-scrollable', max > 1);
      strip.classList.toggle('at-start', strip.scrollLeft <= 1);
      strip.classList.toggle('at-end', max <= 1 || strip.scrollLeft >= max - 1);
    }

    window.addEventListener('resize', function () { update(); }, { passive: true });
    strip.addEventListener('scroll', function () { update(); }, { passive: true });
    update();
  })();

  // ---- Clock --------------------------------------------------------------
  // Reads the visitor's clock, so it shows their local time rather than the
  // build machine's. Updated on the minute boundary, not on a fixed interval,
  // so it never drifts and never wakes the tab mid-minute.
  (function clock() {
    var el = document.getElementById('clock');
    if (!el) return;

    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }

    /**
     * The local time as a valid HTML date/time string: no timezone suffix,
     * because the value describes the reader's own wall clock.
     */
    function localStamp(d) {
      return (
        d.getFullYear() +
        '-' + pad(d.getMonth() + 1) +
        '-' + pad(d.getDate()) +
        'T' + pad(d.getHours()) +
        ':' + pad(d.getMinutes()) +
        ':' + pad(d.getSeconds())
      );
    }

    function tick() {
      var d = new Date();
      var h = d.getHours();
      // 24h would read as 22:47 in the morning; the site uses a 12h clock.
      var h12 = h % 12 === 0 ? 12 : h % 12;
      el.textContent =
        DAYS[d.getDay()] + ' ' + d.getDate() +
        ' · ' + h12 + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM');
      // The machine-readable value has to say what the text says. It used to
      // carry a UTC timestamp, so the reader's own clock was announced in
      // another timezone than the one they were looking at.
      el.setAttribute('datetime', localStamp(d));

      // Schedule just past the next minute so the display flips on time.
      var msToNextMinute = 60000 - (d.getSeconds() * 1000 + d.getMilliseconds());
      setTimeout(tick, msToNextMinute + 250);
    }

    tick();
  })();

  // ---- Menus --------------------------------------------------------------
  // Click to open, click outside or Escape to close. Number keys 1..9 jump to
  // the matching file, matching the shortcuts shown in the dropdown.
  (function menus() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-menu]'));

    // The theme ramp that is actually on the page, the ramps the OS resolves
    // to, and the chrome color of each one — all of it comes from
    // src/data/themes.ts. The list used to be written out here as well as in
    // the picker and in the boot script in the head: three copies of the same
    // four names, free to drift apart.

    var lightQuery = window.matchMedia('(prefers-color-scheme: light)');

    // The button whose panel is open. Escape gives the focus back to it: the
    // panel holds links, so the reader could be inside it when it closed, and
    // a hidden element cannot keep the focus — the browser dropped it on
    // <body> and the reader lost their place in the page.
    var openBtn = null;

    function resolve(id) {
      return resolveRamp(id, lightQuery.matches);
    }

    function applyThemeColor(ramp) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;
      // The token is the source of truth: it is defined per ramp in the
      // stylesheet, so it cannot drift from the page it is describing.
      var value = '';
      try {
        value = window
          .getComputedStyle(document.documentElement)
          .getPropertyValue('--theme-color')
          .trim();
      } catch (e) {
        /* computed style unavailable — the fallback below stands */
      }
      meta.setAttribute('content', value || themeColor(ramp));
    }

    /**
     * Close every panel except `except`.
     *
     * `restore` puts the focus back on the button that opened the panel. It
     * is only right when the panel is closed by the keyboard: a click outside
     * must not drag the focus away from whatever the reader just clicked.
     */
    function closeAll(except, restore) {
      buttons.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        var panel = document.querySelector('[data-panel="' + b.dataset.menu + '"]');
        if (panel) panel.hidden = true;
      });
      if (openBtn && openBtn !== except) {
        if (restore && document.contains(openBtn)) openBtn.focus();
        openBtn = null;
      }
    }

    buttons.forEach(function (btn) {
      var panel = document.querySelector('[data-panel="' + btn.dataset.menu + '"]');
      if (!panel) return;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        panel.hidden = open;
        openBtn = open ? null : btn;
      });
    });

    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('.menu')) return;
      closeAll();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      // A dialog over the page has its own Escape handling and its own idea
      // of where the focus belongs; the header dropdown must not pull it away.
      if (document.querySelector('[role="dialog"]:not([hidden])')) return;
      closeAll(null, true);
    });

    // Theme + action items live inside the System dropdown.
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.addEventListener('click', function () {
        setTheme(b.dataset.setTheme);
        // The panel closes under the button that was just pressed, so the
        // focus goes back to the trigger rather than to the top of the page.
        closeAll(null, true);
      });
    });

    document.querySelectorAll('[data-action]').forEach(function (b) {
      b.addEventListener('click', function () {
        var action = b.dataset.action;
        if (action === 'palette') {
          var open = document.getElementById('paletteOpen');
          if (open) open.click();
        } else if (action === 'crt') {
          var on = !document.body.classList.contains('crt');
          document.body.classList.toggle('crt', on);
          var label = b.querySelector('[data-crt-label]');
          if (label) label.textContent = on ? 'on' : 'off';
        }
        closeAll();
      });
    });

    /**
     * Apply a theme.
     *
     * `id` is what the reader picked: one of the three ramps, or `system`.
     * `system` is stored as itself and resolved to a ramp for the page, so
     * the choice survives a visit to another page and still follows the OS.
     */
    function setTheme(id) {
      var ramp = resolve(id);
      html.dataset.theme = ramp;
      try {
        localStorage.setItem('theme', id);
      } catch (e) {
        /* storage blocked — the theme still applies for this page view */
      }
      document.querySelectorAll('[data-set-theme]').forEach(function (b) {
        b.setAttribute('aria-checked', b.dataset.setTheme === id ? 'true' : 'false');
      });
      syncRadios();
      applyThemeColor(ramp);
    }

    // The OS changes its mind while the page is open: follow it.
    var onSystemChange = function () {
      var current = null;
      try {
        current = localStorage.getItem('theme');
      } catch (e) {
        /* storage blocked — nothing to follow */
      }
      if (current === 'system') setTheme('system');
    };
    if (lightQuery.addEventListener) {
      lightQuery.addEventListener('change', onSystemChange);
    } else if (lightQuery.addListener) {
      lightQuery.addListener(onSystemChange);
    }

    // The themes are one of several, so the group behaves like the radio
    // group its markup now says it is: the arrow keys move between the themes
    // and pick one, and only the selected one is in the tab order. Tab used to
    // walk through all three before reaching the llms.txt link under them.
    var themeRadios = Array.prototype.slice.call(
      document.querySelectorAll('[data-theme-group] [role="radio"]')
    );

    function syncRadios() {
      var checked = null;
      themeRadios.forEach(function (r) {
        var on = r.getAttribute('aria-checked') === 'true';
        r.tabIndex = on ? 0 : -1;
        if (on) checked = r;
      });
      // Nothing is selected — the first radio takes the tab stop so the group
      // is still reachable.
      if (!checked && themeRadios.length) themeRadios[0].tabIndex = 0;
    }

    syncRadios();

    // The stored choice can be `system`, which the boot script in the head
    // cannot resolve — it only knows the three ramps — so the theme is
    // applied here as well, and the radio state follows the stored choice.
    var stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch (e) {
      /* storage blocked — the default ramp stands */
    }
    if (stored && (RAMPS.indexOf(stored) !== -1 || stored === 'system')) {
      setTheme(stored);
    } else {
      // Nothing stored: the page is on the ramp it booted with, and the radio
      // group has to say which one that is. `system` is not a ramp, so if the
      // page booted on it, it is resolved here.
      var boot = html.dataset.theme;
      if (boot === 'system') boot = resolve('system');
      html.dataset.theme = boot;
      document.querySelectorAll('[data-set-theme]').forEach(function (b) {
        b.setAttribute(
          'aria-checked',
          b.dataset.setTheme === boot ? 'true' : 'false'
        );
      });
      syncRadios();
      applyThemeColor(boot);
    }

    var themeGroup = document.querySelector('[data-theme-group]');
    if (themeGroup) {
      themeGroup.addEventListener('keydown', function (e) {
        var i = themeRadios.indexOf(document.activeElement);
        if (i < 0) return;

        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          next = themeRadios[(i + 1) % themeRadios.length];
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          next = themeRadios[(i - 1 + themeRadios.length) % themeRadios.length];
        } else if (e.key === 'Home') {
          next = themeRadios[0];
        } else if (e.key === 'End') {
          next = themeRadios[themeRadios.length - 1];
        }
        if (!next) return;

        e.preventDefault();
        // Choosing with the keyboard must not close the dropdown: the visitor
        // is picking between the themes, and the menu closing after the
        // first arrow press would take the others away.
        setTheme(next.dataset.setTheme);
        next.focus();
      });
    }
  })();

  // ---- Scroll-linked effects ---------------------------------------------
  // One rAF loop writes three custom properties the CSS reads: hero drift,
  // timeline fill, and per-section progress bars. Kept to transforms and
  // opacity so scrolling never forces layout.
  (function scrollFx() {
    var hero = document.querySelector('.hero-scroll');
    var timeline = document.getElementById('timeline');
    var tlFill = document.querySelector('.timeline-fill');
    var rules = Array.prototype.slice.call(document.querySelectorAll('.rule-progress'));

    if (reduceMotion) {
      // No loop at all; every CSS rule has a sane static default.
      return;
    }

    var queued = false;

    function update() {
      var vh = window.innerHeight || 1;

      if (hero) {
        var rect = hero.getBoundingClientRect();
        // 0 when the hero top is at the viewport top, 1 when it has fully left.
        var p = Math.min(1, Math.max(0, -rect.top / vh));
        hero.style.setProperty('--scroll', p.toFixed(3));
      }

      if (timeline && tlFill) {
        var r = timeline.getBoundingClientRect();
        // How far the timeline has traveled through the viewport.
        var prog = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
        tlFill.style.setProperty('--tl-progress', prog.toFixed(3));
      }

      rules.forEach(function (rule) {
        var section = rule.closest('section');
        if (!section) return;
        var sr = section.getBoundingClientRect();
        var sp = Math.min(1, Math.max(0, (vh - sr.top) / (vh + sr.height)));
        rule.style.setProperty('--sec-progress', sp.toFixed(3));
      });

      queued = false;
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  // Mark timeline entries as they come into view, so their nodes fill in.
  (function timelineNodes() {
    var items = document.querySelectorAll('.tl-item');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach(function (el) {
        el.classList.add('is-seen');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-seen');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  })();

  // ---- Scroll-linked effects ---------------------------------------------
  // One rAF loop writes a handful of custom properties that the CSS reads:
  // hero drift, roadmap fill, structure fill. Kept to transforms and opacity
  // so scrolling never forces layout.
  (function scrollFx() {
    var hero = document.querySelector('.hero-scroll');
    var road = document.querySelector('.roadmap');
    var roadFill = document.querySelector('.roadmap-rail i');
    var asm = document.querySelector('[data-assemble]');
    var asmFill = document.querySelector('[data-rail-fill]');
    var rules = Array.prototype.slice.call(document.querySelectorAll('.rule-progress'));

    if (reduceMotion) {
      // No loop at all; every CSS rule has a sane static default.
      return;
    }

    var queued = false;

    // How far `el` has traveled through the viewport, 0..1.
    function travel(el, vh) {
      var r = el.getBoundingClientRect();
      return Math.min(1, Math.max(0, (vh * 0.75 - r.top) / r.height));
    }

    function update() {
      var vh = window.innerHeight || 1;

      if (hero) {
        var rect = hero.getBoundingClientRect();
        // 0 when the hero top is at the viewport top, 1 when it has left.
        var p = Math.min(1, Math.max(0, -rect.top / vh));
        hero.style.setProperty('--scroll', p.toFixed(3));
      }

      if (road && roadFill) {
        roadFill.style.setProperty('--road', travel(road, vh).toFixed(3));
      }

      if (asm && asmFill) {
        asmFill.style.setProperty('--asm', travel(asm, vh).toFixed(3));
      }

      rules.forEach(function (rule) {
        var section = rule.closest('section');
        if (!section) return;
        var sr = section.getBoundingClientRect();
        var sp = Math.min(1, Math.max(0, (vh - sr.top) / (vh + sr.height)));
        rule.style.setProperty('--sec-progress', sp.toFixed(3));
      });

      queued = false;
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  })();

  // Mark roadmap stops and structure panels as they come into view, so their
  // nodes fill in and the project marks light up.
  (function onEnter() {
    var watch = document.querySelectorAll('[data-stop], [data-stage]');
    if (!watch.length) return;

    if (!('IntersectionObserver' in window)) {
      watch.forEach(function (el) {
        el.classList.add('is-seen');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-seen');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.35 }
    );
    watch.forEach(function (el) {
      io.observe(el);
    });
  })();

  // Stagger index for the assemble animation, written once.
  (function assembleIndex() {
    var root = document.querySelector('[data-assemble]');
    if (!root) return;

    var stages = Array.prototype.slice.call(root.querySelectorAll('[data-stage]'));
    stages.forEach(function (el, i) {
      el.style.setProperty('--i', i);
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            root.classList.add('is-live');
            io.disconnect();
          });
        },
        { threshold: 0.12 }
      );
      io.observe(root);
    } else {
      root.classList.add('is-live');
    }
  })();

  // Opens the browser print dialog, which is how a visitor gets a PDF from a
  // page: print, then "save as PDF".
  (function printResource() {
    var el = document.querySelector('[data-print]');
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      window.print();
    });
  })();

    // ---- Section rail -----------------------------------------------------
  // Pages with the `rail` prop get a fixed track down the right edge: a fill
  // showing overall progress and one node per section, lit as that section
  // reaches the middle of the screen. The nodes are built here rather than in
  // the markup so they always match the sections that actually rendered.
  (function rail() {
    var rail = document.querySelector('.section-rail');
    var main = document.querySelector('[data-rail="on"]');
    if (!rail || !main) return;

    var fill = document.getElementById('railFill');
    var sections = Array.prototype.slice.call(
      main.querySelectorAll(':scope > .section, :scope > .hero')
    );

    if (!sections.length) return;

    var nodes = sections.map(function (section, i) {
      var b = document.createElement('b');
      // Space the nodes evenly down the track.
      b.style.top = ((i / (sections.length - 1 || 1)) * 100).toFixed(2) + '%';
      rail.appendChild(b);
      return b;
    });

    var active = -1;

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      if (fill) {
        fill.style.setProperty('--rail-progress', (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0).toFixed(4));
      }

      // Which section owns the middle of the viewport right now?
      var mid = window.innerHeight * 0.5;
      var current = 0;
      sections.forEach(function (s, i) {
        if (s.getBoundingClientRect().top <= mid) current = i;
      });

      if (current === active) return;
      active = current;
      nodes.forEach(function (n, i) {
        n.classList.toggle('is-on', i === current);
      });
    }

    var queued = false;
    window.addEventListener(
      'scroll',
      function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () {
          update();
          queued = false;
        });
      },
      { passive: true }
    );
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  // ---- Scroll reveal -----------------------------------------------------
  (function reveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) {
        el.classList.add('is-in');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
          // A reveal target can contain other reveal targets -- a horizontal
          // card row holds a card per post. The cards to the right of the row
          // are clipped by the scroller, so they never intersect on their own
          // and would sit at opacity 0 until the reader happened to scroll
          // that way. Reveal the whole row the moment the row is reached.
          entry.target.querySelectorAll('[data-reveal]').forEach(function (child) {
            child.classList.add('is-in');
            io.unobserve(child);
          });
        });
      },
      // A generous bottom margin and a low threshold: on horizontal pages the
      // last panel sits flush against the end of the scroller, and at 0.35 it
      // never counted as "visible enough" and stayed at opacity 0.
      { rootMargin: '0px 120px 0px 0px', threshold: 0.01 }
    );

    targets.forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      io.observe(el);
    });
  })();

  // ---- Page transitions ---------------------------------------------------
  // The motion itself is in animation.css; this only feeds it two things.
  //
  // Timing is the whole job here. `pagereveal` fires on the incoming document
  // immediately before the browser captures its snapshot, and at that moment
  // every entrance animation on the page is still at its starting state — the
  // headline is mid-type and the sections below the fold are transparent. A
  // snapshot taken then records a half-finished page, and the parts it missed
  // appear only once the transition is already over. Forcing the first screen
  // to its end state first makes the snapshot match what the visitor is about
  // to see. Below-the-fold targets are left alone so they still reveal on
  // scroll.
  //
  // The Home → Contact pair runs its own animation, chosen by a flag on
  // <html>. The view-transition pseudo-elements live in the *incoming*
  // document, which has no way to know where the visitor came from, so the
  // choice is made on the outgoing one and handed over in sessionStorage.
  (function transitions() {
    // Firefox ships neither the cross-document events nor the CSS, so there is
    // nothing to listen for there and the page loads as it always has.
    if (!('onpagereveal' in window) || !('onpageswap' in window)) return;

    window.addEventListener('pagereveal', function () {
      var fold = window.innerHeight + 120;
      var i;

      var revealed = document.querySelectorAll('[data-reveal]');
      for (i = 0; i < revealed.length; i++) {
        if (revealed[i].getBoundingClientRect().top > fold) continue;
        // The transition is suppressed inline rather than through a class so
        // that the class can be dropped again afterwards without these
        // snapping back to opacity 0.
        revealed[i].style.transition = 'none';
        revealed[i].classList.add('is-in');
      }

      var letters = document.querySelectorAll("[data-anim='type'] .ch");
      for (i = 0; i < letters.length; i++) {
        letters[i].style.animation = 'none';
        letters[i].style.opacity = '1';
        letters[i].style.transform = 'none';
      }
    });
  })();

  // ---- Command palette ---------------------------------------------------
  // A combobox over a listbox, in a modal dialog.
  //
  // The three things it used to get wrong are all the same mistake: the
  // markup said `aria-modal="true"` and `role="combobox"`, and the code did
  // neither. Focus walked straight out of the dialog into the page behind,
  // the background scrolled under the open palette, the active option was
  // never announced, and closing it dropped focus on the floor.
  (function palette() {
    var dialog = document.getElementById('palette');
    var input = document.getElementById('paletteInput');
    var list = document.getElementById('paletteList');
    var empty = document.getElementById('paletteEmpty');
    var opener = document.getElementById('paletteOpen');
    var triggers = Array.prototype.slice.call(
      document.querySelectorAll('[data-open-palette]')
    );
    if (!dialog || !input || !list) return;

    var items = [];
    var cursor = 0;
    var lastFocus = null;
    var indexRequest = null;
    // Whether this dialog is the one currently holding the scroll lock.
    var locked = false;
    // The state of the index: 'idle' before the first open, then 'loading',
    // 'ready' or 'failed'. The status line has to say which one it is in —
    // "Loading…" left on the screen after the index arrived told the reader
    // that a search was still running when it had already finished.
    var indexState = 'idle';

    // The index is fetched the first time the palette opens: it used to be
    // built into every page's HTML, which cost every reader the bytes of a
    // list of 84 posts whether or not they opened the palette.
    function loadIndex() {
      if (indexRequest) return indexRequest;
      indexState = 'loading';
      if (empty) {
        empty.hidden = false;
        empty.textContent = 'Loading…';
      }
      indexRequest = fetch('/palette-index.json')
        .then(function (res) {
          if (!res.ok) throw new Error('palette index ' + res.status);
          return res.json();
        })
        .then(function (data) {
          var frag = document.createDocumentFragment();
          data.forEach(function (item, i) {
            var li = document.createElement('li');
            li.className = 'palette-item';
            li.id = 'pal-' + i;
            li.setAttribute('role', 'option');
            li.setAttribute('aria-selected', 'false');
            li.tabIndex = -1;
            li.dataset.label = item.label.toLowerCase();
            li.dataset.group = item.group.toLowerCase();
            li.dataset.href = item.href;

            var group = document.createElement('span');
            group.className = 'palette-group';
            group.textContent = item.group;

            var label = document.createElement('span');
            label.className = 'palette-label';
            label.textContent = item.label;

            li.appendChild(group);
            li.appendChild(label);
            frag.appendChild(li);
          });
          list.appendChild(frag);
          items = Array.prototype.slice.call(list.querySelectorAll('.palette-item'));
          indexState = 'ready';
          if (empty) {
            empty.hidden = true;
            empty.textContent = 'No match.';
          }
        })
        .catch(function () {
          indexState = 'failed';
          if (empty) {
            empty.hidden = false;
            empty.textContent = 'The index could not be loaded.';
          }
          items = [];
        });
      return indexRequest;
    }

    function visible() {
      return items.filter(function (el) {
        return el.style.display !== 'none';
      });
    }

    function setCursor(next) {
      var shown = visible();
      if (!shown.length) {
        input.removeAttribute('aria-activedescendant');
        return;
      }
      cursor = (next + shown.length) % shown.length;
      shown.forEach(function (el, i) {
        el.setAttribute('aria-selected', i === cursor ? 'true' : 'false');
      });
      // The focus stays in the input, so the active option is announced
      // through aria-activedescendant — without it, a screen reader user
      // pressing ArrowDown heard nothing at all while the highlight moved.
      var active = shown[cursor];
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView({ block: 'nearest' });
    }

    // The page behind a modal dialog must not be reachable: not by Tab, not
    // by the scroll wheel, and not by a screen reader walking the tree.
    function setBackgroundInert(on) {
      var siblings = document.body.children;
      for (var i = 0; i < siblings.length; i++) {
        var el = siblings[i];
        if (el === dialog || el.id === 'letterModal') continue;
        if (on) {
          el.setAttribute('inert', '');
        } else {
          el.removeAttribute('inert');
        }
      }
    }

    function open(trigger) {
      lastFocus = trigger || document.activeElement;
      dialog.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (!locked) {
        locked = true;
        lockScroll();
      }
      setBackgroundInert(true);
      input.value = '';
      input.focus();
      if (!items.length) {
        loadIndex().then(function () {
          // The reader may have typed while the index was on its way. The
          // answer has to match the question they asked, so the query is
          // re-applied rather than reset to nothing.
          if (isOpen()) filter(input.value);
        });
      } else {
        filter('');
      }
    }

    function close() {
      dialog.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      if (locked) {
        locked = false;
        unlockScroll();
      }
      setBackgroundInert(false);
      // The focus goes back where it came from. Before this, it was left on
      // the input inside a dialog that had just been hidden, and the browser
      // dropped it on <body> — so the reader lost their place in the page.
      restoreFocus();
      lastFocus = null;
    }

    // A trigger inside a closed dropdown cannot take the focus back, so the
    // permanent one in the header stands in for it.
    function restoreFocus() {
      var target = lastFocus;
      if (!target || !document.contains(target) || !target.focus) target = opener;
      if (!target) return;
      if (target.offsetParent === null && opener && opener !== target) target = opener;
      target.focus();
    }

    function filter(q) {
      var needle = q.trim().toLowerCase();
      var any = false;
      items.forEach(function (el) {
        var hit =
          !needle ||
          el.dataset.label.indexOf(needle) !== -1 ||
          el.dataset.group.indexOf(needle) !== -1;
        el.style.display = hit ? '' : 'none';
        if (hit) any = true;
      });
      if (empty) {
        empty.hidden = any;
        // The line says which of the three states the reader is in: still
        // loading, nothing matched, or the index never arrived. When there is
        // something to show it is emptied rather than left saying "No
        // match." — the combobox describes itself with this line, and a
        // description that says "No match." while the list is full is a lie.
        if (!any) {
          if (indexState === 'failed') empty.textContent = 'The index could not be loaded.';
          else if (indexState === 'loading') empty.textContent = 'Loading…';
          else empty.textContent = 'No match.';
        } else {
          empty.textContent = '';
        }
      }
      // The popup is only open while it has something in it. With every
      // option filtered out, the combobox claims an expanded list of
      // nothing, and the cursor points at an option that is not there.
      input.setAttribute('aria-expanded', any ? 'true' : 'false');
      setCursor(0);
    }

    function isOpen() {
      return !dialog.hidden;
    }

    triggers.forEach(function (el) {
      el.addEventListener('click', function () { open(el); });
    });

    // Clicking the backdrop (but not the box) closes.
    dialog.addEventListener('mousedown', function (e) {
      if (e.target === dialog) close();
    });

    // Clicking an option goes there. The option is the interactive element
    // itself: it used to wrap an <a>, and `option` has presentational
    // children, so the link was stripped from the accessibility tree while
    // the anchor stayed in the tab order.
    list.addEventListener('click', function (e) {
      var option = e.target.closest ? e.target.closest('.palette-item') : null;
      if (!option || !option.dataset.href) return;
      window.location.href = option.dataset.href;
    });

    input.addEventListener('input', function () {
      filter(input.value);
    });

    document.addEventListener('keydown', function (e) {
      // Ctrl/Cmd+K toggles from anywhere, including inside a field.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen() ? close() : open(null);
        return;
      }
      if (!isOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(cursor + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(cursor - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var shown = visible();
        if (shown[cursor] && shown[cursor].dataset.href) {
          window.location.href = shown[cursor].dataset.href;
        }
      } else if (e.key === 'Tab') {
        // The only focusable thing in the dialog is the search field: the
        // options are announced through aria-activedescendant and are not
        // tab stops. Tab is held here so it cannot walk out into the page
        // behind, which `aria-modal="true"` says is unavailable.
        e.preventDefault();
        input.focus();
      }
    });
  })();

  // ---- Letter modal ------------------------------------------------------
  // Opened by anything carrying [data-open-letter]. Focus is trapped while it
  // is open and returned to the trigger on close, so a keyboard visitor is
  // never left behind on the page underneath.
  (function letterModal() {
    var modal = document.getElementById('letterModal');
    if (!modal) return;

    var openers = Array.prototype.slice.call(document.querySelectorAll('[data-open-letter]'));
    var closers = Array.prototype.slice.call(document.querySelectorAll('[data-close-letter]'));
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    var lastFocus = null;
    var locked = false;

    var FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function isOpen() {
      return !modal.hidden;
    }

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      if (!locked) {
        locked = true;
        lockScroll();
      }
      var first = modal.querySelector('input, textarea');
      if (first) first.focus();
    }

    function close() {
      modal.hidden = true;
      if (locked) {
        locked = false;
        unlockScroll();
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    openers.forEach(function (el) {
      el.addEventListener('click', open);
    });
    closers.forEach(function (el) {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key !== 'Tab') return;

      // Keep Tab inside the dialog while it is open.
      var items = Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE));
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

    if (!form) return;

    // The form carries `novalidate`, so the browser will not stop a bad submit
    // and the mailto would go out with an empty body. The same constraints are
    // therefore enforced here, before anything is handed to the mail client.
    function problemsFor(values) {
      var out = [];
      if (!values.email) {
        out.push({ field: 'l-email', text: 'Your email is required.' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        out.push({ field: 'l-email', text: 'That does not look like an email address.' });
      }
      if (!values.message) {
        out.push({ field: 'l-message', text: 'A message is required.' });
      } else if (values.message.length < 10) {
        out.push({ field: 'l-message', text: 'Please write at least 10 characters.' });
      }
      return out;
    }

    // The error text is announced by the same live region as the success text,
    // so a screen reader hears it without focus having to move.
    function setFieldError(input, text) {
      input.setAttribute('aria-invalid', 'true');
      var holder = input.closest('.field');
      if (!holder) return;
      var note = holder.querySelector('.field-error');
      if (!note) {
        note = document.createElement('p');
        note.className = 'field-error';
        holder.appendChild(note);
      }
      note.id = input.id + '-error';
      note.textContent = text;
      input.setAttribute('aria-describedby', note.id);
    }

    function clearFieldError(input) {
      input.removeAttribute('aria-invalid');
      var holder = input.closest('.field');
      var note = holder && holder.querySelector('.field-error');
      if (note) note.remove();
      input.removeAttribute('aria-describedby');
    }

    /**
     * Re-check every field and put the errors where they belong.
     *
     * The count in the live region is the real one, not a placeholder: the
     * old copy read "N fields need fixing" with a literal N.
     */
    function refreshProblems(values) {
      var problems = problemsFor(values);
      ['l-email', 'l-message'].forEach(function (id) {
        var input = document.getElementById(id);
        if (!input) return;
        var p = null;
        problems.forEach(function (x) {
          if (x.field === id) p = x;
        });
        if (p) setFieldError(input, p.text);
        else clearFieldError(input);
      });
      if (status) {
        status.textContent =
          problems.length === 0
            ? ''
            : problems.length === 1
              ? 'One field needs fixing before this can be sent.'
              : problems.length + ' fields need fixing before this can be sent.';
      }
      return problems;
    }

    function reportProblems(list) {
      list.forEach(function (p) {
        var input = document.getElementById(p.field);
        if (!input) return;
        setFieldError(input, p.text);
      });
      if (status) {
        status.textContent =
          list.length === 1
            ? 'One field needs fixing before this can be sent.'
            : list.length + ' fields need fixing before this can be sent.';
      }
      var first = document.getElementById(list[0].field);
      if (first) first.focus();
    }

    function clearProblems() {
      form.querySelectorAll('.field-error').forEach(function (n) { n.remove(); });
      form.querySelectorAll('[aria-invalid]').forEach(function (i) {
        i.removeAttribute('aria-invalid');
        i.removeAttribute('aria-describedby');
      });
      if (status) status.textContent = '';
    }

    // A field's error is cleared as soon as it is edited, and the other
    // fields are re-checked — but only the edited field's error goes away.
    // Clearing every error on every keystroke hid the problems that were
    // still there: a reader who fixed the email field lost the warning on the
    // message field and found out about it only on the next submit.
    form.addEventListener('input', function () {
      if (!form.querySelector('[aria-invalid="true"]')) return;
      var current = new FormData(form);
      refreshProblems({
        email: String(current.get('email') || '').trim(),
        message: String(current.get('message') || '').trim(),
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = new FormData(form);

      // Honeypot: a field no person can see but most bots fill in. The
      // submission is discarded, so the acknowledgement must not claim that
      // anything was delivered — it says what happened and what to do if
      // nothing did.
      var honeypot = document.querySelector('[data-honeypot]');
      if (honeypot && honeypot.value) {
        if (status) {
          status.textContent =
            'Thanks — the form was submitted. If nothing happens, use the email address in the footer.';
        }
        form.reset();
        return;
      }

      var email = String(data.get('email') || '').trim();
      var subject = String(data.get('subject') || '').trim();
      var kind = String(data.get('kind') || '').trim();
      var timeline = String(data.get('timeline') || '').trim();
      var message = String(data.get('message') || '').trim();

      clearProblems();

      var problems = problemsFor({ email: email, message: message });
      if (problems.length) {
        reportProblems(problems);
        return;
      }

      // The subject says which field it came from. The type is the select's
      // own value ("Agentic AI", "Audit", …) and the fallback names the field
      // the same way the form labels it, so the two never disagree. The
      // fallback for the line itself is "Website enquiry" rather than
      // "New enquiry": it says what the mail is, not how new it is.
      var title = '[' + (kind || 'Project type') + '] ' + (subject || 'Website enquiry');
      var body =
        'Email: ' + email + '\n' +
        'Type: ' + (kind || '—') + '\n' +
        'Timeline: ' + (timeline || '—') + '\n\n' +
        message;

      if (status) {
        // The mail client is the browser's, not the site's: it may not open at
        // all. The address is in the footer on every page, so the fallback
        // points at it instead of repeating the address here.
        status.textContent =
          'Opening your mail client — if it does not open, use the email address in the footer.';
      }

      window.location.href =
        'mailto:mr.a.maltsev@gmail.com' +
        '?subject=' + encodeURIComponent(title) +
        '&body=' + encodeURIComponent(body);
    });
  })();

  // ---- Number shortcuts --------------------------------------------------
  // 1..4 jump to the pages listed in the Sources menu. Ignored while a field has
  // focus, so typing "2024" into the message box does not navigate away.
  (function shortcuts() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('[data-goto]'));
    if (!targets.length) return;

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) {
        return;
      }
      if (t && t.isContentEditable) return;

      var hit = targets.find(function (a) {
        return a.dataset.goto === e.key;
      });
      if (!hit) return;

      e.preventDefault();
      window.location.href = hit.getAttribute('href');
    });
  })();

  // ---- Print -------------------------------------------------------------
  // Native print dialog. The print stylesheet in os.css strips the interface
  // and expands links, so the output is the résumé and not the screenshot.
  (function printCv() {
    var btn = document.querySelector('[data-action="print"]');
    if (!btn) return;

    btn.addEventListener('click', function () {
      window.print();
    });
  })();

  // ---- Stage detail dialog -------------------------------------------------
  // One dialog serves all ten stages: the panels are rendered by the component
  // and only the requested one is shown. Focus is trapped while it is open and
  // returns to the box that opened it, so a keyboard visitor is never dropped
  // back at the top of the page.
  var openStage = (function stageDialog() {
    var modal = document.getElementById('stageModal');
    if (!modal) return function () {};

    var panels = Array.prototype.slice.call(modal.querySelectorAll('[data-stage-panel]'));
    var closers = Array.prototype.slice.call(modal.querySelectorAll('[data-close-stage]'));
    var box = modal.querySelector('.stage-modal-box');
    var lastFocus = null;
    var locked = false;

    var FOCUSABLE =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // All ten panels live in the DOM at once and nine of them are hidden, so
    // the selector alone returns the close button of every stage. Trap on those
    // and first and last are buttons of panels that cannot be reached, which
    // lets Tab walk straight out of an open dialog. Keep what is on screen.
    function focusables() {
      return Array.prototype.slice.call(modal.querySelectorAll(FOCUSABLE))
        .filter(function (el) { return el.getClientRects().length > 0; });
    }

    function isOpen() {
      return !modal.hidden;
    }

    function close() {
      if (!isOpen()) return;
      panels.forEach(function (p) { p.hidden = true; });
      modal.hidden = true;
      if (locked) {
        locked = false;
        unlockScroll();
      }
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function open(id, opener) {
      var panel = modal.querySelector('[data-stage-panel="' + id + '"]');
      if (!panel) return;

      lastFocus = opener || document.activeElement;
      panels.forEach(function (p) { p.hidden = p !== panel; });
      modal.hidden = false;
      // Ten panels share this dialog; only the one on screen can name it.
      var heading = panel.querySelector('[id]');
      if (heading) {
        modal.setAttribute('aria-labelledby', heading.id);
        // The box carries the same name, so the group it holds is not left
        // announcing the first stage while a different one is on screen.
        if (box) box.setAttribute('aria-labelledby', heading.id);
      }
      if (!locked) {
        locked = true;
        lockScroll();
      }
      // The box is the scroller and it is shared by all ten panels, so without
      // this the second stage opens halfway down, where the previous one was
      // left scrolled.
      if (box) box.scrollTop = 0;

      var first = panel.querySelector(FOCUSABLE);
      if (first) first.focus();
    }

    closers.forEach(function (el) {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key !== 'Tab') return;

      var items = focusables();
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

    return open;
  })();

  // ---- ASCII architecture figure -----------------------------------------
  // Lines assemble on first view. The drawing itself is inert text; the real
  // controls are transparent buttons laid over each box. Hovering or focusing
  // one highlights that box and explains it below, clicking opens the dialog.
  (function stack() {
    var root = document.querySelector('[data-stack]');
    if (!root) return;

    var view = root.querySelector('.stack-view');
    var pre = root.querySelector('.stack-art');
    var lines = Array.prototype.slice.call(root.querySelectorAll('.stack-line, .stack-zone'));
    var spans = Array.prototype.slice.call(root.querySelectorAll('.stack-zone'));
    var boxes = Array.prototype.slice.call(root.querySelectorAll('.stack-hit-box'));
    var reads = Array.prototype.slice.call(root.querySelectorAll('[data-read]'));
    var idle = root.querySelector('.stack-read-idle');
    var meta = root.querySelector('[data-stack-meta]');

    // The hint has to name the gesture the device actually has. A phone has
    // no hover, so the read-out below the diagram never appears there and the
    // only path to a stage's description is a tap straight into the dialog.
    if (idle) {
      idle.textContent = window.matchMedia('(hover: hover)').matches
        ? 'Hover a stage, click it for detail.'
        : 'Tap a stage for detail.';
    }

    // Stagger index for the assemble animation, written once. A row can hold
    // several spans (the 06 / 07 / 08 stage sits side by side), so the delay
    // comes from the row the span belongs to, not from its position in the DOM.
    lines.forEach(function (el, i) {
      var row = el.getAttribute('data-row');
      el.style.setProperty('--i', row !== null ? row : i);
    });

    function show(id, label) {
      spans.forEach(function (s) {
        s.classList.toggle('is-hot', s.dataset.zone === id);
      });
      reads.forEach(function (r) {
        r.hidden = r.dataset.read !== id;
      });
      if (idle) idle.hidden = !!id;
      if (meta) meta.textContent = label || 'click a stage';
    }

    // --- place the buttons ---------------------------------------------------
    // Derived from the glyph rectangles rather than from line-height: the
    // inline box around the art is taller than its line-height, so a 1lh step
    // lands under the drawing by a few pixels a row and drifts. The <pre> is
    // the containing block, so scrollLeft/scrollTop convert viewport
    // coordinates into the box's own space and the buttons keep their place
    // when a narrow screen scrolls the art.
    function place() {
      if (!view || !pre) return;

      var preBox = pre.getBoundingClientRect();
      var padX = pre.clientLeft;
      var padY = pre.clientTop;
      var originX = preBox.left + padX;
      var originY = preBox.top + padY;

      boxes.forEach(function (box) {
        var glyphs = spans.filter(function (s) {
          return s.dataset.zone === box.dataset.zone;
        });
        if (!glyphs.length) return;

        var top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
        glyphs.forEach(function (s) {
          var r = s.getBoundingClientRect();
          if (r.top < top) top = r.top;
          if (r.bottom > bottom) bottom = r.bottom;
          if (r.left < left) left = r.left;
          if (r.right > right) right = r.right;
        });

        box.style.left = left - originX + pre.scrollLeft + 'px';
        box.style.top = top - originY + pre.scrollTop + 'px';
        box.style.width = right - left + 'px';
        box.style.height = bottom - top + 'px';
      });

      view.classList.add('is-hit-ready');
    }

    var pending = null;
    function remeasure() {
      if (pending) cancelAnimationFrame(pending);
      pending = requestAnimationFrame(function () {
        pending = null;
        place();
      });
    }

    if (window.ResizeObserver && pre) {
      new ResizeObserver(remeasure).observe(pre);
    }
    window.addEventListener('resize', remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    place();

    // --- interaction ---------------------------------------------------------
    boxes.forEach(function (box) {
      var id = box.dataset.zone;
      var label = id.toUpperCase();

      box.addEventListener('pointerenter', function () {
        show(id, label);
      });
      box.addEventListener('focus', function () {
        show(id, label);
      });
      box.addEventListener('click', function () {
        openStage(id, box);
      });
    });

    function clear() {
      show(null, 'click a stage');
    }

    root.addEventListener('pointerleave', clear);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) clear();
    });

    // Assemble on first view. Without JS or under reduced-motion the lines are
    // visible from the start — the CSS default opacity is 1.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (!e.isIntersecting) return;
            root.classList.add('is-live');
            io.disconnect();
          });
        },
        { threshold: 0.15 }
      );
      io.observe(root);
    } else {
      root.classList.add('is-live');
    }
  })();
})();