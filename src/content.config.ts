import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /**
     * The post's own description. Optional: a post that does not write one
     * gets the first real sentence of its body, derived at build time.
     */
    description: z.string().optional(),
    /**
     * When the post last changed, for the sitemap's `<lastmod>`. Optional:
     * a post that was written once and never edited does not need one — its
     * date is the truth.
     */
    updated: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    /**
     * The one line the listing shows under the name: what the case is, in a
     * single clause. The cases have no page of their own any more — they are
     * panels in the listing on /projects/, and this is what the panel says.
     */
    line: z.string(),
    /**
     * What the panel's dialog opens with: fifty to a hundred words on what
     * the system was and what it moved.
     */
    description: z.string().optional(),
    /**
     * The period the work ran in, as the listing's when-column writes it.
     * The year is the one the case's own legacy copyright line carried.
     */
    period: z.string().optional(),
    /** The numbers the dialog shows under the description, when it has them. */
    metrics: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .default([]),
    /** Skills shown on the panel and counted for the recurring-skills chips. */
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts, projects };