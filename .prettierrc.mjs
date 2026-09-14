/** @type {import('prettier').Config} */
export default {
  plugins: ['prettier-plugin-astro'],
  printWidth: 100,
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  // Never reflow prose: Chinese paragraphs and Markdown math must stay exactly
  // as the author wrote them.
  proseWrap: 'preserve',
};
