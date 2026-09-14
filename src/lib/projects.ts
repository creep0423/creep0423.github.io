import type { Project } from '@/data/projects';

export interface ProjectLink {
  label: string;
  href: string;
  external: boolean;
}

/**
 * Normalises a project's optional URLs into the links a card should render.
 * Absent URLs are skipped, so no dead "Demo" button is ever rendered.
 */
export function getProjectLinks(project: Project): ProjectLink[] {
  const links: ProjectLink[] = [];

  if (project.githubUrl) {
    links.push({ label: 'Source code', href: project.githubUrl, external: true });
  }
  if (project.demoUrl) {
    links.push({ label: 'Live demo', href: project.demoUrl, external: true });
  }

  return links;
}
