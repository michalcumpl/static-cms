import { imageFile, imageVariants, srcVariant } from "@static-cms/site";

/** Every URL of a project, in one place (design.md decision 6). */
export interface ProjectPaths {
  overview: string;
  /** The editor: `…/edit/` opens the home page, `…/edit/<page-id>/` a given page. */
  edit(pageId?: string): string;
  /** Base path the preview renders with. */
  preview: string;
  /** GET/PUT the project's site document. */
  api: string;
  /** GET the library, POST an upload. */
  library: string;
  media(name: string): string;
  /** An image's variant for showing it: `display` (up to 1600 px) or `thumbnail` (smallest). */
  image(key: string, width: number, use?: "display" | "thumbnail"): string;
}

export function projectPaths(projectId: string): ProjectPaths {
  const base = `/p/${projectId}/`;
  const media = (name: string) => `/api/projects/${projectId}/media/${encodeURIComponent(name)}`;
  return {
    overview: base,
    edit: (pageId = "") => (pageId ? `${base}edit/${pageId}/` : `${base}edit/`),
    preview: `${base}preview/`,
    api: `/api/projects/${projectId}/site`,
    library: `/api/projects/${projectId}/media`,
    media,
    image: (key, width, use = "display") =>
      media(
        imageFile(
          key,
          use === "display" ? (srcVariant(width) ?? width) : (imageVariants(width)[0] ?? width),
        ),
      ),
  };
}
