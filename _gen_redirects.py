#!/usr/bin/env python3
"""Generate redirect stubs for every URL the legacy build.py generator emitted.

GitHub Pages serves static files only — there is no server config to edit — so
a redirect has to be a real document. Each stub is a tiny HTML file carrying:

  * <link rel="canonical"> so search engines consolidate the signal
  * <meta http-equiv="refresh"> which works with JS disabled
  * a JS location.replace so the address bar updates without a history entry

Stubs are written into static/, which astro.config.mjs already uses as
publicDir, so they land at the site root after a build.

Every stub is also listed in _legacy-urls.json, which the link gate in CI
reads: a legacy URL that loses its stub is a 404 for a link the old site
published, and nothing else in the build would notice.

Run:  python _gen_redirects.py
"""
import json
import re
import shutil
from pathlib import Path

BASE = Path(__file__).parent
CONTENT = BASE / "content"
POSTS = BASE / "src" / "content" / "posts"
STATIC = BASE / "static"
MANIFEST = BASE / "_legacy-urls.json"

# Where a stub goes when the address it served is taken over by a real page.
# Nothing under here is published: the directory is outside the build and out
# of git. The URL it served stays in `_legacy-urls.json` and in
# `docs/legacy-urls.txt`, so the record survives the stub.
QUARANTINE = BASE / ".quarantine" / "tag-stubs"

# The routes a human mistypes by capitalising them. Pages is case-sensitive,
# so /BLOG/ and /About/ are a 404 rather than the page they look like.
CASE_VARIANTS = [
    "/about/",
    "/blog/",
    "/projects/",
    "/experience/",
]

# The canonical has to be absolute: a relative one reads as a canonical of the
# redirect stub itself, which is the page we are asking a search engine to
# drop from the index.
SITE = "https://maltsev-dev.github.io"

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, follow">
<title>Redirecting to {target}</title>
<link rel="canonical" href="{canonical}">
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


def parse_yaml_tags(raw: str) -> list[str]:
    """Return the tag list from a YAML-frontmatter post.

    The collection the site actually ships (`src/content/posts/`) uses YAML
    frontmatter, the legacy one (`content/`) uses TOML. Only the tags are
    needed here, and they are written in one of two shapes — an inline list or
    a block list — so a two-line parser is enough and the script stays
    dependency-free.
    """
    if not raw.startswith("---"):
        return []
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return []
    lines = parts[1].splitlines()
    tags: list[str] = []
    in_tags = False
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if in_tags:
            if stripped.startswith("- "):
                tags.append(stripped[2:].strip().strip("\"'"))
                continue
            in_tags = False
        if stripped.startswith("tags:"):
            inline = stripped[len("tags:"):].strip()
            if inline.startswith("[") and inline.endswith("]"):
                tags = [
                    t.strip().strip("\"'")
                    for t in inline[1:-1].split(",")
                    if t.strip()
                ]
            elif not inline:
                in_tags = True
    return tags


def slugify(title: str, date: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{date}-{base}" if date else base


def legacy_root_name(stem: str) -> str:
    """The filename the legacy generator wrote for a post.

    The collection stores posts as `YYYY-MM-DD-slug.md`; the legacy generator
    published each one as `slug.html` at the site root, with the date
    stripped off. Twenty-three published articles were linked from the legacy
    index under exactly that name, and every one of them is a hard 404 today.
    """
    match = re.match(r"^\d{4}-\d{2}-\d{2}-(.+)$", stem)
    return match.group(1) if match else stem


def tag_slugs(tag: str) -> set[str]:
    """Every path spelling a tag was ever published under.

    The legacy site wrote the tag as written in the front matter, so
    `actix_web` stayed `actix_web` and `basic_electronics` stayed
    `basic_electronics`. The current pages use the hyphenated form. Both are
    returned: the hyphenated one is the page, the raw one is a redirect to it.
    """
    raw = tag.strip().lower()
    if not raw or not re.fullmatch(r"[a-z0-9_-]+", raw):
        return set()
    slugs = {raw}
    hyphen = re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")
    if hyphen:
        slugs.add(hyphen)
    return slugs


def current_tag_slugs() -> set[str]:
    """The tag pages the site actually serves.

    One page per tag, at the hyphenated address. The generator has to know
    these: the stub for a tag whose page now exists points at the page, not
    at the archive, and the page's own address must not get a stub — the
    page is there.
    """
    slugs: set[str] = set()
    for path in sorted(POSTS.glob("*.md")):
        for tag in parse_yaml_tags(path.read_text(encoding="utf-8")):
            raw = tag.strip().lower()
            if not raw:
                continue
            hyphen = re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")
            if hyphen:
                slugs.add(hyphen)
    return slugs


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

    # The posts the site actually ships. The tag set has to come from here and
    # not only from `content/`: the fifteen tags the 2026 posts introduced —
    # authorization, security, mcp, reliability, budget, cost, operations,
    # testing, audit, compliance, enforcement, redis and the underscore
    # spellings actix_web, basic_electronics, open_ai — never existed in the
    # legacy collection, so no stub was ever written for them and every one of
    # those tag pages is a 404.
    for path in sorted(POSTS.glob("*.md")):
        post_tags = parse_yaml_tags(path.read_text(encoding="utf-8"))
        routes[f"/{legacy_root_name(path.stem)}.html"] = f"/blog/{path.stem}/"
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

    # Tag pages. A tag that the site still writes about has a page now, at
    # the hyphenated address, and the spelling the legacy site published
    # redirects to it. A tag the site no longer writes about — the old
    # collection had tags the current posts do not carry — has no page, and
    # folds into the archive the way it did before.
    live = current_tag_slugs()
    for tag in sorted(tags):
        raw = tag.strip().lower()
        hyphen = re.sub(r"[^a-z0-9-]+", "-", raw).strip("-")
        has_page = hyphen in live
        canonical = f"/tags/{hyphen}/" if has_page else "/blog/"

        for safe in tag_slugs(tag):
            # The page's own address is served by Astro. A stub there would
            # shadow it.
            if has_page and safe == hyphen:
                continue
            routes[f"/tags/{safe}/"] = canonical

    # Paginated index no longer exists; the archive holds everything.
    for n in range(2, 12):
        routes[f"/page/{n}/"] = "/blog/"

    # A capitalised address is a 404 on a case-sensitive host, and a reader
    # who types /BLOG/ meant /blog/. Every main route gets the capitalised
    # spelling. Only one: a repository cannot hold /BLOG/ and /Blog/ side by
    # side on a case-insensitive filesystem, and the capitalised form is the
    # one that was actually being typed.
    for route in CASE_VARIANTS:
        routes[f"/{route.strip('/').upper()}/"] = route

    return routes


def write_stub(route: str, target: str) -> bool:
    """Write one redirect document. Returns True if a file was created."""
    if route.endswith(".html"):
        out = STATIC / route.lstrip("/")
    else:
        out = STATIC / route.lstrip("/") / "index.html"

    # The canonical is absolute. A relative one is resolved against the
    # redirect stub itself by some crawlers and ignored by others, so the
    # signal it carries is ambiguous; the absolute form is what the crawl
    # sees everywhere else on the site.
    canonical = SITE + target

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        TEMPLATE.format(
            target=target,
            canonical=canonical,
            target_js=json.dumps(target),
            papier="#14100a",
            encre="#ffa02e",
            braise="#e0501e",
        ),
        encoding="utf-8",
    )
    return True


def remove_shadowed_tags(live: set[str]) -> list[str]:
    """Move the stubs of tags that now have real pages behind them.

    A tag page used to be a stub that bounced the reader to the archive.
    There is a real page at that address now, and a stub left behind would
    shadow it: static/ is copied into the build next to the routes, so the
    stub and the page would fight over one file.

    The stubs are moved to `.quarantine/tag-stubs/` rather than deleted. A
    redirect stub is a small piece of the site's history, and the address it
    once served is still in `_legacy-urls.json` and `docs/legacy-urls.txt`,
    so the record of the URL outlives the file.

    Only a file this script wrote is moved — a directory whose index.html is
    not one of our stubs is left alone.
    """
    moved: list[str] = []
    tag_root = STATIC / "tags"
    if not tag_root.is_dir():
        return moved

    for entry in sorted(tag_root.iterdir()):
        if not entry.is_dir() or entry.name not in live:
            continue
        index = entry / "index.html"
        if not index.exists():
            continue
        body = index.read_text(encoding="utf-8", errors="replace")
        if "Redirecting to" not in body or '<meta http-equiv="refresh"' not in body:
            continue  # not one of ours
        dest = QUARANTINE / entry.name
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(entry), str(dest))
        moved.append(entry.name)

    return moved


def main() -> int:
    routes = build_map()
    for route, target in sorted(routes.items()):
        write_stub(route, target)

    # The manifest the CI link gate reads. Every stub the generator wrote is
    # listed, so a stub that goes missing is a failure of the build rather
    # than a 404 nobody notices.
    manifest = {
        "site": SITE,
        "generated_by": "_gen_redirects.py",
        "stubs": {route: target for route, target in sorted(routes.items())},
    }
    MANIFEST.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    removed = remove_shadowed_tags(current_tag_slugs())

    print(f"[OK] {len(routes)} redirect stubs written into static/")
    print(f"     manifest: {MANIFEST.name} ({len(manifest['stubs'])} routes)")
    if removed:
        print(f"     {len(removed)} shadowed tag stub(s) moved to .quarantine/: {', '.join(removed[:8])}")
    print(f"     e.g. {sorted(routes)[0]} -> {sorted(routes.items())[0][1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())