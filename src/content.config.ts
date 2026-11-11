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
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    /** Skills shown on the card and counted for the recurring-skills chips. */
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { posts, projects };