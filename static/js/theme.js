// Theme toggle + mobile navigation.
// The initial theme is resolved by a render-blocking inline script in <head>
// (see templates_custom/base.html). This file only wires the controls, so it
// is safe to load at the end of <body> without reintroducing a theme flash.
(function () {
    'use strict';

    var html = document.documentElement;
    var DARK_QUERY = '(prefers-color-scheme: dark)';

    function storage() {
        return {
            get: function (key) {
                try { return window.localStorage.getItem(key); } catch (e) { return null; }
            },
            set: function (key, value) {
                try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
            }
        };
    }

    // ---- Theme toggle -----------------------------------------------------
    (function themeToggle() {
        var toggle = document.getElementById('themeToggle');
        if (!toggle) return;

        var store = storage();

        function current() {
            return html.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        }

        function sync() {
            var dark = current() === 'dark';
            toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
            toggle.setAttribute('aria-label',
                dark ? 'Switch to light theme' : 'Switch to dark theme');
        }

        function apply(theme) {
            html.setAttribute('data-theme', theme);
            store.set('theme', theme);
            sync();
        }

        sync();

        toggle.addEventListener('click', function () {
            apply(current() === 'dark' ? 'light' : 'dark');
        });

        // Follow the OS only while the visitor has not made an explicit choice.
        if (window.matchMedia) {
            var mq = window.matchMedia(DARK_QUERY);
            var onSystemChange = function (event) {
                if (store.get('theme')) return;
                html.setAttribute('data-theme', event.matches ? 'dark' : 'light');
                sync();
            };
            if (mq.addEventListener) {
                mq.addEventListener('change', onSystemChange);
            } else if (mq.addListener) {
                mq.addListener(onSystemChange); // Safari < 14
            }
        }
    })();

    // ---- Mobile navigation ------------------------------------------------
    (function mobileNav() {
        var toggle = document.getElementById('mobileMenuToggle');
        var nav = document.getElementById('mainNav')
            || document.querySelector('.main-nav');
        if (!toggle || !nav) return;

        function isOpen() {
            return nav.classList.contains('mobile-open');
        }

        function setOpen(open) {
            nav.classList.toggle('mobile-open', open);
            toggle.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        }

        function close() { if (isOpen()) setOpen(false); }

        toggle.addEventListener('click', function (event) {
            event.stopPropagation();
            setOpen(!isOpen());
        });

        // Any navigation closes the menu.
        nav.addEventListener('click', function (event) {
            if (event.target.closest('a')) close();
        });

        // Clicking outside dismisses it.
        document.addEventListener('click', function (event) {
            if (!isOpen()) return;
            if (nav.contains(event.target) || toggle.contains(event.target)) return;
            close();
        });

        // Escape closes it and returns focus to the trigger.
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' || event.key === 'Esc') {
                if (!isOpen()) return;
                close();
                toggle.focus();
            }
        });

        // A resize past the breakpoint must not leave a stale open state.
        if (window.matchMedia) {
            var wide = window.matchMedia('(min-width: 769px)');
            var onWide = function (event) { if (event.matches) close(); };
            if (wide.addEventListener) wide.addEventListener('change', onWide);
            else if (wide.addListener) wide.addListener(onWide);
        }

        toggle.setAttribute('aria-expanded', isOpen() ? 'true' : 'false');
    })();

    document.addEventListener('DOMContentLoaded', function () {
        document.body.classList.add('loaded');
    });
})();
