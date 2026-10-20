import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts')).sort((a, b) =>
    (b.data.date ?? '').localeCompare(a.data.date ?? '')
  );

  return rss({
    title: 'Maltsev · Agentic Engineering',
    description: 'Notes on embedded Rust, agentic AI, and systems work.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date ?? '1970-01-01'),
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}