// @ts-check
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { loadEnv } from 'vite';

import { remarkBaseLinks } from './src/lib/remark-base-links.mjs';

/**
 * Deployment URL and base path are resolved from the environment so that no
 * GitHub username is ever hard-coded in this repository.
 *
 * Resolution order for the site origin:
 *   1. `SITE_URL`            — explicit override (.env file, shell or CI variable)
 *   2. `GITHUB_REPOSITORY`   — set automatically by GitHub Actions ("owner/repo")
 *   3. local development     — http://localhost:4321
 *
 * Resolution order for the base path:
 *   1. `BASE_PATH`           — explicit override
 *   2. `/`                   — when `SITE_URL` is set (custom domain / user page)
 *   3. `/<repository-name>`  — project pages on `<owner>.github.io`
 *   4. `/`                   — local development
 */
const mode = process.env.NODE_ENV === 'development' ? 'development' : 'production';
/** Values from `.env` files are lower priority than real CI/shell variables. */
const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

/**
 * Normalises a base path into the shape Astro expects: it must start with a
 * slash and must not end with one (`/` itself is the only valid exception).
 *
 * @param {string | undefined} value
 * @returns {string}
 */
function normalizeBase(value) {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

function resolveDeployment() {
  const [owner, repository] = (env.GITHUB_REPOSITORY ?? '').split('/');
  const isUserPage = Boolean(owner) && repository === `${owner}.github.io`;
  const repositoryBase = repository && !isUserPage ? `/${repository}` : '/';

  // `?.trim() || fallback` rather than `??`: CI passes unset repository
  // variables as empty strings, which must fall through to the default.
  const siteUrl = env.SITE_URL?.trim();
  const basePath = env.BASE_PATH?.trim();

  const site =
    siteUrl || (owner ? `https://${owner.toLowerCase()}.github.io` : 'http://localhost:4321');
  const base = basePath || (siteUrl ? '/' : repositoryBase);

  return { site, base: normalizeBase(base) };
}

const { site, base } = resolveDeployment();

// https://astro.build/config
export default defineConfig({
  site,
  base,

  // `@astrojs/sitemap` needs an absolute `site`; the draft filter lives in
  // `src/lib/posts.ts`, and the 404 page must never be indexed.
  integrations: [sitemap({ filter: (page) => !page.replace(/\/$/, '').endsWith('/404') })],

  markdown: {
    // Astro 7 ships the native "Sätteri" processor by default. KaTeX is driven
    // by remark/rehype plugins, so the unified processor is selected explicitly
    // (the documented alternative, not the deprecated top-level plugin arrays).
    processor: unified({
      // `remarkBaseLinks` keeps root-relative links written inside Markdown
      // working on GitHub Pages project pages.
      remarkPlugins: [remarkMath, [remarkBaseLinks, { base }]],
      rehypePlugins: [[rehypeKatex, { strict: false }]],
    }),
    shikiConfig: {
      // Dual themes: Shiki emits `--shiki-dark*` custom properties which
      // `src/styles/article.css` swaps in when the `.dark` class is present.
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
