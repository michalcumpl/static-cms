/** Every URL of a project, in one place (design.md decision 6). */
export interface ProjectPaths {
  overview: string;
  /** The editor: `…/edit/` opens the home page, `…/edit/<page-id>/` a given page. */
  edit(pageId?: string): string;
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
    edit: (pageId = "") => (pageId ? `${base}edit/${pageId}/` : `${base}edit/`),
    preview: `${base}preview/`,
    api: `/api/projects/${projectId}/site`,
    media: (name) => `/api/projects/${projectId}/media/${encodeURIComponent(name)}`,
  };
}
