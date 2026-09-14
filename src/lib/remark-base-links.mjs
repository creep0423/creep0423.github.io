/**
 * Remark plugin: prefix root-relative links and images with Astro's `base`.
 *
 * Astro rewrites `href` values it renders itself (components go through
 * `withBase()`), but URLs written inside Markdown are plain strings. Without
 * this plugin `[Blog](/blog/)` in an article would resolve to
 * `https://<user>.github.io/blog/` instead of
 * `https://<user>.github.io/<repository>/blog/` — a 404 on project pages.
 *
 * Only root-relative URLs are touched: absolute (`https://…`), protocol
 * relative (`//…`), relative (`./…`, `../…`), fragment (`#…`) and already
 * prefixed URLs are left exactly as the author wrote them.
 *
 * @typedef {object} Node
 * @property {string} [type]
 * @property {string} [url]
 * @property {Node[]} [children]
 *
 * @typedef {object} Options
 * @property {string} [base] Base path as configured in `astro.config.mjs`.
 */

/**
 * @param {Options} [options]
 * @returns {(tree: Node) => void}
 */
export function remarkBaseLinks(options = {}) {
  const rawBase = (options.base ?? '/').trim();
  const base = rawBase === '' || rawBase === '/' ? '' : `/${rawBase.replace(/^\/+|\/+$/g, '')}`;

  /**
   * @param {Node} node
   */
  function walk(node) {
    if (
      base !== '' &&
      (node.type === 'link' ||
        node.type === 'image' ||
        node.type === 'definition' ||
        node.type === 'linkReference') &&
      typeof node.url === 'string' &&
      node.url.startsWith('/') &&
      // `//example.com` is protocol-relative, not root-relative.
      !node.url.startsWith('//') &&
      node.url !== base &&
      !node.url.startsWith(`${base}/`)
    ) {
      node.url = `${base}${node.url}`;
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  }

  return walk;
}

export default remarkBaseLinks;
