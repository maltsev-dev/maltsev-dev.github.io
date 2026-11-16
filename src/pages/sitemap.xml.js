import { getCollection } from 'astro:content';
import { tagSlug } from '../lib/tags';

// Static pages that are not collection-driven.
const STATIC_ROUTES = [
  '/',
  '/projects/',
  '/blog/',
  '/experience/',
  '/about/',
];

/**
 * The date a page last changed.
 *
 * A post knows: it has a date, and a collection entry may carry an `updated`
 * one. Everything else does not — a hand-written page has no edit date in
 * it, and the site has no build history to read one out of. For those the
 * build date is the honest answer: the page that was published today is the
 * page the crawler is being offered.
 *
 * Nine of the URLs used to carry no `<lastmod>` at all, which reads as
 * "unknown when this last changed" to anything parsing the sitemap.
 */
function buildDate() {
  return new Date().toISOString().slice(0, 10);
}

/** W3C datetime, which is what a `<lastmod>` is allowed to be. */
function stamp(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function GET(context) {
  const posts = await getCollection('posts');

  const today = buildDate();

  const urls = [
    ...STATIC_ROUTES.map((p) => ({ loc: p, lastmod: today })),
    ...posts.map((p) => ({
      loc: `/blog/${p.id}/`,
      lastmod: stamp(p.data.updated) ?? stamp(p.data.date) ?? today,
    })),
  ];

  // One entry per tag, at the address the tag page is served from. The tag
  // pages are ordinary pages — they were in the archive and nowhere else,
  // so a crawler had no way to find them.
  const tagSlugs = new Set();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const slug = tagSlug(tag);
      if (slug) tagSlugs.add(slug);
    }
  }
  for (const slug of [...tagSlugs].sort()) {
    urls.push({ loc: `/tags/${slug}/`, lastmod: today });
  }

  // No `<priority>`. Every search engine that reads a sitemap ignores it —
  // Google documents it as ignored, and Bing never used it — so a value on
  // every entry is a number that only looks like a decision. `<lastmod>` is
  // the field that is actually read.
  const body = urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${new URL(u.loc, context.site).href}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
        `  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
