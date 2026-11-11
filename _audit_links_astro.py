#!/usr/bin/env python3
"""Post-build link check over dist/.

Walks every emitted HTML file, resolves each local href/src against the built
output, and reports anything that does not exist. Exits non-zero on findings so
it can gate a deploy.

The social-card tags are checked too. `og:image` lives in a `content=` attribute,
not in `href`/`src`, so an earlier version of this gate passed while every page
on the site advertised an og:image URL that 404s — which is precisely the class
of defect a deploy gate exists to catch. Meta tags whose content points at the
site's own origin are resolved against dist/ like any other reference; ones
pointing off-site are left alone.

The legacy URLs are checked as well. _gen_redirects.py writes a stub for every
address the previous generator published and records them in _legacy-urls.json;
that file is the list of links the old site handed out, and a stub that goes
missing is a 404 for one of them. Nothing else in the build would notice,
because nothing on the current site links to them any more.
"""
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

# The build to check. Defaults to `dist/` — the directory CI builds into — and
# can be pointed elsewhere with a first argument, which is what an isolated
# verification build does:
#
#   python _audit_links_astro.py dist-lead
#
DIST = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).parent / "dist"
MANIFEST = Path(__file__).parent / "_legacy-urls.json"
SITE = "maltsev-dev.github.io"

# href/src patterns, plus the HTML entities Astro emits for stray quotes.
ATTR = re.compile(r'(?:href|src)="([^"]+)"')

# Only the meta tags whose content is a URL a scraper will actually fetch.
# og:title, og:description and og:image:width are deliberately not here — their
# content is text or a number, and treating it as a path reports every page as
# broken.
META = re.compile(
    r'<meta[^>]+(?:property|name)="'
    r'(?:og:image|og:image:secure_url|og:image:url|og:url'
    r'|twitter:image|twitter:image:src|twitter:player)'
    r'"[^>]+content="([^"]+)"'
)


def resolve(base: Path, url: str) -> Path | None:
    """Map a site-absolute URL to the file that should satisfy it.

    Returns None when the URL is not ours to check (external, mailto, anchor).
    """
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc != SITE:
        return None
    if parsed.scheme and parsed.scheme not in ("http", "https"):
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


def check_manifest() -> list[str]:
    """Every legacy URL the generator wrote a stub for must still resolve."""
    if not MANIFEST.exists():
        print("[INFO] no _legacy-urls.json — run `python _gen_redirects.py` to write one")
        return []

    try:
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"[ERROR] _legacy-urls.json is unreadable: {exc}")
        return ["<manifest unreadable>"]

    stubs = data.get("stubs", {})
    missing: list[str] = []
    for route in sorted(stubs):
        target = resolve(DIST, route)
        if target is None or not target.exists():
            missing.append(route)

    print(f"[INFO] {len(stubs)} legacy URLs checked against the manifest")
    return missing


def main() -> int:
    if not DIST.exists():
        print(f"[ERROR] {DIST} not found — run `npm run build` first.")
        return 2

    pages = sorted(DIST.rglob("*.html"))
    broken: list[tuple[str, str]] = []
    checked = 0

    for page in pages:
        rel = page.relative_to(DIST).as_posix()
        html = page.read_text(encoding="utf-8", errors="replace")
        for url in ATTR.findall(html) + META.findall(html):
            target = resolve(page, url)
            if target is None:
                continue
            checked += 1
            if not target.exists():
                broken.append((rel, url))

    print(f"[INFO] {len(pages)} pages, {checked} local references checked")

    missing_legacy = check_manifest()
    if missing_legacy:
        print(f"[FAIL] {len(missing_legacy)} legacy URL(s) lost their stub:")
        for route in missing_legacy[:40]:
            print(f"  {route}")
        if len(missing_legacy) > 40:
            print(f"  ... and {len(missing_legacy) - 40} more")

    if broken:
        # Post titles carry emoji and a Windows console defaults to cp1252, which
        # cannot encode them — a broken reference must not crash the gate that
        # exists to report it.
        print(f"[FAIL] {len(broken)} broken reference(s):")
        for rel, url in broken[:40]:
            print(f"  {rel} -> {url!a}")
        if len(broken) > 40:
            print(f"  ... and {len(broken) - 40} more")
        return 1

    if missing_legacy:
        return 1

    print("[OK] no broken local references")
    return 0


if __name__ == "__main__":
    sys.exit(main())