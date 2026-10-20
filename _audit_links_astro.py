#!/usr/bin/env python3
"""Post-build link check over dist/.

Walks every emitted HTML file, resolves each local href/src against the built
output, and reports anything that does not exist. Exits non-zero on findings so
it can gate a deploy.
"""
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

DIST = Path(__file__).parent / "dist"

# href/src patterns, plus the HTML entities Astro emits for stray quotes.
ATTR = re.compile(r'(?:href|src)="([^"]+)"')


def resolve(base: Path, url: str) -> Path | None:
    """Map a site-absolute URL to the file that should satisfy it.

    Returns None when the URL is not ours to check (external, mailto, anchor).
    """
    parsed = urlparse(url)
    if parsed.scheme or parsed.netloc:
        return None
    if not parsed.path or parsed.path.startswith("#"):
        return None

    path = unquote(parsed.path).lstrip("/")
    if not path:
        return None

    candidate = DIST / path

    # /about/ and /about both resolve to the generated directory index.
    if (candidate / "index.html").exists():
        return candidate / "index.html"
    if candidate.exists() and candidate.is_file():
        return candidate
    if candidate.with_suffix(".html").exists():
        return candidate.with_suffix(".html")
    return candidate  # missing — caller reports it


def main() -> int:
    if not DIST.exists():
        print("[ERROR] dist/ not found — run `npm run build` first.")
        return 2

    pages = sorted(DIST.rglob("*.html"))
    broken: list[tuple[str, str]] = []
    checked = 0

    for page in pages:
        rel = page.relative_to(DIST).as_posix()
        html = page.read_text(encoding="utf-8", errors="replace")
        for url in ATTR.findall(html):
            target = resolve(page, url)
            if target is None:
                continue
            checked += 1
            if not target.exists():
                broken.append((rel, url))

    print(f"[INFO] {len(pages)} pages, {checked} local references checked")

    if broken:
        print(f"[FAIL] {len(broken)} broken reference(s):")
        for rel, url in broken[:40]:
            print(f"  {rel} -> {url}")
        if len(broken) > 40:
            print(f"  ... and {len(broken) - 40} more")
        return 1

    print("[OK] no broken local references")
    return 0


if __name__ == "__main__":
    sys.exit(main())