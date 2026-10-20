#!/usr/bin/env python3
"""Generate redirect stubs for every URL the legacy build.py generator emitted.

GitHub Pages serves static files only — there is no server config to edit — so
a redirect has to be a real document. Each stub is a tiny HTML file carrying:

  * <link rel="canonical"> so search engines consolidate the signal
  * <meta http-equiv="refresh"> which works with JS disabled
  * a JS location.replace so the address bar updates without a history entry

Stubs are written into static/, which astro.config.mjs already uses as
publicDir, so they land at the site root after a build.

Run:  python _gen_redirects.py
"""
import json
import re
from pathlib import Path

BASE = Path(__file__).parent
CONTENT = BASE / "content"
STATIC = BASE / "static"

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, follow">
<title>Redirecting to {target}</title>
<link rel="canonical" href="{target}">
<meta http-equiv="refresh" content="0; url={target}">
<style>
  body {{ background: {papier}; color: {encre}; font-family: ui-monospace, monospace;
         display: grid; place-items: center; min-height: 100vh; margin: 0; }}
  a {{ color: {braise}; }}
</style>
</head>
<body>
  <p>This page moved to <a href="{target}">{target}</a>.</p>
  <script>window.location.replace({target_js});</script>
</body>
</html>
"""


def parse_frontmatter(raw: str):
    """Return (title, date, tags) from a legacy post."""
    if not raw.startswith("+++"):
        return "", "", []
    parts = raw.split("+++", 2)
    if len(parts) < 3:
        return "", "", []
    title = date = ""
    tags = []
    in_tax = False
    for line in parts[1].splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("["):
            in_tax = line.replace(" ", "") == "[taxonomies]"
            continue
        if "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip()
        if in_tax and k == "tags":
            tags = [t.strip().strip('"\'') for t in v.strip("[]").split(",") if t.strip()]
        elif k == "title":
            title = v.strip('"\'')
        elif k == "date":
            date = v.strip('"\'')
    return title, date, tags


def slugify(title: str, date: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{date}-{base}" if date else base


def build_map() -> dict[str, str]:
    """Old URL -> new URL, covering every route the old generator produced."""
    routes: dict[str, str] = {}
    tags: set[str] = set()

    for path in sorted(CONTENT.glob("*.md")):
        title, date, post_tags = parse_frontmatter(path.read_text(encoding="utf-8"))
        if not title:
            continue
        slug = slugify(title, date)
        # Old generator wrote OUTPUT_DIR / f"{url_path}.html"
        routes[f"/{path.stem}.html"] = f"/blog/{slug}/"
        tags.update(t.lower() for t in post_tags)

    # Section pages that no longer exist under their old names.
    routes["/archive/"] = "/blog/"
    routes["/archive/index.html"] = "/blog/"

    # Legacy architecture diagrams that used to be standalone pages. Nothing
    # links to them any more, so they fold into the case study they describe
    # rather than lingering as orphans.
    routes["/ai_email_agent_architecture.html"] = "/projects/email-reply-agent/"
    routes["/ai_sms_lead_agent_architecture.html"] = "/projects/lead-qualification-agent/"
    routes["/ai_support_ticket_architecture.html"] = "/projects/support-triage-agent/"

    # Tag pages collapsed into the single archive.
    for tag in tags:
        safe = re.sub(r"[^a-z0-9-]+", "-", tag).strip("-")
        if safe:
            routes[f"/tags/{safe}/"] = "/blog/"
            routes[f"/tags/{safe}/index.html"] = "/blog/"

    # Paginated index no longer exists; the archive holds everything.
    for n in range(2, 12):
        routes[f"/page/{n}/"] = "/blog/"
        routes[f"/page/{n}/index.html"] = "/blog/"

    return routes


def write_stub(route: str, target: str) -> bool:
    """Write one redirect document. Returns True if a file was created."""
    if route.endswith(".html"):
        out = STATIC / route.lstrip("/")
    else:
        out = STATIC / route.lstrip("/") / "index.html"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        TEMPLATE.format(
            target=target,
            target_js=json.dumps(target),
            papier="#14100a",
            encre="#ffa02e",
            braise="#e0501e",
        ),
        encoding="utf-8",
    )
    return True


def main() -> int:
    routes = build_map()
    for route, target in sorted(routes.items()):
        write_stub(route, target)
    print(f"[OK] {len(routes)} redirect stubs written into static/")
    print(f"     e.g. {sorted(routes)[0]} -> {sorted(routes.items())[0][1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())