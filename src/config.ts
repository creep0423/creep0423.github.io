/**
 * Single source of truth for every piece of personal / site-wide information.
 *
 * Components never hard-code names, links or e-mail addresses — they import
 * from this file, so re-branding the site is a one-file change.
 *
 * NOTE: the canonical deployment URL is *not* stored here. It is resolved from
 * the environment in `astro.config.mjs` (see the README) and is available in
 * every page as `Astro.site`.
 */

export interface NavItem {
  /** Visible label. */
  label: string;
  /** Site-relative path, resolved against the configured `base`. */
  href: string;
}

export interface SiteConfig {
  /** Site name: rendered in the header, the `<title>` suffix and the RSS channel. */
  title: string;
  /** Default meta description, also used as the RSS channel description. */
  description: string;
  /** BCP-47 language tag for `<html lang>` and the RSS `<language>` element. */
  lang: string;
  /** Open Graph locale, e.g. `zh_CN` or `en_US`. */
  locale: string;
  /** Fallback origin, only used when `Astro.site` is unavailable. */
  url: string;
  /** Author name, used by SEO metadata, the RSS channel and the home hero. */
  author: string;
  /** Job title, shown next to the author name in the hero section. */
  jobTitle: string;
  /**
   * One-sentence positioning statement: the `<h1>` of the home page, and the
   * most prominent line on the whole site.
   *
   * Most visitors arrive from a shared article and do not know the name yet, so
   * this states what you build or why the blog exists rather than who you are.
   * The home hero renders one line per sentence comma; see `index.astro`.
   */
  headline: string;
  /**
   * Optional phrase inside `headline` that is rendered in the hero accent
   * colour. Kept as a separate string so the headline itself stays plain text
   * (it is also used as the page's most important text node, not as markup).
   * Trailing punctuation belongs in the phrase: it closes the accented line.
   */
  headlineAccent?: string;
  /**
   * Supporting line under the headline: what the blog covers, and for whom.
   * Also used as the `og:image` alt text, so it has to stand on its own.
   */
  tagline: string;
  /** Technologies highlighted as tags in the hero section. */
  techTags: string[];
  /** Public GitHub profile URL. */
  github: string;
  /** Public contact e-mail address. */
  email: string;
  /** Optional 1200×630 social preview image, relative to `public/`. */
  ogImage?: string;
  /** Extra keywords for the default meta keywords tag. */
  keywords: string[];
}

export const SITE: SiteConfig = {
  title: 'AI Tech Blog',
  description:
    'A personal technical blog and portfolio focused on Large Language Models, RAG, AI Agents and Deep Learning.',
  lang: 'zh-CN',
  locale: 'zh_CN',
  url: 'http://localhost:4321',
  author: 'Your Name',
  jobTitle: 'AI / LLM / Backend Developer',
  // The home page `<h1>`. One sentence, with a point of view.
  //
  // The line break in the hero comes from the sentence comma (see
  // `src/pages/index.astro`): browsers break Chinese text between any two
  // characters, so a headline left to wrap on its own can split a word in half.
  // `headlineAccent` is the phrase that carries the hero accent colour; the
  // final full stop is part of it so the accented line ends cleanly.
  headline: '从原理到工程，把大模型真正做成系统。',
  headlineAccent: '真正做成系统。',
  tagline: '记录 LLM、RAG 与 Agent 的原理、实现、实验与踩坑。',
  techTags: ['LLM', 'RAG', 'AI Agent', 'PyTorch', 'Python'],
  github: 'https://github.com/yourname',
  email: 'your.email@example.com',
  // Add a file to `public/images/` and point this at it to enable the
  // `og:image` / `twitter:image` tags, e.g. '/images/og-default.png'.
  ogImage: undefined,
  keywords: ['LLM', 'RAG', 'AI Agent', 'Deep Learning', 'PyTorch', 'Machine Learning'],
};

/** Primary navigation, rendered by `src/components/Header.astro`. */
export const NAV: NavItem[] = [
  { label: 'Blog', href: '/blog/' },
  { label: 'Series', href: '/series/' },
  { label: 'Projects', href: '/projects/' },
  { label: 'About', href: '/about/' },
];

export interface FocusArea {
  title: string;
  description: string;
}

export interface AboutConfig {
  /** Introduction paragraphs, rendered in order on the About page. */
  bio: string[];
  /** Areas of interest, rendered on the About page and the home page preview. */
  focus: FocusArea[];
  /** Skill keywords, rendered as tags on the About page. */
  skills: string[];
}

export const ABOUT: AboutConfig = {
  bio: [
    "I'm an AI engineer who enjoys building things end to end — from the data pipeline to the interface in front of it. Most of my time goes into large language models: how they retrieve context, how they call tools, and how far they can be trusted.",
    'This blog is where I write down what I learn while building. Posts are usually written from scratch — implementing an idea first, then explaining the parts that were not obvious the first time around.',
    'I care about readable code, clear explanations and small systems that are easy to reason about.',
  ],
  focus: [
    {
      title: 'Large Language Models',
      description: 'Prompting, fine-tuning and inference trade-offs across open and hosted models.',
    },
    {
      title: 'Retrieval-Augmented Generation',
      description: 'Chunking strategies, embeddings, vector search and grounding quality.',
    },
    {
      title: 'AI Agents',
      description: 'Tool calling, task planning and reliable multi-step execution.',
    },
    {
      title: 'Deep Learning',
      description: 'Transformer internals and applied PyTorch experiments.',
    },
    {
      title: 'Backend Engineering',
      description: 'APIs, packaging, CI/CD and the infrastructure that keeps demos running.',
    },
  ],
  skills: ['Python', 'PyTorch', 'LLM', 'RAG', 'Git', 'Docker', 'TypeScript'],
};
