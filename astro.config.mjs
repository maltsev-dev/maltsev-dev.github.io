// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import rehypeImageAttrs from './src/plugins/rehype-image-attrs.mjs';
import rehypeTableScroll from './src/plugins/rehype-table-scroll.mjs';
import rehypeHeadingIds from './src/plugins/rehype-heading-ids.mjs';
import rehypeStripPictograms from './src/plugins/rehype-strip-pictograms.mjs';

// Static output, matching the legacy generator: GitHub Pages serves `dist/`
// from the repo root, so every route is pre-rendered to plain HTML.
export default defineConfig({
  site: 'https://maltsev-dev.github.io',
  output: 'static',
  trailingSlash: 'always',
  // The retired generator's output used to sit in `public/`. Left as
  // publicDir, Astro would copy those stale HTML pages into dist/ alongside
  // the real routes; the live assets live in static/, and that is the public
  // directory.
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
  // Code blocks ship with the Shiki palette as CSS variables, and the
  // stylesheet reads the colour of each token off the variable. The theme is
  // `github-dark-default` rather than `github-dark` because the latter's
  // comment grey (#6a737d on #24292e) is 3.05:1 and fails AA. There is one
  // palette now: the light one existed for the paper theme, which is gone.
  markdown: {
    // Every image in a post body gets its intrinsic size, `loading="lazy"`
    // and `decoding="async"`. Without them the browser reserves no space
    // for a figure and the article jumps as each one lands.
    rehypePlugins: [
      rehypeImageAttrs,
      rehypeTableScroll,
      rehypeHeadingIds,
      // The pictograms out of the bodies. The corpus is a decade of writing
      // made on a platform with a button for inserting an emoji, and those
      // emoji are the only full-colour thing on an otherwise monochrome
      // page. The rule leaves the ASCII art alone — the arrows, the
      // triangles and the box drawing the diagrams are drawn with.
      rehypeStripPictograms,
    ],
    shikiConfig: {
      themes: { dark: 'github-dark-default' },
      defaultColor: false,
    },
  },
});