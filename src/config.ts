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
  /** Author name, used by the SEO metadata, the RSS channel and the footer. */
  author: string;
  /** Job title, used by the SEO fallback title and the About page hero. */
  jobTitle: string;
  /**
   * Home hero eyebrow: the short greeting above the positioning statement.
   * Kept apart from `author`, because the nickname shown on the home page does
   * not belong in metadata, the footer or the About page.
   */
  heroEyebrow: string;
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
  author: 'CREEP',
  jobTitle: 'AI / LLM Application Engineer',
  heroEyebrow: "Hi, I'm CREEP 👋",
  // The home page `<h1>`. One sentence, with a point of view.
  //
  // The line break in the hero comes from the sentence comma (see
  // `src/pages/index.astro`): browsers break Chinese text between any two
  // characters, so a headline left to wrap on its own can split a word in half.
  // `headlineAccent` is the phrase that carries the hero accent colour; the
  // final full stop is part of it so the accented line ends cleanly.
  headline: '比答案更重要的，是它从何而来。',
  headlineAccent: '从何而来。',
  tagline: '探索 LLM、RAG 与 AI Agent 背后的原理、方法与边界。',
  techTags: ['LLM', 'RAG', 'AI Agent', 'GraphRAG', 'Deep Learning', 'Model Evaluation'],
  github: 'https://github.com/creep0423',
  email: 'creephanhan@gmail.com',
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
  /** Areas of interest, rendered on the About page. */
  focus: FocusArea[];
  /** Skill keywords, rendered as tags on the About page. */
  skills: string[];
}

export const ABOUT: AboutConfig = {
  bio: [
    '我主要关注如何把大语言模型真正放进复杂任务中：让它获取可靠的上下文、连接知识与数据、调用工具，并在明确的工作流中完成判断与执行。相比让模型“给出一个答案”，我更关心这个答案从哪里来、经过了什么过程，以及它是否值得被信任。',
    '这个博客记录我在构建 AI 应用过程中的问题、方法与思考。从 RAG、AI Agent 到 Knowledge Graph 与 Model Evaluation，我会尝试把一个想法做成可以运行的系统，再回头理解哪些设计真正有效，哪些只是在理想条件下成立。',
    '我喜欢可读的代码、清晰的系统边界和能够被验证的技术结论。对我来说，一个系统为什么失败、证据在哪里丢失、决策如何形成，往往和它最终能不能跑起来一样重要。',
  ],
  focus: [
    {
      title: 'Large Language Models',
      description:
        '关注模型的上下文能力、推理与生成行为，以及如何把通用模型能力转化为可用的应用能力。',
    },
    {
      title: 'RAG & Knowledge Systems',
      description:
        '探索 Chunking、Embedding、Hybrid Retrieval、Reranking、GraphRAG，以及知识如何被组织、检索并最终成为模型判断的依据。',
    },
    {
      title: 'AI Agents & Workflows',
      description:
        '关注 Tool Calling、任务规划、状态管理与多步工作流，以及 Agent 如何在有约束的任务中可靠地执行和协作。',
    },
    {
      title: 'Deep Learning & Model Evaluation',
      description:
        '学习 Transformer、Deep Learning 与 PyTorch，也关注如何通过 Evaluation 理解模型真正做对了什么、又会在哪里失效。',
    },
    {
      title: 'AI Systems Engineering',
      description:
        '关注 API、数据流、权限、可观测性与服务集成，让模型、数据和业务逻辑能够组成真正可运行、可维护的系统。',
    },
  ],
  skills: [
    'Python',
    'LangChain',
    'LangGraph',
    'RAG',
    'GraphRAG',
    'AI Agent',
    'MCP',
    'Knowledge Graph',
    'FastAPI',
    'Docker',
  ],
};

export interface AboutPreviewConfig {
  /** Introduction paragraph, rendered in the home page's About preview. */
  intro: string;
  /** Areas of interest, rendered beside the intro on the home page. */
  focus: FocusArea[];
}

/**
 * Home page About preview.
 *
 * Kept apart from `ABOUT` on purpose: the home page carries a short positioning
 * paragraph and four areas of interest, while `/about/` keeps its longer bio,
 * five areas and the skills list. The two are edited on their own schedules.
 */
export const ABOUT_PREVIEW: AboutPreviewConfig = {
  intro:
    '关注大语言模型如何获取可靠的上下文、连接知识与数据、调用工具，以及它们在复杂任务中的能力边界。这里记录对 LLM、RAG、AI Agent 与相关方法的学习、实践与思考。',
  focus: [
    {
      title: 'Large Language Models',
      description:
        '关注模型的上下文能力、推理与生成行为，以及通用模型能力如何转化为可用的应用能力。',
    },
    {
      title: 'RAG & Knowledge Systems',
      description:
        '探索检索、Embedding、Reranking 与 GraphRAG，以及知识如何被组织并成为模型判断的依据。',
    },
    {
      title: 'AI Agents & Workflows',
      description: '探索 Tool Calling、任务规划与多步工作流，以及 Agent 在复杂任务中的执行方式。',
    },
    {
      title: 'Deep Learning & Model Evaluation',
      description: '关注 Transformer、Deep Learning、PyTorch 与模型能力评测。',
    },
  ],
};
