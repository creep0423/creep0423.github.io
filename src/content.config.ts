import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// `z` is re-exported by `astro/zod` rather than `astro:content`, which still
// exposes a deprecated alias kept only for backwards compatibility.
import { z } from 'astro/zod';

/**
 * Blog collection.
 *
 * Files live in `src/content/blog/`. The entry `id` is derived from the file
 * path, so `rag-intent-to-answer.md` becomes the URL
 * `/blog/rag-intent-to-answer/`.
 */
const blog = defineCollection({
  loader: glob({
    // `.mdx` is listed so that adding the `@astrojs/mdx` integration is a
    // one-line change in `astro.config.mjs` (see the README roadmap).
    pattern: '**/*.{md,mdx}',
    base: './src/content/blog',
  }),
  schema: z.object({
    /** Post title, rendered as `<h1>` and in `<title>`. */
    title: z.string(),
    /** Short summary used on cards, in meta tags and in the RSS feed. */
    description: z.string(),
    /** First publication date. */
    pubDate: z.coerce.date(),
    /** Last significant revision; shown only when present. */
    updatedDate: z.coerce.date().optional(),
    /** Topics, rendered as tags and used for filtering. */
    tags: z.array(z.string()).default([]),
    /** Single section the post belongs to. */
    category: z.string(),
    /**
     * Id of the series this post belongs to, matching a `slug` in
     * `src/data/series.ts`. Unknown ids are ignored at render time.
     */
    series: z.string().optional(),
    /**
     * Position of the post inside its series, ascending. Optional: a post that
     * declares a `series` without an order is listed after the ordered ones.
     */
    seriesOrder: z.number().int().positive().optional(),
    /** Drafts are hidden from production builds. */
    draft: z.boolean().default(false),
    /** Highlighted on the home page when true. */
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
