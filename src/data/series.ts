/**
 * Blog series registry.
 *
 * Posts reference a series by its stable `slug` (see the `series` field in
 * `src/content.config.ts`); this file maps that id to the public title and
 * description.
 *
 * Keeping the id separate from the (Chinese) title means the title can be
 * reworded — or translated — without breaking `/series/<slug>/` URLs, and it
 * keeps frontmatter ASCII-safe.
 */
export interface BlogSeries {
  /** Stable identifier used in frontmatter and in the `/series/<slug>/` URL. */
  slug: string;
  /** Public name, shown on the series pages and on article pages. */
  title: string;
  /** One-line summary, used as the page description and the SEO description. */
  description: string;
}

export const blogSeries: BlogSeries[] = [
  {
    slug: 'production-rag',
    title: '从 Demo 到 Production RAG',
    description:
      '从 Production RAG 主链路出发，覆盖 Hybrid Search、多轮 Query Rewrite、动态 RetrievalPlan，以及证据、引用与置信度设计。',
  },
];

/**
 * Looks up a series definition by its id.
 *
 * Returns `undefined` for unknown ids so that a typo in frontmatter degrades to
 * "no series UI" instead of breaking the build.
 */
export function findSeries(slug: string): BlogSeries | undefined {
  return blogSeries.find((item) => item.slug === slug);
}
