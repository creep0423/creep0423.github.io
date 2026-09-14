# AI Tech Blog

[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Deploy](https://img.shields.io/badge/Deploy-GitHub_Pages-222222?logo=github&logoColor=white)](https://pages.github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A personal technical blog and portfolio focused on Large Language Models, RAG, AI Agents and Deep Learning.

It is a fully static site: Markdown in, HTML out, no database, no backend, no runtime. Content is
managed with Astro Content Collections, validated by a Zod schema at build time, and deployed to
GitHub Pages on every push to `main`.

**Live site:** `https://<your-username>.github.io/ai-tech-blog/` — replace with your own URL.

---

## Screenshot

<!-- Add a screenshot to public/images/ and reference it here, for example:
![Home page](./public/images/home.png)
![Article page](./public/images/article.png)
-->

_Screenshot placeholder — drop an image into `public/images/` and reference it above._

---

## Features

**Content**

- Type-safe Markdown blog powered by Astro Content Collections and a Zod frontmatter schema
- Draft posts that are visible in `astro dev` and filtered out of production builds
- Reading-time estimates that count CJK characters and Latin words separately
- Categories, tags, and a client-side tag filter with shareable `?tag=` URLs
- Instant client-side article search — pure DOM filtering, no index file and no backend
- Table of contents generated from the rendered headings, with scroll-based active highlighting
  (sticky sidebar on desktop, collapsible panel on mobile)
- Newer / older post navigation derived from the publication order

**Rendering**

- KaTeX math via `remark-math` + `rehype-katex`, including MathML output for screen readers
- Shiki syntax highlighting with dual light/dark themes (no highlighting JavaScript shipped)
- Hand-written article typography tuned for CJK reading: code blocks scroll internally, tables and
  display math never overflow the page

**Engineering**

- Light / dark theme that follows the system by default, remembers explicit choices, and applies
  before the first paint (no theme flash)
- Base-path safe: every internal link, asset, canonical URL, RSS item and sitemap entry respects
  GitHub Pages project paths — including links written inside Markdown
- SEO: per-page title/description, canonical URLs, Open Graph, Twitter Cards, `sitemap-index.xml`,
  RSS feed and a generated `robots.txt`
- TypeScript `strict`, `astro check`, ESLint (flat config) and Prettier — all enforced in CI
- Almost no JavaScript: the only scripts on the site are the theme toggle, the blog filter and the
  table-of-contents highlighter
- Semantic HTML, keyboard-accessible controls, skip link, visible focus rings, labelled icons

---

## Tech Stack

| Layer      | Choice                                                             |
| ---------- | ------------------------------------------------------------------ |
| Framework  | [Astro](https://astro.build) 7 (static output)                     |
| Language   | TypeScript 6 (`astro/tsconfigs/strict`)                            |
| Styling    | [Tailwind CSS](https://tailwindcss.com) 4 via `@tailwindcss/vite`  |
| Content    | Markdown + Astro Content Collections (`glob()` loader, Zod schema) |
| Math       | KaTeX through `remark-math` + `rehype-katex`                       |
| Highlight  | Shiki (built into Astro), dual light/dark themes                   |
| Icons      | [Lucide](https://lucide.dev) (`@lucide/astro`)                     |
| Feeds      | `@astrojs/rss`, `@astrojs/sitemap`                                 |
| Quality    | `@astrojs/check`, ESLint, Prettier + `prettier-plugin-astro`       |
| Deployment | GitHub Actions → GitHub Pages                                      |

No UI framework, no state management library, no CMS, no analytics and no comment system.

---

## Project Structure

```text
ai-tech-blog/
├── .github/
│   ├── dependabot.yml              # monthly npm + Actions update PRs
│   └── workflows/
│       └── deploy.yml              # type check → lint → build → deploy to Pages
├── public/
│   ├── favicon.svg
│   └── images/                     # screenshots, social preview image
├── src/
│   ├── components/
│   │   ├── BlogCard.astro          # article summary used by the home and blog pages
│   │   ├── Footer.astro
│   │   ├── GitHubIcon.astro        # inlined brand mark (Lucide dropped brand icons)
│   │   ├── Header.astro            # sticky nav, active-section state, mobile menu
│   │   ├── ProjectCard.astro
│   │   ├── SEO.astro               # title, canonical, Open Graph, Twitter Card
│   │   ├── TableOfContents.astro   # heading links + active-section highlighting
│   │   ├── Tag.astro
│   │   └── ThemeToggle.astro
│   ├── content/
│   │   └── blog/                   # one Markdown file per post
│   ├── content.config.ts           # collection + frontmatter schema
│   ├── config.ts                   # single source of truth for personal information
│   ├── data/
│   │   └── projects.ts             # portfolio entries
│   ├── layouts/
│   │   ├── BaseLayout.astro        # HTML shell, header/footer, SEO, theme bootstrap
│   │   └── BlogPostLayout.astro    # post header, article body, TOC, prev/next
│   ├── lib/
│   │   ├── posts.ts                # collection queries: published posts, tags, neighbours
│   │   ├── projects.ts             # project → link normalisation
│   │   ├── remark-base-links.mjs   # prefixes Markdown links with Astro's `base`
│   │   ├── url.ts                  # withBase() / absoluteUrl()
│   │   └── utils.ts                # reading time, date formatting
│   ├── pages/
│   │   ├── blog/
│   │   │   ├── [slug].astro        # article page (getStaticPaths)
│   │   │   └── index.astro         # article list, search and tag filter
│   │   ├── 404.astro
│   │   ├── about.astro
│   │   ├── index.astro             # hero, latest articles, featured projects, about preview
│   │   ├── projects.astro
│   │   ├── robots.txt.ts           # generated so the sitemap URL respects base
│   │   └── rss.xml.ts
│   └── styles/
│       ├── article.css             # article typography and code/math styling
│       └── global.css              # Tailwind entry, design tokens, theme variables
├── astro.config.mjs                # site/base resolution, integrations, Markdown pipeline
├── eslint.config.js
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Requirements

- Node.js **>= 22.12** (CI uses 24)
- npm (a `package-lock.json` is committed, so `npm ci` works out of the box)

### Install

```bash
npm install
```

### Development

```bash
npm run dev      # http://localhost:4321 — drafts are visible here
```

### Build

```bash
npm run build    # static output in dist/
```

### Preview the production build

```bash
npm run preview
```

### All scripts

| Script                 | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | Development server with HMR                       |
| `npm run build`        | Production build into `dist/`                     |
| `npm run preview`      | Serve the built site locally                      |
| `npm run check`        | `astro check` — TypeScript + Astro diagnostics    |
| `npm run lint`         | ESLint over `.astro`, `.ts`, `.js` and `.mjs`     |
| `npm run format`       | Prettier write (includes `prettier-plugin-astro`) |
| `npm run format:check` | Prettier check, used by CI                        |

---

## Configuration

### 1. Personal information — `src/config.ts`

Everything personal lives in this one file. Components read from it, so nothing is duplicated:

```ts
export const SITE: SiteConfig = {
  title: 'AI Tech Blog', // header, <title> suffix, RSS channel
  description: '...', // default meta description
  lang: 'zh-CN', // <html lang> and RSS <language>
  locale: 'zh_CN', // Open Graph locale
  url: 'http://localhost:4321', // fallback origin only
  author: 'Your Name',
  jobTitle: 'AI / LLM / Backend Developer',
  tagline: 'Exploring Large Language Models, RAG, AI Agents and Deep Learning.',
  techTags: ['LLM', 'RAG', 'AI Agent', 'PyTorch', 'Python'],
  github: 'https://github.com/yourname',
  email: 'your.email@example.com',
  ogImage: undefined, // set to '/images/og.png' to enable social previews
  keywords: ['LLM', 'RAG', 'AI Agent', 'Deep Learning', 'PyTorch', 'Machine Learning'],
};
```

`ABOUT` (bio, focus areas, skills) and `NAV` (header navigation) live in the same file.

### 2. Deployment URL and base path

**No GitHub username is hard-coded anywhere in the repository.** `astro.config.mjs` resolves the
canonical origin and base path in this order:

| Situation                                | Resolved `site`                             | Resolved `base`               |
| ---------------------------------------- | ------------------------------------------- | ----------------------------- |
| Local development                        | `http://localhost:4321`                     | `/`                           |
| GitHub Actions, project page             | `https://<owner>.github.io` (from the repo) | `/<repository-name>`          |
| GitHub Actions, `<owner>.github.io` repo | `https://<owner>.github.io`                 | `/`                           |
| `SITE_URL` set                           | that value                                  | `/` unless `BASE_PATH` is set |
| `SITE_URL` + `BASE_PATH` set             | that value                                  | that value (custom domain)    |

Inside GitHub Actions, `GITHUB_REPOSITORY` is provided automatically, so **a standard deploy needs no
configuration at all**. For a custom domain, set the values as repository variables
(**Settings → Secrets and variables → Actions → Variables**):

```text
SITE_URL  = https://blog.example.com
BASE_PATH = /            # or /ai-tech-blog for a project page
```

For a local build that must produce production URLs, copy `.env.example` to `.env` and fill it in.

Internal links always go through `withBase()` (`src/lib/url.ts`), and root-relative links written
inside Markdown are rewritten at build time by `src/lib/remark-base-links.mjs`, which prevents the
classic GitHub Pages project-page 404.

---

## Writing Articles

Create a Markdown file in `src/content/blog/`. The file name becomes the URL:

```text
src/content/blog/rag-from-scratch.md  →  /blog/rag-from-scratch/
```

### Frontmatter

```yaml
---
title: '从零理解 RAG：从 Embedding 到 Vector Database' # required
description: 'A one-line summary used on cards, in meta tags and in RSS.' # required
pubDate: 2026-03-02 # required
updatedDate: 2026-03-14 # optional, shown only when present
tags: ['RAG', 'Embedding', 'Vector DB'] # optional, defaults to []
category: 'RAG' # required
draft: false # optional, defaults to false
featured: false # optional, defaults to false, adds a badge
---
```

| Field         | Type       | Required | Default | Notes                                           |
| ------------- | ---------- | -------- | ------- | ----------------------------------------------- |
| `title`       | `string`   | yes      | —       | `<h1>`, `<title>` and card heading              |
| `description` | `string`   | yes      | —       | Cards, meta description, RSS item description   |
| `pubDate`     | date       | yes      | —       | Drives ordering and `article:published_time`    |
| `updatedDate` | date       | no       | —       | Displayed and emitted when present              |
| `tags`        | `string[]` | no       | `[]`    | Tag chips + `?tag=` filtering                   |
| `category`    | `string`   | yes      | —       | Single section, shown as metadata               |
| `draft`       | `boolean`  | no       | `false` | Visible in `dev`, hidden from production builds |
| `featured`    | `boolean`  | no       | `false` | Adds a "Featured" badge                         |

A malformed frontmatter block fails the build with a precise error — that is the point of the schema.

### Drafts

`draft: true` posts are rendered by `astro dev` (with a "Draft" badge) and excluded from
production. Because the RSS feed, sitemap, tag list and `getStaticPaths()` all read from
`getPublishedPosts()` in `src/lib/posts.ts`, a draft cannot leak into any of them.

### Markdown features

- **Math** — `$inline$` and `$$display$$`, rendered by KaTeX with MathML for accessibility
- **Code** — fenced blocks with a language tag are highlighted by Shiki; long lines scroll
  horizontally inside the block
- **Tables, blockquotes, task lists, footnotes** — GitHub-flavoured Markdown is on by default
- **Internal links** — write them root-relative (`/blog/`) and the base path is added for you
- **Images** — put files in `public/images/` and reference `/images/name.png` (also base-prefixed)

---

## Deployment (GitHub Pages)

### First-time setup

1. Create a repository on GitHub and push this project to its `main` branch.
2. Open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).
4. The site is available at:
   - `https://<user>.github.io/<repository>/` for a project page, or
   - `https://<user>.github.io/` if the repository is named `<user>.github.io`.

Nothing else is required: the workflow passes `GITHUB_REPOSITORY` to the build, and
`astro.config.mjs` derives both the canonical URL and the base path from it.

### Custom domain

1. Add the domain under **Settings → Pages → Custom domain** (this creates a `CNAME` file in the
   published artifact; you can also commit one to `public/`).
2. Add repository variables `SITE_URL` and `BASE_PATH` (see
   [Deployment URL and base path](#2-deployment-url-and-base-path)) so canonical URLs and the
   sitemap use the custom domain.

### Local checks before pushing

```bash
npm run check && npm run lint && npm run build
```

---

## GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main` and can also be started manually
(`workflow_dispatch`):

```text
checkout → setup Node 24 (npm cache) → npm ci
        → npm run check   (TypeScript + Astro diagnostics)
        → npm run lint    (ESLint)
        → npm run build   (static output in dist/)
        → actions/configure-pages
        → actions/upload-pages-artifact
        → actions/deploy-pages  (job 2, environment: github-pages)
```

- Permissions follow the GitHub Pages recommendation: `contents: read`, `pages: write`,
  `id-token: write`.
- `concurrency: pages` with `cancel-in-progress: false` means one deployment at a time and no
  half-finished deploys.
- A failing type check or lint stops the deployment, so `main` is always deployable.
- Dependabot (`.github/dependabot.yml`) opens monthly PRs for npm and Actions updates.

---

## Code Quality

```bash
npm run check        # astro check — 0 errors required
npm run lint         # ESLint flat config: @eslint/js, typescript-eslint, eslint-plugin-astro
npm run format       # Prettier, including .astro files via prettier-plugin-astro
npm run format:check # what CI uses
```

TypeScript runs in `strict` mode through `astro/tsconfigs/strict`, with the `@/*` path alias
pointing at `src/`.

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | Use for                                         |
| ----------- | ----------------------------------------------- |
| `feat:`     | a new feature                                   |
| `fix:`      | a bug fix                                       |
| `docs:`     | documentation only                              |
| `style:`    | formatting, no behaviour change                 |
| `refactor:` | code change that is neither a fix nor a feature |
| `perf:`     | performance improvements                        |
| `test:`     | adding or fixing tests                          |
| `build:`    | build system or dependencies                    |
| `ci:`       | CI configuration                                |
| `chore:`    | maintenance that fits nowhere else              |

Examples from this project's history:

```text
feat: add blog content collection
feat: add dark mode
feat: implement blog article page
ci: add GitHub Pages deployment
docs: update README
```

---

## Roadmap

Planned, in rough priority order:

- [ ] Optional MDX support via `@astrojs/mdx` (the collection loader already accepts `.mdx`)
- [ ] Generated Open Graph images per article (`astro-og-canvas` or Satori)
- [ ] `hreflang`-aware bilingual posts (English translations of selected articles)
- [ ] Reading progress indicator on article pages
- [ ] Related-posts section based on shared tags
- [ ] Lighthouse CI budget in the deploy workflow
- [ ] A "now" page for current work

Deliberately **not** planned: analytics, comments, authentication, a CMS or a database. The site is
a static artifact on purpose.

---

## License

[MIT](./LICENSE) © Your Name
