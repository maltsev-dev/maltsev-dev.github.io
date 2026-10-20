// Site chrome: theme switching, scroll reveal, command palette, contact form.
// No framework — everything here is a DOM effect on pre-rendered HTML.

(function () {
  'use strict';

  var html = document.documentElement;

  // ---- Reduced motion ----------------------------------------------------
  // Read once at startup. Every animated effect below checks it rather than
  // each having its own listener, and the media query in animation.css covers
  // the CSS side.
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    document.body.style.overflow = 'hidden';

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
      document.body.style.overflow = '';
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

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      // A page shorter than the viewport has no scroll range; avoid /0.
      bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
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
  (function typewriter() {
    var nodes = document.querySelectorAll('[data-anim="type"]');
    if (!nodes.length || reduceMotion) return;

    nodes.forEach(function (node) {
      var text = node.textContent;
      node.setAttribute('aria-label', text);
      node.textContent = '';

      Array.prototype.forEach.call(text, function (c, i) {
        var span = document.createElement('span');
        span.className = 'ch';
        span.textContent = c;
        // 16ms per glyph is faster than a frame budget allows at the tail of
        // a long line, so characters land in bursts. 28ms keeps the stagger
        // legible while staying inside a comfortable frame.
        span.style.animationDelay = i * 28 + 'ms';
        node.appendChild(span);
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

    function tick() {
      var d = new Date();
      var h = d.getHours();
      // 24h would read as 22:47 in the morning; the site uses a 12h clock.
      var h12 = h % 12 === 0 ? 12 : h % 12;
      el.textContent =
        DAYS[d.getDay()] + ' ' + d.getDate() +
        ' · ' + h12 + ':' + pad(d.getMinutes()) + ' ' + (h < 12 ? 'AM' : 'PM');
      el.setAttribute('datetime', d.toISOString());

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

    function closeAll(except) {
      buttons.forEach(function (b) {
        if (b === except) return;
        b.setAttribute('aria-expanded', 'false');
        var panel = document.querySelector('[data-panel="' + b.dataset.menu + '"]');
        if (panel) panel.hidden = true;
      });
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
      });
    });

    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element)) return;
      if (e.target.closest('.menu')) return;
      closeAll();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });

    // Theme + action items live inside the System dropdown.
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.addEventListener('click', function () {
        setTheme(b.dataset.setTheme);
        closeAll();
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

    function setTheme(id) {
      html.dataset.theme = id;
      try {
        localStorage.setItem('theme', id);
      } catch (e) {
        /* storage blocked — the theme still applies for this page view */
      }
      document.querySelectorAll('[data-set-theme]').forEach(function (b) {
        b.setAttribute('aria-checked', b.dataset.setTheme === id ? 'true' : 'false');
      });
    }

    // Keep the radio state honest on load.
    var current = html.dataset.theme;
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.setAttribute('aria-checked', b.dataset.setTheme === current ? 'true' : 'false');
    });
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
        // How far the timeline has travelled through the viewport.
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

    // How far `el` has travelled through the viewport, 0..1.
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

  // "Résumé" on the contact page opens the browser print dialog, which is how
  // a visitor gets a PDF: print, then "save as PDF".
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

    var FLAG = 'vt-grand';
    var PENDING = 'vt-pending';
    // A pending click older than this cannot belong to the navigation that is
    // starting right now, however it was triggered.
    var PENDING_TTL = 2000;

    var strip = function (p) {
      return p.replace(/\/+$/, '');
    };

    function readFlag() {
      try {
        return sessionStorage.getItem(FLAG) === '1';
      } catch (e) {
        return false;
      }
    }

    function clearFlag() {
      try {
        sessionStorage.removeItem(FLAG);
      } catch (e) {
        /* storage blocked — the default transition stands */
      }
    }

    // The destination is recorded from the click, not from the navigation
    // event. `pageswap` fires on the outgoing document, which by then only
    // knows where it is going, not where it came from — and Chrome's
    // NavigationActivation carries `entry`, `from` and `navigationType`, but no
    // destination URL to compare against.
    //
    // Recording it on every plain same-origin click means the value is always
    // fresh for the navigation that follows, including one started from the
    // command palette or the keyboard.
    document.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

      var path;
      try {
        var url = new URL(a.href, location.href);
        if (url.origin !== location.origin) return;
        path = url.pathname;
      } catch (err) {
        return;
      }

      var isGrand = strip(location.pathname) === '' && strip(path) === '/contact';
      try {
        if (isGrand) sessionStorage.setItem(PENDING, String(Date.now()));
        else sessionStorage.removeItem(PENDING);
      } catch (err) {
        /* storage blocked — fall back to the default transition */
      }
    }, true);

    // `pageswap` fires only when a transition is genuinely starting, which is
    // what makes the recorded click safe to promote: a click that turned out
    // not to navigate leaves nothing behind, because there is no `pageswap` to
    // promote it. A traversal — Back/Forward — is rejected on `navigationType`
    // and by the timestamp, and gets the plain transition.
    window.addEventListener('pageswap', function (e) {
      var promote = false;
      var kind = e.activation && e.activation.navigationType;
      var stamp = 0;

      try {
        stamp = Number(sessionStorage.getItem(PENDING)) || 0;
        sessionStorage.removeItem(PENDING);
      } catch (err) {
        /* storage blocked — fall back to the default transition */
      }

      // Chrome reports a plain link navigation as 'push', not 'link' — a
      // traversal (Back/Forward) is 'traverse' and a reload is 'reload', and
      // neither is the Home → Contact move.
      if ((kind === 'push' || kind === 'replace') && stamp && Date.now() - stamp < PENDING_TTL) {
        promote = true;
      }

      try {
        if (promote) sessionStorage.setItem(FLAG, '1');
        else sessionStorage.removeItem(FLAG);
      } catch (err) {
        /* storage blocked — the default transition stands */
      }
    });

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

      var grand = readFlag();
      clearFlag();
      if (grand) html.dataset.vt = 'grand';
    });
  })();

  // ---- Command palette ---------------------------------------------------
  (function palette() {
    var dialog = document.getElementById('palette');
    var input = document.getElementById('paletteInput');
    var list = document.getElementById('paletteList');
    var empty = document.getElementById('paletteEmpty');
    var opener = document.getElementById('paletteOpen');
    if (!dialog || !input || !list) return;

    var items = Array.prototype.slice.call(list.querySelectorAll('.palette-item'));
    var cursor = 0;

    function visible() {
      return items.filter(function (el) {
        return el.style.display !== 'none';
      });
    }

    function setCursor(next) {
      var shown = visible();
      if (!shown.length) return;
      cursor = (next + shown.length) % shown.length;
      shown.forEach(function (el, i) {
        el.setAttribute('aria-selected', i === cursor ? 'true' : 'false');
      });
      shown[cursor].scrollIntoView({ block: 'nearest' });
    }

    function open() {
      dialog.hidden = false;
      input.value = '';
      filter('');
      input.focus();
    }

    function close() {
      dialog.hidden = true;
      if (opener) opener.focus();
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
      if (empty) empty.hidden = any;
      setCursor(0);
    }

    function isOpen() {
      return !dialog.hidden;
    }

    if (opener) opener.addEventListener('click', open);

    // Clicking the backdrop (but not the box) closes.
    dialog.addEventListener('mousedown', function (e) {
      if (e.target === dialog) close();
    });

    input.addEventListener('input', function () {
      filter(input.value);
    });

    document.addEventListener('keydown', function (e) {
      // Ctrl/Cmd+K toggles from anywhere, including inside a field.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen() ? close() : open();
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
        if (shown[cursor]) {
          var link = shown[cursor].querySelector('a');
          if (link) link.click();
        }
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

    var FOCUSABLE =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function isOpen() {
      return !modal.hidden;
    }

    function open() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      var first = modal.querySelector('input, textarea');
      if (first) first.focus();
    }

    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
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

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var data = new FormData(form);

      // Honeypot: a field no person can see but most bots fill in. Acknowledge
      // without sending anything.
      if (data.get('challenge')) {
        if (status) status.textContent = 'Thanks — message received.';
        form.reset();
        return;
      }

      var email = String(data.get('email') || '').trim();
      var subject = String(data.get('subject') || '').trim();
      var kind = String(data.get('kind') || '').trim();
      var timeline = String(data.get('timeline') || '').trim();
      var message = String(data.get('message') || '').trim();

      var title = '[' + (kind || 'Project') + '] ' + (subject || 'New enquiry');
      var body =
        'Email: ' + email + '\n' +
        'Type: ' + (kind || '—') + '\n' +
        'Timeline: ' + (timeline || '—') + '\n\n' +
        message;

      if (status) {
        status.textContent = 'Opening your mail client — if nothing happens, write to mr.a.maltsev@gmail.com.';
      }

      window.location.href =
        'mailto:mr.a.maltsev@gmail.com' +
        '?subject=' + encodeURIComponent(title) +
        '&body=' + encodeURIComponent(body);
    });
  })();

  // ---- Number shortcuts --------------------------------------------------
  // 1..4 jump to the files listed in the File menu. Ignored while a field has
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
    var lastFocus = null;

    var FOCUSABLE =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function isOpen() {
      return !modal.hidden;
    }

    function close() {
      if (!isOpen()) return;
      panels.forEach(function (p) { p.hidden = true; });
      modal.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function open(id, opener) {
      var panel = modal.querySelector('[data-stage-panel="' + id + '"]');
      if (!panel) return;

      lastFocus = opener || document.activeElement;
      panels.forEach(function (p) { p.hidden = p !== panel; });
      modal.hidden = false;
      document.body.style.overflow = 'hidden';

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