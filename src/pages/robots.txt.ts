import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/url';

/**
 * `robots.txt` is generated rather than served from `public/`, because the
 * sitemap URL depends on the deployment origin and base path that are resolved
 * from the environment at build time.
 *
 * Note: crawlers only honour `robots.txt` at the domain root. On a project page
 * (`https://<user>.github.io/<repo>/`) this file is still useful for tools and
 * for custom domains, but it cannot restrict the whole `github.io` host.
 */
export const GET: APIRoute = ({ site }) => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl('/sitemap-index.xml', site)}`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
