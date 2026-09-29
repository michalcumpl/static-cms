/** Every URL of a project, in one place (design.md decision 6). */
export interface ProjectPaths {
  overview: string;
  /** The editor for a page: `…/edit/` for the home page (empty slug), `…/edit/<slug>/` otherwise. */
  edit(slug?: string): string;
  /** Base path the preview renders with. */
  preview: string;
  /** GET/PUT the project's site document. */
  api: string;
  media(name: string): string;
}

export function projectPaths(projectId: string): ProjectPaths {
  const base = `/p/${projectId}/`;
  return {
    overview: base,
    edit: (slug = "") => (slug ? `${base}edit/${slug}/` : `${base}edit/`),
    preview: `${base}preview/`,
    api: `/api/projects/${projectId}/site`,
    media: (name) => `/api/projects/${projectId}/media/${encodeURIComponent(name)}`,
  };
}
