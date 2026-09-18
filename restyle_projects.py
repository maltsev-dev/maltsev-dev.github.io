#!/usr/bin/env python3
"""Restyle standalone project landing HTML files to use the global ShiUI design.

Replaces embedded <style>, fonts, header nav, footer, theme toggle, and scripts
in each content/projects/<slug>.html so it inherits style.css and the new shell.
"""

from pathlib import Path
import re

PROJECTS_DIR = Path(__file__).parent / "content" / "projects"

# --- New shared shell pieces ----------------------------------------------

NEW_FONTS = (
    '<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:'
    'wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&family='
    'IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">'
)

NEW_STYLESHEET = '<link rel="stylesheet" href="/static/css/style.css?v=20260918g">'

NEW_HEADER = '''<header class="header">
    <div class="container header-inner">
        <a href="/" class="logo-link">
            <span class="logo">
                <span class="logo-mark" aria-hidden="true"></span>
                <span class="logo-text">maltsev &middot; dev</span>
            </span>
        </a>

        <nav class="main-nav">
            <ul class="nav-list">
                <li class="nav-item"><a href="/" class="nav-link">Index</a></li>
                <li class="nav-item"><a href="/projects/" class="nav-link active">Catalogue</a></li>
                <li class="nav-item"><a href="/archive/" class="nav-link">Archive</a></li>
                <li class="nav-item"><a href="/about/" class="nav-link">About</a></li>
            </ul>
        </nav>

        <button class="mobile-menu-toggle" aria-label="Toggle menu" id="mobileMenuToggle">
            <span></span><span></span><span></span>
        </button>
    </div>
</header>'''

NEW_FOOTER = '''<footer class="footer">
    <div class="container footer-inner">
        <div class="copyright">
            <span class="hanko hanko-sm hanko-square" aria-hidden="true">■</span>
            <span>© A.Maltsev 2026</span>
            <span class="copyright-sep">·</span>
            <span><img src="https://visitor-badge.laobi.icu/badge?page_id=maltsev-dev.github.io&right_color=e14d2a" alt="Visitors"></span>
        </div>
        <div class="social-links">
            <a href="https://github.com/maltsev-dev" class="social-link" target="_blank" rel="noopener" aria-label="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/a-maltsev" class="social-link" target="_blank" rel="noopener" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="mailto:mr.a.maltsev@gmail.com" class="social-link" aria-label="Email">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
        </div>
    </div>
</footer>'''

NEW_THEME_TOGGLE = '''<button class="theme-toggle" aria-label="Toggle theme" id="themeToggle">
        <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="5"/>
            <g stroke-linecap="round">
                <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </g>
        </svg>
        <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
    </button>'''

NEW_SCRIPTS = (
    '<script src="/static/js/theme.js"></script>\n'
    '    <script src="/static/js/fade-in.js"></script>'
)

CORNER_MARKS = (
    '<span class="corner-mark left">■ · ● · ◆</span>\n'
    '    <span class="corner-mark right">maltsev · dev</span>'
)


def replace_one(html: str) -> str:
    # 1. Drop embedded <style>...</style> blocks
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)

    # 2. Replace font links (Inter / JetBrains Mono) with the new font bundle
    html = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">',
        NEW_FONTS,
        html,
    )

    # 3. Insert the global stylesheet link if missing
    if '/static/css/style.css' not in html:
        html = html.replace('</head>', f'    {NEW_STYLESHEET}\n</head>', 1)
    else:
        # bump cache version on existing reference
        html = re.sub(
            r'/static/css/style\.css\?v=[^"]*"',
            '/static/css/style.css?v=20260918g"',
            html,
        )

    # 4. Update page <title> to use the new site title
    html = re.sub(
        r'<title>[^<]*</title>',
        lambda m: re.sub(r' - dev_stories', ' — Maltsev · Agentic Engineering', m.group(0)),
        html,
    )
    html = re.sub(r'dev_stories', 'Maltsev · Agentic Engineering', html)

    # 5. Strip the existing in-document stylesheet link that targeted dev_stories, if any
    # (already covered by the regex above)

    # 6. Replace the entire <header ...> ... </header> block
    html = re.sub(
        r'<header[^>]*>.*?</header>',
        NEW_HEADER,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 7. Replace <footer ...> ... </footer>
    html = re.sub(
        r'<footer[^>]*>.*?</footer>',
        NEW_FOOTER,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 8. Replace the theme toggle button (matches the original markup we know)
    html = re.sub(
        r'<button class="theme-toggle"[^>]*>.*?</button>',
        NEW_THEME_TOGGLE,
        html,
        count=1,
        flags=re.DOTALL,
    )

    # 9. Replace the script imports (theme + constellation + fade-in) with the new pair
    html = re.sub(
        r'<script src="/static/js/theme\.js"[^>]*></script>\s*'
        r'<script src="/static/js/constellation\.js"[^>]*></script>\s*'
        r'<script src="/static/js/fade-in\.js"[^>]*></script>',
        NEW_SCRIPTS,
        html,
    )
    # Also handle if only theme + constellation was loaded (some pages skip fade-in)
    html = re.sub(
        r'<script src="/static/js/theme\.js"[^>]*></script>\s*'
        r'<script src="/static/js/constellation\.js"[^>]*></script>(?!\s*<script src="/static/js/fade-in)',
        NEW_SCRIPTS,
        html,
    )

    # 10. Insert corner marks right after <body ...>
    if 'corner-mark' not in html:
        html = re.sub(
            r'(<body[^>]*>)',
            r'\1\n    ' + CORNER_MARKS,
            html,
            count=1,
        )

    # 11. Body background is overridden by global CSS; remove inline body styles if any
    html = re.sub(
        r'<body([^>]*)style="[^"]*"',
        r'<body\1',
        html,
    )

    return html


def main():
    if not PROJECTS_DIR.exists():
        print(f"[ERROR] Projects directory not found: {PROJECTS_DIR}")
        return

    files = sorted(PROJECTS_DIR.glob("*.html"))
    if not files:
        print("[INFO] No project HTML files to process.")
        return

    for path in files:
        raw = path.read_bytes()
        if raw.startswith(b'\xef\xbb\xbf'):
            original = raw[3:].decode('utf-8')
        else:
            try:
                original = raw.decode('utf-8')
            except UnicodeDecodeError:
                original = raw.decode('cp1252')
        updated = replace_one(original)

        if updated == original:
            print(f"[SKIP] {path.name} (no changes)")
            continue

        path.write_text(updated, encoding='utf-8')
        print(f"[OK]   {path.name}")


if __name__ == "__main__":
    main()