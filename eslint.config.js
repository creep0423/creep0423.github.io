import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/', 'node_modules/', '.astro/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      // `.astro` files contain both a server-side frontmatter block (Node) and
      // client `<script>` blocks (browser).
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
