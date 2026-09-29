import type { SiteDocument } from "../schema/index.js";
import type { Problem } from "../validate/index.js";
import { problem, validateSite } from "../validate/index.js";
import { isValidBasePath, RenderContext } from "./context.js";
import { siteCss } from "./css.js";
import { renderPage } from "./page.js";

export { isValidBasePath } from "./context.js";
export { type SiteCssOptions, siteCss } from "./css.js";

export interface RenderOptions {
  /** Where the site is served from: `/` (default) or a subdirectory like `/preview/`. */
  basePath?: string;
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
  /** In site order; the first page is the home page. */
  pages: RenderedPage[];
  /** Contents of `assets/style.css`. */
  css: string;
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
  const validation = validateSite(input);
  if (!validation.valid) return { ok: false, problems: validation.problems };

  const doc = input as SiteDocument;
  const ctx = new RenderContext(doc, basePath);
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
  return { ok: true, site: { pages, css }, warnings: validation.problems };
}
