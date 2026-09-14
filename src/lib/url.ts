import { SITE } from '@/config';

/**
 * Astro's configured `base` (`/` by default, `/repository-name/` for GitHub
 * Pages project pages). Astro does not rewrite internal links for you, so every
 * site-relative link and asset path goes through `withBase()`.
 */
const BASE = import.meta.env.BASE_URL;

/**
 * Prefixes a site-relative path with the configured base path.
 *
 * @example
 * withBase('/blog/') // '/ai-tech-blog/blog/' on a project page, '/blog/' locally
 */
export function withBase(path = '/'): string {
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE;
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}` || '/';
}

/**
 * Builds an absolute URL for canonical tags, Open Graph metadata, RSS and the
 * sitemap. Falls back to `SITE.url` when `Astro.site` is not configured.
 */
export function absoluteUrl(path = '/', site?: URL | string | null): string {
  const origin = site ? site.toString() : SITE.url;
  return new URL(withBase(path), origin).href;
}
