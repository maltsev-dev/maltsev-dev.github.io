#!/usr/bin/env python3
"""Post-build QA gate for maltsev-dev.github.io.

Run after `python build.py`. Exits non-zero on any error-level finding, so it can
gate a deploy:

    python build.py && python tools/audit.py

Checks
  1. every internal href/src resolves to a real file in public/
  2. in-page #anchors exist on the target page
  3. one and only one <h1> per page
  4. required <head> meta is present (description, og:title/description/url/image)
  5. og:image points at a real local file
  6. embedded media is width-constrained so it cannot overflow a phone
  7. the theme is resolved before first paint (no render-blocking theme flash)
  8. colour tokens referenced by the stylesheet are all defined
"""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
CSS = ROOT / "static" / "css" / "style.css"

SKIP_PREFIX = ("http://", "https://", "//", "mailto:", "tel:", "data:", "javascript:")
EXTERNAL = 0

tag_re = re.compile(r"<\s*(img|script|link|a|video|iframe|source)\b[^>]*>", re.I)
attr_re = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
id_re = re.compile(r'\sid\s*=\s*["\']([^"\']+)["\']', re.I)
h1_re = re.compile(r"<h1\b", re.I)


def url_to_path(url: str) -> Path | None:
    """Map a site-absolute URL onto a file inside public/."""
    if url.startswith(SKIP_PREFIX):
        return None
    p = url.split("#", 1)[0].split("?", 1)[0]
    if not p:
        return None
    p = p.lstrip("/")
    target = PUBLIC / p
    if p.endswith("/"):
        target = target / "index.html"
    elif target.is_dir():
        target = target / "index.html"
    return target


def main() -> int:
    if not PUBLIC.exists():
        print("[FAIL] public/ does not exist — run `python build.py` first")
        return 1

    files = sorted(PUBLIC.rglob("*.html"))
    if not files:
        print("[FAIL] public/ contains no HTML")
        return 1

    ids = {f: set(id_re.findall(f.read_text(encoding="utf-8", errors="replace")))
           for f in files}

    errors: dict[str, list[str]] = defaultdict(list)
    warnings: dict[str, list[str]] = defaultdict(list)

    for f in files:
        rel = f.relative_to(PUBLIC).as_posix()
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

        # 3: exactly one h1
        n = len(h1_re.findall(html))
        if n == 0:
            warnings["no <h1>"].append(rel)
        elif n > 1:
            errors[f"{n}x <h1> (must be 1)"].append(rel)

        # 4: required meta
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
                if not url_to_path(url) or not url_to_path(url).exists():
                    errors["og:image target missing"].append(f"{rel} -> {url}")

        # 6: media must not carry a fixed pixel width
        for m in re.finditer(r"<(?:video|iframe)\b[^>]*>", html, re.I):
            wm = re.search(r'\swidth\s*=\s*["\']?(\d+)', m.group(0), re.I)
            if wm and int(wm.group(1)) > 400:
                warnings["fixed-width media"].append(
                    f"{rel} <{m.group(0).split()[0][1:].lower()}> width={wm.group(1)}")

        # 7: theme must be applied before the stylesheet
        head = html.split("</head>", 1)[0]
        if "data-theme" not in head:
            errors["theme not resolved in <head> (FOUC risk)"].append(rel)
        else:
            theme_at = head.find("data-theme")
            css_at = head.find("style.css")
            if css_at != -1 and theme_at > css_at:
                errors["theme script placed after the stylesheet"].append(rel)

    # 8: CSS variables
    if CSS.exists():
        css = CSS.read_text(encoding="utf-8")
        defined = set(re.findall(r"(--[\w-]+)\s*:", css))
        used = set(re.findall(r"var\((--[\w-]+)\)", css))
        for name in sorted(used - defined):
            errors["undefined CSS variable"].append(f"{name} (used but never defined)")
        if css.count("{") != css.count("}"):
            errors["unbalanced braces in stylesheet"].append(
                f"{css.count('{')} open vs {css.count('}')} close")

    # ---- report ----
    print("=" * 72)
    print("SITE AUDIT")
    print("=" * 72)
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
