// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// Static output, matching the legacy generator: GitHub Pages serves `dist/`
// from the repo root, so every route is pre-rendered to plain HTML.
export default defineConfig({
  site: 'https://maltsev-dev.github.io',
  output: 'static',
  trailingSlash: 'always',
  // `public/` still holds the output of the legacy build.py generator. Left as
  // publicDir, Astro would copy those stale HTML pages into dist/ alongside
  // the real routes; the live assets already live in static/.
  publicDir: './static',
  build: {
    format: 'directory',
  },
  // The contact page is gone; its URL is the one people have bookmarked and
  // linked to, so it lands on the profile instead of a 404.
  redirects: {
    '/contact': '/about',
  },
  integrations: [mdx()],
});