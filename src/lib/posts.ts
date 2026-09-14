import { getCollection, type CollectionEntry } from 'astro:content';

/** A single blog entry, including its validated frontmatter and raw body. */
export type BlogPost = CollectionEntry<'blog'>;

/** Newest first; ties are broken by id so ordering stays deterministic. */
function byNewestFirst(a: BlogPost, b: BlogPost): number {
  const delta = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  return delta !== 0 ? delta : a.id.localeCompare(b.id);
}

/**
 * Returns every post that should be visible in the current environment,
 * newest first.
 *
 * Drafts stay visible while running `astro dev` so they can be previewed, and
 * are filtered out of production builds — which also keeps them out of the RSS
 * feed, the sitemap, `getStaticPaths()` and the tag list, because all of those
 * read from this function.
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getCollection('blog', ({ data }) => !import.meta.env.PROD || !data.draft);
  return posts.sort(byNewestFirst);
}

/**
 * Published posts marked `featured: true`, newest first — the home page list.
 *
 * Drafts are already filtered out by `getPublishedPosts()`, so a featured draft
 * cannot reach production.
 */
export async function getFeaturedPosts(limit?: number): Promise<BlogPost[]> {
  const posts = await getPublishedPosts();
  const featured = posts.filter((post) => post.data.featured);
  return limit === undefined ? featured : featured.slice(0, limit);
}

export interface PostNeighbours {
  /** The next newer post, when one exists. */
  newer?: BlogPost;
  /** The next older post, when one exists. */
  older?: BlogPost;
}

/**
 * Resolves the neighbouring posts for a post inside the newest-first list.
 * `index` is the position of the current post in that list.
 */
export function getNeighbours(posts: BlogPost[], index: number): PostNeighbours {
  return {
    newer: index > 0 ? posts[index - 1] : undefined,
    older: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Unique tags across the given posts, alphabetically sorted. */
export function getTagCounts(posts: BlogPost[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/** Categories used by the given posts, alphabetically sorted. */
export function getCategories(posts: BlogPost[]): string[] {
  return [...new Set(posts.map((post) => post.data.category))].sort((a, b) => a.localeCompare(b));
}
