import { imageFile, imageVariants, srcVariant } from "@static-cms/site";

/** Every URL of a project, in one place (design.md decision 6). */
export interface ProjectPaths {
  overview: string;
  /** The editor: `…/edit/` opens the home page, `…/edit/<page-id>/` a given page. */
  edit(pageId?: string): string;
  /** Base path the preview renders with. */
  preview: string;
  /** GET/PUT the project's site document (in a language with `?lang=`). */
  api: string;
  /** GET the published languages' documents and media names, for the ZIP download. */
  exportInput: string;
  /** GET the project's languages, POST adds one. */
  languages: string;
  /** PATCH publishes or hides a language, DELETE removes it. */
  language(lang: string): string;
  /** POST copies a page into a language. */
  copyPage(lang: string): string;
  /** GET every language's pages and what each still needs. */
  translations: string;
  /** The History page of the language (`?lang=` for other languages than the primary). */
  history: string;
  /** Base path of a version's read-only preview. */
  version(versionId: string): string;
  /** GET a language's versions; POST `…/<version>/restore` restores one. */
  versions: string;
  restoreVersion(versionId: string): string;
  /** GET the library, POST an upload. */
  library: string;
  media(name: string): string;
  /** An image's variant for showing it: `display` (up to 1600 px) or `thumbnail` (smallest). */
  image(key: string, width: number, use?: "display" | "thumbnail"): string;
  /** The project's Publishing page. */
  publishing: string;
  /** POST starts a publish. */
  publish: string;
  /** GET the address, domain and publishes. */
  publishes: string;
  restore(publishId: string): string;
  /** PUT/DELETE the custom domain; `domainCheck` checks it now. */
  domain: string;
  domainCheck: string;
}

/**
 * A project's URLs. With `lang` (a language other than the primary), the editor's addresses and
 * the site API carry `?lang=`; the other paths are the same for every language.
 */
export function projectPaths(projectId: string, lang?: string): ProjectPaths {
  const base = `/p/${projectId}/`;
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  const media = (name: string) => `/api/projects/${projectId}/media/${encodeURIComponent(name)}`;
  return {
    overview: base,
    edit: (pageId = "") => (pageId ? `${base}edit/${pageId}/${query}` : `${base}edit/${query}`),
    preview: `${base}preview/`,
    api: `/api/projects/${projectId}/site${query}`,
    exportInput: `/api/projects/${projectId}/export-input`,
    languages: `/api/projects/${projectId}/languages`,
    language: (lang) => `/api/projects/${projectId}/languages/${encodeURIComponent(lang)}`,
    copyPage: (lang) => `/api/projects/${projectId}/languages/${encodeURIComponent(lang)}/pages`,
    translations: `/api/projects/${projectId}/translations`,
    history: `${base}history${query}`,
    version: (versionId) => `${base}history/${versionId}/`,
    versions: `/api/projects/${projectId}/versions${query}`,
    restoreVersion: (versionId) => `/api/projects/${projectId}/versions/${versionId}/restore`,
    library: `/api/projects/${projectId}/media`,
    publishing: `${base}publishing/`,
    publish: `/api/projects/${projectId}/publish`,
    publishes: `/api/projects/${projectId}/publishes`,
    restore: (publishId) => `/api/projects/${projectId}/publishes/${publishId}/restore`,
    domain: `/api/projects/${projectId}/domain`,
    domainCheck: `/api/projects/${projectId}/domain/check`,
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
