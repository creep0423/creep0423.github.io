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
    title: 'Mini RAG System',
    description:
      'A complete RAG pipeline covering Document Loading, Chunking, Embedding, a Vector Database, the Retriever and LLM Generation.',
    highlights: [
      'Swappable chunking and embedding strategies behind a single pipeline interface',
      'Vector search with metadata filtering and configurable top-k retrieval',
      'Retrieval evaluation script that scores answers against a small labelled set',
    ],
    technologies: ['Python', 'LLM', 'Embedding', 'Vector DB', 'RAG'],
    githubUrl: repository('mini-rag-system'),
    // demoUrl: 'https://example.com/mini-rag-system',
    demoUrl: undefined,
    featured: true,
    year: '2025',
  },
  {
    title: 'AI Agent',
    description:
      'An AI agent supporting Tool Calling, task planning and reliable multi-step execution.',
    highlights: [
      'Tool registry with JSON-schema validation and structured error recovery',
      'Planner / executor loop with a bounded step budget and full execution trace',
      'Deterministic test suite that replays recorded tool outputs offline',
    ],
    technologies: ['Python', 'LLM', 'Tool Calling', 'Agent'],
    githubUrl: repository('ai-agent'),
    demoUrl: undefined,
    featured: true,
    year: '2025',
  },
  {
    title: 'LLM Playground',
    description:
      'An experiment tool for testing prompts, temperature and other model parameters side by side.',
    highlights: [
      'Side-by-side comparison of prompt variants and parameter settings',
      'Streaming responses with token usage and latency per run',
      'Exportable run history for reproducible experiments',
    ],
    technologies: ['Python', 'LLM', 'API'],
    githubUrl: repository('llm-playground'),
    demoUrl: undefined,
    featured: true,
    year: '2024',
  },
];

/** Projects marked as featured, in declaration order. */
export const featuredProjects = projects.filter((project) => project.featured);
