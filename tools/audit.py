#!/usr/bin/env python3
"""Post-build QA gate for maltsev-dev.github.io.

Run after `npm run build`. Exits non-zero on any error-level finding, so it can
gate a deploy:

    npm run build && python tools/audit.py

The build output is `dist/`. A first argument points the gate at another build
directory, which is what an isolated verification build uses:

    python tools/audit.py dist-lead

Checks
  1. every internal href/src resolves to a real file in the build output
  2. in-page #anchors exist on the target page
  3. one and only one <h1> per page
  4. required <head> meta is present (description, og:title/description/url/image)
  5. og:image points at a real local file
  6. embedded media is width-constrained so it cannot overflow a phone
  7. the theme is resolved before first paint (no render-blocking theme flash)
  8. colour tokens referenced by the stylesheets are all defined
  9. every page carries a <title>, a canonical and a JSON-LD graph
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
DIST = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "dist"

# The stylesheets the build actually ships are the ones in src/styles/. The
# old gate pointed at static/css/style.css — the file the previous generator
# wrote — and that file moved to legacy/static-legacy/ when the site moved to
# Astro. A gate that reads a file nothing ships checks nothing.
STYLE_DIR = ROOT / "src" / "styles"

SKIP_PREFIX = ("http://", "https://", "//", "mailto:", "tel:", "data:", "javascript:")
EXTERNAL = 0

tag_re = re.compile(r"<\s*(img|script|link|a|video|iframe|source)\b[^>]*>", re.I)
attr_re = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
id_re = re.compile(r'\sid\s*=\s*["\']([^"\']+)["\']', re.I)
h1_re = re.compile(r"<h1\b", re.I)
title_re = re.compile(r"<title\b[^>]*>(.+?)</title>", re.I | re.S)
canonical_re = re.compile(r'<link\s+rel="canonical"\s+href="([^"]+)"', re.I)
jsonld_re = re.compile(r'<script\s+type="application/ld\+json"', re.I)
# The legacy URLs are served by meta-refresh stubs: a redirect page, not a
# page. It carries a title and a canonical and nothing else — no description,
# no social card, no JSON-LD, no <h1>. Holding it to the content checks would
# report 133 defects that are the stubs working as intended.
stub_re = re.compile(r'<meta\s+http-equiv="refresh"', re.I)


def url_to_path(url: str) -> Path | None:
    """Map a site-absolute URL onto a file inside the build output."""
    if url.startswith(SKIP_PREFIX):
        return None
    p = url.split("#", 1)[0].split("?", 1)[0]
    if not p:
        return None
    p = p.lstrip("/")
    if p.startswith("https://maltsev-dev.github.io/") or p.startswith("http://maltsev-dev.github.io/"):
        p = p.split("maltsev-dev.github.io/", 1)[1]
    # A URL may carry percent-encoding — "/images/basic%20electronics/…" is a
    # real directory on disk called "basic electronics". Without decoding, the
    # gate reports every such reference as broken.
    p = unquote(p)
    target = DIST / p
    if p.endswith("/"):
        target = target / "index.html"
    elif target.is_dir():
        target = target / "index.html"
    return target


def main() -> int:
    if not DIST.exists():
        print(f"[FAIL] {DIST} does not exist — run `npm run build` first")
        return 1

    files = sorted(DIST.rglob("*.html"))
    if not files:
        print(f"[FAIL] {DIST} contains no HTML")
        return 1

    ids = {f: set(id_re.findall(f.read_text(encoding="utf-8", errors="replace")))
           for f in files}

    stylesheets = sorted(STYLE_DIR.glob("*.css")) if STYLE_DIR.exists() else []

    # Whether a fixed media width can actually overflow.
    #
    # A <video width="720"> is only a defect when nothing constrains it. The
    # stylesheets set `max-width: 100%` on media, so the attribute is a hint
    # the browser overrides, not a layout that breaks on a phone. The warning
    # is kept for the case where that constraint is ever removed.
    media_constrained = any(
        re.search(r"(video|iframe)[^{}]*\{[^}]*max-width\s*:\s*100%",
                  sheet.read_text(encoding="utf-8"), re.I)
        for sheet in stylesheets
    )

    errors: dict[str, list[str]] = defaultdict(list)
    warnings: dict[str, list[str]] = defaultdict(list)

    for f in files:
        rel = f.relative_to(DIST).as_posix()
        html = f.read_text(encoding="utf-8", errors="replace")

        # 1 + 2: internal links and assets
        for m in tag_re.finditer(html):
            tag = m.group(1).lower()
            am = attr_re.search(m.group(0))
            if not am:
                continue
            url = am.group(1).strip()
            if not url:
                warnings["empty reference"].append(f"{rel} <{tag}>")
                continue
            if url.startswith(SKIP_PREFIX):
                global EXTERNAL
                EXTERNAL += 1
                continue
            target = url_to_path(url)
            if target is None:
                continue
            if not target.exists():
                errors["broken internal reference"].append(f"{rel} -> {url}")
                continue
            if "#" in url and target.suffix == ".html":
                frag = url.split("#", 1)[1]
                if frag and frag not in ids.get(target, set()):
                    errors["broken anchor"].append(f"{rel} -> {url}")

        # A stub is a redirect, not a page: it is never the destination of a
        # search and never rendered for longer than the refresh takes. It
        # carries no description, no social card and no structured data, and
        # holding it to those checks would report the stubs as defects.
        is_stub = bool(stub_re.search(html))

        # 3: exactly one h1
        n = len(h1_re.findall(html))
        if n == 0:
            if not is_stub:
                warnings["no <h1>"].append(rel)
        elif n > 1:
            errors[f"{n}x <h1> (must be 1)"].append(rel)

        # 4: required meta
        if not is_stub:
            if not re.search(r'<meta\s+name="description"\s+content="[^"]+', html, re.I):
                errors["missing meta description"].append(rel)
            for prop in ("og:title", "og:description", "og:url", "og:image"):
                if not re.search(r'<meta\s+property="' + prop + r'"\s+content="[^"]+', html, re.I):
                    errors[f"missing {prop}"].append(rel)

            # 5: og:image must resolve
            img = re.search(r'<meta\s+property="og:image"\s+content="([^"]+)"', html, re.I)
            if img:
                url = img.group(1)
                if not url.startswith(SKIP_PREFIX):
                    target = url_to_path(url)
                    if target is None or not target.exists():
                        errors["og:image target missing"].append(f"{rel} -> {url}")

        # 6: media must not carry a fixed pixel width
        for m in re.finditer(r"<(?:video|iframe)\b[^>]*>", html, re.I):
            wm = re.search(r'\swidth\s*=\s*["\']?(\d+)', m.group(0), re.I)
            if wm and int(wm.group(1)) > 400 and not media_constrained:
                warnings["fixed-width media"].append(
                    f"{rel} <{m.group(0).split()[0][1:].lower()}> width={wm.group(1)}")

        # 7: the theme must be resolved before the stylesheet is applied.
        #
        # The <html> element always carries a data-theme attribute — that is the
        # default ramp, and it proves nothing. What has to come before the
        # stylesheet is the bootstrap script that rewrites it to the stored
        # theme, or the page paints the default ramp and then jumps.
        head = html.split("</head>", 1)[0]
        boot_at = head.find("dataset.theme")
        if boot_at == -1:
            if not is_stub:
                errors["theme not resolved in <head> (FOUC risk)"].append(rel)
        else:
            # Astro emits the stylesheet as <link rel="stylesheet" href="/_astro/…">.
            css_at = head.find('rel="stylesheet"')
            if css_at != -1 and boot_at > css_at:
                errors["theme script placed after the stylesheet"].append(rel)

        # 9: title, canonical, JSON-LD
        tm = title_re.search(html)
        if not tm or not tm.group(1).strip():
            errors["missing <title>"].append(rel)
        if not canonical_re.search(html):
            errors["missing canonical"].append(rel)
        if not is_stub and not jsonld_re.search(html):
            errors["missing JSON-LD"].append(rel)

    # 8: CSS variables
    #
    # The tokens live in global.css and are used from every stylesheet, so the
    # check has to be across the set: a variable defined in one file and used
    # in another is defined, and a per-file check reports all of them as
    # missing.
    stylesheets = sorted(STYLE_DIR.glob("*.css")) if STYLE_DIR.exists() else []
    if not stylesheets:
        errors["no stylesheets found"].append(f"{STYLE_DIR} is empty or missing")
    defined: set[str] = set()
    used: dict[str, list[str]] = defaultdict(list)
    for sheet in stylesheets:
        css = sheet.read_text(encoding="utf-8")
        defined |= set(re.findall(r"(--[\w-]+)\s*:", css))
        for name in set(re.findall(r"var\((--[\w-]+)\)", css)):
            used[name].append(sheet.name)
        if css.count("{") != css.count("}"):
            errors["unbalanced braces in stylesheet"].append(
                f"{sheet.name}: {css.count('{')} open vs {css.count('}')} close")

    # Some custom properties are set inline in the markup rather than in the
    # stylesheet — the diagram lays out its hit boxes with --c0/--r0/--w/--h,
    # and the reveal and progress scripts write --i, --progress and the rest at
    # runtime. Those are defined even though no stylesheet declares them, so
    # the markup has to be read for them too.
    inline_defined: set[str] = set()
    for f in files:
        html = f.read_text(encoding="utf-8", errors="replace")
        for style in re.findall(r'\sstyle="([^"]*)"', html):
            inline_defined |= set(re.findall(r"(--[\w-]+)\s*:", style))
    defined |= inline_defined
    for name in sorted(set(used) - defined):
        errors["undefined CSS variable"].append(f"{name} (used in {', '.join(used[name])})")

    # ---- report ----
    print("=" * 72)
    print("SITE AUDIT")
    print("=" * 72)
    print(f"build output  : {DIST}")
    print(f"pages scanned : {len(files)}")
    print(f"external refs : {EXTERNAL} (not checked, out of scope)")
    print()

    if warnings:
        print(f"--- warnings ({sum(len(v) for v in warnings.values())}) ---")
        for k in sorted(warnings):
            print(f"  [{len(warnings[k])}] {k}")
            for item in warnings[k][:5]:
                print(f"        {item}")
            if len(warnings[k]) > 5:
                print(f"        ... +{len(warnings[k]) - 5} more")
        print()

    if errors:
        print(f"--- ERRORS ({sum(len(v) for v in errors.values())}) ---")
        for k in sorted(errors):
            print(f"  [{len(errors[k])}] {k}")
            for item in errors[k][:8]:
                print(f"        {item}")
            if len(errors[k]) > 8:
                print(f"        ... +{len(errors[k]) - 8} more")
        print()
        print("AUDIT FAILED")
        return 1

    print("[OK] no errors")
    return 0


if __name__ == "__main__":
    sys.exit(main())
