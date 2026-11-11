import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// The command palette's index.
//
// This used to be built into every page's HTML: 84 <li> elements with their
// labels, groups and ids, on all 79 pages, whether or not the reader ever
// opened the palette. On a post page that was a fifth of the document's
// bytes spent on a list nobody had asked for.
//
// It is fetched the first time the palette opens instead, and cached by the
// browser after that.
export const GET: APIRoute = async () => {
  const POSTS = (await getCollection('posts')).sort((a, b) =>
    (b.data.date ?? '').localeCompare(a.data.date ?? '')
  );
  const PROJECTS = await getCollection('projects');

  const items = [
    { label: 'Home', href: '/', group: 'Page' },
    { label: 'Projects', href: '/projects/', group: 'Page' },
    { label: 'Experience', href: '/experience/', group: 'Page' },
    { label: 'Profile', href: '/about/', group: 'Page' },
    { label: 'Writing', href: '/blog/', group: 'Page' },
    { label: 'Freelance', href: '/freelance/', group: 'Page' },
    ...PROJECTS.map((p) => ({
      label: p.data.title,
      href: `/projects/${p.data.slug}/`,
      group: 'Project',
    })),
    ...POSTS.map((p) => ({
      label: p.data.title,
      href: `/blog/${p.id}/`,
      group: 'Post',
    })),
  ];

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
