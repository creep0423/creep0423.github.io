import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '@/config';
import { getPublishedPosts } from '@/lib/posts';
import { absoluteUrl, withBase } from '@/lib/url';

/**
 * RSS feed at `/rss.xml`.
 *
 * Posts come from the same helper as every other page, so drafts are excluded
 * from production feeds automatically. Item links include the configured base
 * path, which keeps them correct on GitHub Pages project pages.
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    // The channel link must point at the deployed site root, base path included.
    site: absoluteUrl('/', context.site),
    customData: `<language>${SITE.lang}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: withBase(`/blog/${post.id}/`),
      categories: post.data.tags,
      author: SITE.email,
    })),
  });
};
