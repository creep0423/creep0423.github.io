import { blogSeries, findSeries, type BlogSeries } from '@/data/series';
import { getPublishedPosts, type BlogPost } from '@/lib/posts';

/** A series together with its published posts, in reading order. */
export interface SeriesWithPosts extends BlogSeries {
  posts: BlogPost[];
}

/** The series a post belongs to, plus the navigation state for that post. */
export interface SeriesContext extends BlogSeries {
  /** Every published post of the series, in reading order. */
  posts: BlogPost[];
  /** Zero-based position of the current post inside `posts`. */
  index: number;
  /** The preceding part, when there is one. */
  previous?: BlogPost;
  /** The following part, when there is one. */
  next?: BlogPost;
}

/**
 * Orders the posts inside a single series.
 *
 * `seriesOrder` decides the order when both posts define it. A post that
 * declares a `series` but forgets `seriesOrder` is placed after the ordered
 * ones rather than failing the build, and remaining ties fall back to the
 * publication date so the result is always deterministic.
 */
function compareSeriesPosts(a: BlogPost, b: BlogPost): number {
  const orderA = a.data.seriesOrder;
  const orderB = b.data.seriesOrder;

  if (orderA !== undefined && orderB !== undefined && orderA !== orderB) {
    return orderA - orderB;
  }
  if (orderA !== undefined && orderB === undefined) return -1;
  if (orderA === undefined && orderB !== undefined) return 1;

  // Duplicate or missing order values: keep a stable, date-based fallback.
  const delta = a.data.pubDate.valueOf() - b.data.pubDate.valueOf();
  return delta !== 0 ? delta : a.id.localeCompare(b.id);
}

/** The published posts of one series, in reading order. */
export async function getSeriesPosts(slug: string): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => post.data.series === slug).sort(compareSeriesPosts);
}

/**
 * Every series that has at least one published post, in the order they are
 * declared in `src/data/series.ts`.
 *
 * Reading from `getPublishedPosts()` keeps the same draft filtering as the rest
 * of the blog: a series whose posts are all drafts simply does not appear.
 */
export async function getSeriesWithPosts(): Promise<SeriesWithPosts[]> {
  const posts = await getPublishedPosts();

  return blogSeries
    .map((series) => ({
      ...series,
      posts: posts.filter((post) => post.data.series === series.slug).sort(compareSeriesPosts),
    }))
    .filter((series) => series.posts.length > 0);
}

/**
 * Builds the series navigation state for one post, or `null` when the post is
 * not part of a (known) series.
 *
 * `posts` is passed in so callers that already loaded the published collection
 * — `getStaticPaths()`, for example — do not pay for a second read. An unknown
 * series id is reported once in development and otherwise ignored.
 */
export function getSeriesContext(posts: BlogPost[], post: BlogPost): SeriesContext | null {
  const slug = post.data.series;
  if (!slug) return null;

  const series = findSeries(slug);
  if (!series) {
    if (import.meta.env.DEV) {
      console.warn(
        `[series] "${post.id}" references the unknown series "${slug}". ` +
          'Add it to src/data/series.ts — no series UI will be rendered for this post.',
      );
    }
    return null;
  }

  const seriesPosts = posts
    .filter((candidate) => candidate.data.series === slug)
    .sort(compareSeriesPosts);
  const index = seriesPosts.findIndex((candidate) => candidate.id === post.id);

  return {
    ...series,
    posts: seriesPosts,
    index: Math.max(index, 0),
    previous: index > 0 ? seriesPosts[index - 1] : undefined,
    next: index >= 0 && index < seriesPosts.length - 1 ? seriesPosts[index + 1] : undefined,
  };
}
