import rss from '@astrojs/rss';
import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe } from '../lib/summarize';

/**
 * The feed used to carry a title, a date and a link — nothing else. A reader
 * who subscribed got a list of headlines with no way to tell which post was
 * worth opening, and every aggregator that renders a feed falls back to the
 * title for the preview text.
 *
 * Each item now carries the same one-line summary the site uses, and the
 * body itself, so the feed can be read on its own.
 */

/**
 * The rendered body of a post.
 *
 * The container API is the only way to get HTML out of a markdown entry at
 * build time. If it is unavailable the feed still works — it just carries
 * the summary and not the body — so a failure here must not fail the build.
 */
async function renderBody(post) {
  try {
    const { Content } = await render(post);
    const container = await AstroContainer.create();
    return await container.renderToString(Content);
  } catch (err) {
    console.warn(`[rss] body not rendered for ${post.id}: ${err.message}`);
    return '';
  }
}

export async function GET(context) {
  const posts = (await getCollection('posts')).sort((a, b) =>
    (b.data.date ?? '').localeCompare(a.data.date ?? '')
  );

  const items = await Promise.all(
    posts.map(async (post) => {
      const description = describe(post.data.title, post.body, post.data.description);
      const content = await renderBody(post);

      return {
        title: post.data.title,
        pubDate: new Date(post.data.date ?? '1970-01-01'),
        link: `/blog/${post.id}/`,
        description,
        content,
        categories: post.data.tags,
      };
    })
  );

  return rss({
    title: 'Maltsev · Agentic Engineering',
    description: 'Notes on embedded Rust, agentic AI, and systems work.',
    site: context.site,
    items,
    customData: '<language>en-us</language>',
  });
}
