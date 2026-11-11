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
    description: z.string().optional(),
    /**
     * When the case was written, for the date line under its title. Optional
     * and unset on every case at the moment: the year in the case's own
     * legacy copyright line is the fallback. The field is declared so that a
     * case which wants a date of its own can carry one — without it the
     * schema strips the line and the page can never read it.
     */
    date: z.string().optional(),
    /** Skills shown on the card and counted for the recurring-skills chips. */
    tags: z.array(z.string()).default([]),
    /** When the case study last changed, for the sitemap's `<lastmod>`. */
    updated: z.string().optional(),
  }),
});

export const collections = { posts, projects };