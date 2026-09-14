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
    slug: 'rag-from-zero',
    title: 'RAG 从入门到实战',
    description:
      '从 Embedding、Chunking、Vector Database 到完整 RAG Pipeline，系统理解 RAG 的核心原理与实践。',
  },
  {
    slug: 'transformer-from-zero',
    title: 'Transformer 从零理解',
    description: '从 Attention 到 Transformer 架构，逐步理解大语言模型背后的核心机制。',
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
