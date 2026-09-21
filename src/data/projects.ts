import { SITE } from '@/config';

export interface Project {
  /** Project name. */
  title: string;
  /** One or two sentence summary. */
  description: string;
  /** What the project actually does — rendered as a short list. */
  highlights: string[];
  /** Technologies shown as tags. */
  technologies: string[];
  /** Repository URL. */
  githubUrl: string;
  /** Live demo URL. Leave undefined when there is nothing to link to. */
  demoUrl?: string;
  /** Featured projects are highlighted on the home page. */
  featured: boolean;
  /** Rough timeframe, rendered as metadata. */
  year: string;
}

/**
 * Repository URLs are derived from `SITE.github` so the GitHub account lives in
 * exactly one place (`src/config.ts`).
 */
const owner = SITE.github.replace(/\/+$/, '');
const repository = (name: string) => `${owner}/${name}`;

export const projects: Project[] = [
  {
    title: 'Contract Intelligence',
    description:
      '面向企业合同履约与风险审查场景的智能助手，围绕合同解析、混合检索、证据引用与风险分析构建完整 RAG 链路。',
    highlights: [
      '基于 BGE-M3、Milvus Dense + BM25 Hybrid Search 与 Reranker 构建 Parent-Child Retrieval',
      '使用 FastAPI + WebSocket 实现流式问答，并加入权限隔离、引用溯源与 Trace',
      '支持补充协议覆盖、合同版本治理及评测 / UAT 回归验证',
    ],
    technologies: ['Python', 'RAG', 'LangChain', 'Milvus', 'BGE', 'FastAPI'],
    githubUrl: repository('contract-intelligence'),
    demoUrl: undefined,
    featured: true,
    year: '2026',
  },
];

/** Projects marked as featured, in declaration order. */
export const featuredProjects = projects.filter((project) => project.featured);
