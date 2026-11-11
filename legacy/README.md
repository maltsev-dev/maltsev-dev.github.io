# `legacy/` — the retired site, kept out of the build

Nothing in this directory is published. `astro.config.mjs` sets
`publicDir: './static'`, so only `static/` is copied into `dist/`; `legacy/`
sits outside the build and nothing under it reaches a visitor.

It is a quarantine, not a backup: the files here are the output of the
`build.py` generator and of the Astro migration's first drafts, and they are
kept so the history of the site stays readable while the working tree is
cleaned up. The lead agent reviews this list and deletes from git afterwards.

## `public/` — the URL manifest of the retired `build.py` site

`public/` was the publish tree of `build.py`, the generator that ran before
Astro. It is the only record of the URL set the old site served, and it is
what `_gen_redirects.py` was written against when it generated the meta-refresh
stubs that still live in `static/*.html`.

It was moved here, out of the repo root, because the ambiguity between
`public/` and `static/` had already caused a real defect once: `static/` *is*
the public directory, so a `/static/favicon.png` URL 404s on the built site.
Two directories with the same job and different contents is a standing
hazard; one directory, named for what it is, is not.

The tree itself is **not tracked in git** (see `.gitignore` in this
directory) — it is 68 MB of stale HTML and duplicated assets, and it has
never been in the repository. What is worth keeping is the URL list, and that
is preserved in `static/*.html` (the redirect stubs) plus `_gen_redirects.py`.

Nothing at build time reads it. `npm run build` runs `astro build`, which
copies `static/` and renders the routes; CI publishes `./dist`, not
`./public`. The scripts that still point at `public/` — `tools/audit.py` and
the retired `_audit_*.py` helpers — are local tooling, not part of the
deploy.

## `static-legacy/` — the CSS and JS the Astro build replaced

`css/style.css` (56 KB), `js/theme.js` and `js/fade-in.js` were the output of
`build.py`. The Astro build emits its own hashed bundle under `_astro/`, and
no page referenced these three files: they were published on every build and
downloaded by nobody.

## `components/AiDiagram.astro` — a component nothing imported

Dead from the start: `grep -rn "AiDiagram" src/` found no importer. Kept for
reference until it is deleted.

## `images/` — media no page referenced

`rust_mastering/` (the post it was drawn for was never published),
`profile_image.jpg` (the old profile photo, superseded by the `desk-*.webp`
art) and three `emb/` diagrams. Together: 2.38 MB that the deployment was
carrying for nothing.

`profile_image.jpg` is still referenced by `templates_custom/about.html`, a
template of the retired generator. That template is not part of the Astro
build.

## `favicon.png` — the 512-pixel favicon

`static/favicon.png` was 512×512 and 358 KB, with no `<link rel="icon">`
anywhere in the site. It is replaced by `static/favicon.svg` (the `A|M` mark,
1.1 KB) and `static/favicon.ico` (32×32, 1.4 KB).
