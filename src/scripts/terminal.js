/**
 * The shell on the front page.
 *
 * It is a real shell over the site's own data: `skills` reads the skill
 * tiers, `projects` reads the case studies and the milestones, `writing`
 * reads the posts. Nothing is mocked and nothing is fetched — the payload
 * is rendered into the page at build time, from the same files the rest of
 * the site reads.
 *
 * The prompt, the scrollback and the block cursor are the whole interface.
 * The input is a real <input> with its text transparent and a mirror
 * element drawing what was typed, so the cursor is the block from the
 * drawing and not the browser's hairline.
 */

/* The payload the page rendered. */
var dataEl = document.getElementById('term-data');
var DATA = dataEl ? JSON.parse(dataEl.textContent || '{}') : { dirs: {}, files: {} };

var term = document.querySelector('[data-term]');
if (term) {
  var out = term.querySelector('[data-term-out]');
  var input = term.querySelector('[data-term-input]');
  var textEl = term.querySelector('[data-term-text]');
  var pathEl = term.querySelector('[data-term-path]');
  var form = term.querySelector('[data-term-form]');

  /* ----- State ---------------------------------------------------------- */
  var cwd = '~';
  var history = [];
  var historyAt = -1;

  /* ----- Output --------------------------------------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Print a line into the scrollback.
   *
   * `html` is trusted — everything printed here is built by this file from
   * the site's own data. `esc()` is applied to the data before it gets
   * here, never to the markup.
   */
  function print(html, cls) {
    var p = document.createElement('p');
    p.className = cls ? 'tty-out ' + cls : 'tty-out';
    p.innerHTML = html;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
    return p;
  }

  /** Print a block of lines, one paragraph, so it wraps as one block. */
  function block(lines) {
    print(lines.join('<br />'));
  }

  /**
   * Print a listing: one row per line, each row a grid of columns.
   *
   * The rows are grids rather than runs of text because the columns of a
   * listing have to line up: a mode, then a date, then a name — and the name
   * is a different length every time. Printed as one string, the columns of
   * the shell ran into each other and the output read as a single word.
   */
  function listing(rows, variant) {
    rows.forEach(function (cells) {
      var p = document.createElement('p');
      p.className = 'tty-out tl-row tl-row--' + variant;
      p.innerHTML = cells.join('');
      out.appendChild(p);
    });
  }

  /** The error line. */
  function fail(message) {
    print('<span class="err">' + esc(message) + '</span>');
  }

  /* ----- The prompt ----------------------------------------------------- */
  function setPath(p) {
    cwd = p;
    if (pathEl) pathEl.textContent = p === '~' ? '~' : p.replace(/^~/, '~');
  }

  /* ----- Commands ------------------------------------------------------- */

  var COMMANDS = {
    help: function () {
      var rows = DATA.commands.map(function (c) {
        return (
          '<span class="key">' + esc(c[0]) + '</span>' +
          '<span style="padding-left:2ch">' + esc(c[1]) + '</span>'
        );
      });
      block(rows);
    },

    whoami: function () {
      block([
        'Anatolii Maltsev',
        '<span class="dim">Forward Deployed Engineer, agent runtime security,</span>',
        '<span class="dim">retrieval quality, and the reliability layer underneath both.</span>',
        '',
        'email    <span class="key">mr.a.maltsev@gmail.com</span>',
        'github   <span class="key">github.com/maltsev-dev</span>',
        'linkedin <span class="key">linkedin.com/in/a-maltsev</span>',
        'telegram <span class="key">@a_maltsev_dev</span>',
      ]);
    },

    neofetch: function () {
      var stats = DATA.stats || [];
      var ramp = document.documentElement.dataset.theme || 'phosphore';
      var phosphor = DATA.phosphors && DATA.phosphors[ramp] ? DATA.phosphors[ramp] : ramp;
      var info = [
        '<span class="key">OS</span>        MaltsevOS 4.2 (tty1)',
        '<span class="key">Host</span>      MALTSEV-01',
        '<span class="key">Shell</span>     ash 0.1',
        '<span class="key">Terminal</span>  vt220 — 80x24',
        '<span class="key">Phosphor</span>  ' + esc(phosphor),
        '<span class="key">Uptime</span>    ' + esc(stats[0] ? stats[0].v + ' years' : '—'),
        '<span class="key">Packages</span>  ' +
          esc(stats.map(function (s) { return s.v + ' ' + s.k; }).join(', ')),
      ];
      var logo = DATA.logo || [];
      var rows = [];
      for (var i = 0; i < Math.max(logo.length, info.length); i++) {
        rows.push(
          '<span class="dim">' + esc(logo[i] || '') + '</span>' +
          (info[i] ? '  ' + info[i] : '')
        );
      }
      block(rows);
    },

    ls: function (args) {
      var target = args[0] || cwd;
      if (target === '~' || target === '') {
        var rows = Object.keys(DATA.dirs)
          .filter(function (d) { return d !== '~'; })
          .map(function (d) {
            return [
              '<span class="tl-mode">drwxr-xr-x</span>',
              '<span class="tl-name">' + esc(d) + '/</span>',
              '<span class="tl-desc">' + esc(DATA.dirs[d].desc) + '</span>',
            ];
          });
        listing(rows, 'dir');
        return;
      }

      if (target === '~/writing') {
        var posts = DATA.posts || [];
        listing(
          posts.map(function (p) {
            return [
              '<span class="tl-mode">-rw-r--r--</span>',
              '<span class="tl-date">' + esc(p.dateShort || p.date) + '</span>',
              '<span class="tl-name">' + esc(p.title) + '</span>',
            ];
          }),
          'write'
        );
        return;
      }

      var dir = DATA.dirs[target];
      if (!dir) {
        fail("ls: " + target + ": no such directory");
        return;
      }
      print(esc(dir.desc));
    },

    cd: function (args) {
      var target = args[0];
      if (!target) {
        fail('cd: missing directory');
        return;
      }
      if (target === '~' || target === '/') {
        setPath('~');
        return;
      }
      if (target === '..') {
        setPath(cwd === '~' ? '~' : cwd.replace(/\/[^/]+$/, '') || '~');
        return;
      }
      var resolved = target.charAt(0) === '/' ? '~' + target : cwd + '/' + target;
      resolved = resolved.replace(/\/+$/, '');
      if (!DATA.dirs[resolved] && resolved !== '~/writing') {
        fail('cd: ' + target + ': no such directory');
        return;
      }
      setPath(resolved);
    },

    pwd: function () {
      print(esc(cwd === '~' ? '/home/maltsev' : '/home/maltsev' + cwd.slice(1)));
    },

    cat: function (args) {
      var name = args[0];
      if (!name) {
        fail('cat: missing file');
        return;
      }
      if (name === '~/writing') {
        COMMANDS.ls(['~/writing']);
        return;
      }
      var file = DATA.files[name];
      if (!file) {
        fail('cat: ' + name + ': no such file');
        return;
      }
      block(file.body.map(esc));
    },

    skills: function () {
      var rows = [];
      (DATA.skills || []).forEach(function (tier) {
        rows.push('<span class="key">' + esc(tier.label) + '</span>');
        tier.skills.forEach(function (s) {
          rows.push('  <span class="dim">├─</span> ' + esc(s));
        });
      });
      block(rows);
    },

    projects: function () {
      listing(
        (DATA.projects || []).map(function (p) {
          return [
            '<span class="tl-mode">-rw-r--r--</span>',
            '<span class="tl-tags">' + (p.tags.length ? p.tags.length + ' tag' : '—') + '</span>',
            '<span class="tl-desc">' + esc(p.tags.slice(0, 2).join(', ')) + '</span>',
            '<span class="tl-name">' + esc(p.title) + '</span>',
          ];
        }),
        'proj'
      );
      print(
        '<span class="dim">Read the case studies at </span>' +
          '<span class="key">/projects/</span>'
      );
    },

    writing: function () {
      COMMANDS.ls(['~/writing']);
    },

    topics: function () {
      block(
        (DATA.topics || []).map(function (t) {
          return (
            '<span class="key">' + esc(t.label) + '</span>' +
            ' <span class="dim">(' + esc(t.count) + ')</span> — ' + esc(t.desc)
          );
        })
      );
    },

    stats: function () {
      block(
        (DATA.stats || []).map(function (s) {
          return (
            '<span class="ok">' + esc(String(s.v).padStart(3, ' ')) + '</span>  ' + esc(s.k)
          );
        })
      );
    },

    contact: function () {
      block([
        'email    <span class="key">mr.a.maltsev@gmail.com</span>',
        'github   <span class="key">github.com/maltsev-dev</span>',
        'linkedin <span class="key">linkedin.com/in/a-maltsev</span>',
        'telegram <span class="key">@a_maltsev_dev</span>',
        '',
        '<span class="dim">Or open the contact options in the status bar at the top of the page.</span>',
      ]);
    },

    theme: function (args) {
      var name = args[0];
      var names = ['phosphore', 'acidule', 'pierre'];
      if (!name) {
        block(
          names.map(function (n) {
            var cur = document.documentElement.dataset.theme === n;
            var label = DATA.phosphors && DATA.phosphors[n] ? DATA.phosphors[n] : n;
            return (cur ? '<span class="ok">*</span> ' : '  ') + esc(label);
          })
        );
        return;
      }
      if (names.indexOf(name) === -1) {
        fail('theme: unknown phosphor: ' + name);
        print('<span class="dim">known: ' + names.join(', ') + '</span>');
        return;
      }
      document.dispatchEvent(
        new CustomEvent('tty:theme', { detail: { id: name } })
      );
      var set = DATA.phosphors && DATA.phosphors[name] ? DATA.phosphors[name] : name;
      print('<span class="ok">phosphor set to ' + esc(set) + '</span>');
    },

    history: function () {
      if (!history.length) {
        print('<span class="dim">no history yet</span>');
        return;
      }
      block(
        history.map(function (h, i) {
          return (
            '<span class="dim">' + String(i + 1).padStart(3, ' ') + '</span>  ' + esc(h)
          );
        })
      );
    },

    date: function () {
      print(esc(new Date().toString()));
    },

    echo: function (args) {
      print(esc(args.join(' ')));
    },

    man: function (args) {
      var name = args[0];
      var found = (DATA.commands || []).filter(function (c) {
        return c[0].split(' ')[0] === name;
      });
      if (!found.length) {
        fail('man: no entry for ' + name);
        return;
      }
      block(
        found.map(function (c) {
          return '<span class="key">' + esc(c[0]) + '</span> — ' + esc(c[1]);
        })
      );
    },

    clear: function () {
      out.innerHTML = '';
    },
  };

  /* The names a Tab key completes. */
  var NAMES = Object.keys(COMMANDS);

  /* ----- Running -------------------------------------------------------- */

  /**
   * Run one line.
   *
   * The command is split on whitespace, the first word is the command and
   * the rest are its arguments. A command that does not exist says so and
   * suggests the closest thing, because a mistyped command on a terminal is
   * a normal event and not an error to be shouted about.
   */
  function run(line) {
    var trimmed = line.trim();
    if (!trimmed) return;

    var parts = trimmed.split(/\s+/);
    var name = parts[0];
    var args = parts.slice(1);

    print(
      '<span class="tty-prompt"><span class="who">root</span>' +
        '<span class="sep">@</span><span>amaltsev</span>>' +
        '<span class="sep">:</span><span>' + esc(cwd) + '</span>' +
        '<span class="sep">$</span></span> ' +
        '<span class="tty-cmd">' + esc(trimmed) + '</span>'
    );

    if (COMMANDS[name]) {
      COMMANDS[name](args);
      return;
    }

    /* A near miss: one edit away from a command that exists. */
    var near = NAMES.filter(function (n) {
      return n.indexOf(name) === 0 || name.indexOf(n) === 0;
    });
    if (near.length) {
      fail(name + ': command not found — did you mean ' + near.join(', ') + '?');
    } else {
      fail(name + ': command not found');
    }
  }

  /* ----- The input ------------------------------------------------------ */

  function paint() {
    if (textEl) textEl.textContent = input.value;
  }

  input.addEventListener('input', paint);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var line = input.value;
    if (line.trim()) {
      history.push(line);
      historyAt = history.length;
      run(line);
    }
    input.value = '';
    paint();
    out.scrollTop = out.scrollHeight;
  });

  input.addEventListener('keydown', function (e) {
    /* The history. Up goes back, down goes forward, and going forward past
       the end returns to the empty line the reader was on.

       The keys are taken whether or not there is anything to recall: with an
       empty history the page used to scroll up instead, and a reader who
       pressed Up to look at what they had typed was sent to the top of the
       page instead. In a shell the arrow belongs to the shell. */
    if (e.key === 'ArrowUp' || e.key === 'Control+p') {
      e.preventDefault();
      if (!history.length) return;
      if (historyAt === history.length) historyAt = history.length - 1;
      else if (historyAt > 0) historyAt--;
      input.value = history[historyAt];
      paint();
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'Control+n') {
      e.preventDefault();
      if (!history.length) return;
      if (historyAt < history.length - 1) {
        historyAt++;
        input.value = history[historyAt];
      } else {
        historyAt = history.length;
        input.value = '';
      }
      paint();
      return;
    }

    /* Escape empties the line, the way a terminal's interrupt does. */
    if (e.key === 'Escape') {
      input.value = '';
      paint();
      return;
    }

    /* Tab completes. A command name, a directory or a file, depending on
       what has been typed so far. */
    if (e.key === 'Tab') {
      e.preventDefault();
      var value = input.value;
      var parts = value.split(/\s+/);
      var pool;
      var stem;

      if (parts.length <= 1) {
        pool = NAMES;
        stem = parts[0] || '';
      } else {
        var verb = parts[0];
        var last = parts[parts.length - 1] || '';
        if (verb === 'ls' || verb === 'cd') {
          pool = Object.keys(DATA.dirs);
        } else if (verb === 'cat') {
          pool = Object.keys(DATA.files).concat(['~/writing']);
        } else {
          pool = NAMES;
        }
        stem = last;
      }

      var hits = pool.filter(function (p) {
        return p.indexOf(stem) === 0;
      });
      if (hits.length === 1) {
        if (parts.length <= 1) {
          input.value = hits[0] + ' ';
        } else {
          parts[parts.length - 1] = hits[0];
          input.value = parts.join(' ');
        }
        paint();
      } else if (hits.length > 1) {
        print(
          '<span class="dim">' +
            esc(hits.join('   ')) +
            '</span>'
        );
      }
    }
  });

  /* Clicking anywhere in the window puts the caret in the prompt. */
  term.addEventListener('mousedown', function (e) {
    if (e.target === input) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    e.preventDefault();
    input.focus();
  });

  /* The prompt is the first thing on the page that takes the keyboard.
     The focus is taken without scrolling: on a phone the terminal is below
     the fold, and a plain `focus()` dragged the page down to it, so the
     reader landed on the prompt with the banner already scrolled off the
     top. */
  try {
    input.focus({ preventScroll: true });
  } catch (e) {
    input.focus();
  }
}
