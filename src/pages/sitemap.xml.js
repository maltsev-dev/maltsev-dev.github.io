import { getCollection } from 'astro:content';

// Static pages that are not collection-driven.
const STATIC_ROUTES = [
  '/',
  '/projects/',
  '/blog/',
  '/experience/',
  '/about/',
  '/freelance/',
];

export async function GET(context) {
  const posts = await getCollection('posts');
  const projects = await getCollection('projects');

  const urls = [
    ...STATIC_ROUTES.map((p) => ({ loc: p, lastmod: null, priority: p === '/' ? '1.0' : '0.8' })),
    ...projects.map((p) => ({
      loc: `/projects/${p.data.slug}/`,
      lastmod: null,
      priority: '0.8',
    })),
    ...posts.map((p) => ({
      loc: `/blog/${p.id}/`,
      lastmod: p.data.date ?? null,
      priority: '0.6',
    })),
  ];

  const body = urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${new URL(u.loc, context.site).href}</loc>\n` +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
        `    <priority>${u.priority}</priority>\n` +
        `  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}