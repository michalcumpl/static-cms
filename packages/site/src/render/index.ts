import type { SiteDocument } from "../schema/index.js";
import { isValidBaseUrl } from "../validate/domain.js";
import type { Problem } from "../validate/index.js";
import { problem, validateSite } from "../validate/index.js";
import { isValidBasePath, RenderContext, type SiteLanguage } from "./context.js";
import { siteCss } from "./css.js";
import { renderNotFound, renderPage } from "./page.js";

export { isValidBasePath, type SiteLanguage } from "./context.js";
export { fontPreviewCss, type SiteCssOptions, siteCss } from "./css.js";

export interface RenderOptions {
  /** Where the site is served from: `/` (default) or a subdirectory like `/preview/`. */
  basePath?: string;
  /**
   * Where the site's shared files (stylesheet, images, icons) are, when not at `basePath`: the
   * site's root, for a language rendered under `/<lang>/`.
   */
  assetBasePath?: string;
  /**
   * The site's address, like `https://anideti.cz`, when it is known (published sites). Pages
   * then get canonical links.
   */
  siteUrl?: string;
  /**
   * The site's languages with their pages, when it has several: every page then gets
   * `hreflang` alternates and a language switcher. The rendered document is one of them.
   */
  languages?: readonly SiteLanguage[];
}

export interface RenderedPage {
  pageId: string;
  /** Output file path relative to the site root: `index.html`, `kontakt/index.html`. */
  path: string;
  /** The URL the page is linked at, including the base path. */
  url: string;
  html: string;
}

export interface RenderedSite {
  /** In site order. The home page is the one at `index.html`, wherever it is listed. */
  pages: RenderedPage[];
  /** Contents of `assets/style.css`. */
  css: string;
  /** The page for addresses the site doesn't have, exported as `404.html`. */
  notFound: string;
}

export type RenderResult =
  | { ok: true; site: RenderedSite; warnings: Problem[] }
  | { ok: false; problems: Problem[] };

/** Validates a site document and renders every page plus the stylesheet. */
export function renderSite(input: unknown, options: RenderOptions = {}): RenderResult {
  const basePath = options.basePath ?? "/";
  if (!isValidBasePath(basePath)) {
    return {
      ok: false,
      problems: [
        problem(
          "error",
          "invalid-base-path",
          "",
          `Base path "${basePath}" must start and end with "/", like "/" or "/preview/".`,
        ),
      ],
    };
  }
  if (options.assetBasePath !== undefined && !isValidBasePath(options.assetBasePath)) {
    return {
      ok: false,
      problems: [
        problem(
          "error",
          "invalid-base-path",
          "",
          `Base path "${options.assetBasePath}" must start and end with "/", like "/" or "/preview/".`,
        ),
      ],
    };
  }
  if (options.siteUrl !== undefined && !isValidBaseUrl(options.siteUrl)) {
    return {
      ok: false,
      problems: [
        problem(
          "error",
          "invalid-site-url",
          "",
          `Site address "${options.siteUrl}" must be an absolute http(s) URL, like "https://anideti.cz".`,
        ),
      ],
    };
  }
  const validation = validateSite(input);
  if (!validation.valid) return { ok: false, problems: validation.problems };

  const doc = input as SiteDocument;
  const ctx = new RenderContext(
    doc,
    basePath,
    options.siteUrl?.replace(/\/+$/, ""),
    options.languages,
    options.assetBasePath ?? basePath,
  );
  const pages = ctx.site.pages.nodes.map((pageId): RenderedPage => {
    const route = ctx.routes.get(pageId);
    if (!route) throw new Error(`Page ${pageId} has no route.`);
    return {
      pageId,
      path: route.path,
      url: ctx.pageUrl(pageId),
      html: renderPage(ctx.node(pageId, "page"), ctx).value,
    };
  });
  const css = siteCss(ctx.node(ctx.site.theme, "theme"));
  const notFound = renderNotFound(ctx).value;
  return { ok: true, site: { pages, css, notFound }, warnings: validation.problems };
}
