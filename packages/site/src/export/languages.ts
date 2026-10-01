// Several languages as one site (languages design.md decision 5): the primary at the base path,
// the others under `<lang>/`, with one sitemap listing every page and its alternates.

import { RenderContext, type SiteLanguage } from "../render/context.js";
import { escapeHtml } from "../render/html.js";
import { languageName } from "../render/strings.js";
import type { SiteDocument } from "../schema/index.js";
import { type Problem, validateSite } from "../validate/index.js";
import { type ExportOptions, type ExportResult, exportSite } from "./index.js";

export interface LanguageDocument {
  lang: string;
  document: unknown;
  primary: boolean;
}

/** A problem with the language's name in front, so owners know which version to fix. */
const inLanguage = (lang: string, problem: Problem): Problem => ({
  ...problem,
  message: `${languageName(lang)}: ${problem.message}`,
});

/**
 * Exports a site in several languages into one file tree. The primary language contributes the
 * shared files (stylesheet, robots.txt, favicon, 404.html); every language its pages, each with
 * alternates and a language switcher; media is merged. With one language this is `exportSite`.
 */
export function exportSiteLanguages(
  languages: readonly LanguageDocument[],
  media: ReadonlyMap<string, Uint8Array>,
  options: ExportOptions = {},
): ExportResult {
  const primary = languages.find((l) => l.primary) ?? languages[0];
  if (!primary) throw new Error("A site needs at least one language.");
  if (languages.length === 1) return exportSite(primary.document, media, options);

  const failed = languages.flatMap(({ lang, document }) =>
    validateSite(document)
      .problems.filter((p) => p.severity === "error")
      .map((p) => inLanguage(lang, p)),
  );
  if (failed.length > 0) return { ok: false, problems: failed };

  const basePath = options.basePath ?? "/";
  const ordered = [primary, ...languages.filter((l) => l !== primary)];
  const siteLanguages: SiteLanguage[] = ordered.map(({ lang, document }) => {
    const languageBase = lang === primary.lang ? basePath : `${basePath}${lang}/`;
    const ctx = new RenderContext(document as SiteDocument, languageBase);
    const pages = new Map<string, string>();
    for (const pageId of ctx.site.pages.nodes) {
      pages.set(ctx.node(pageId, "page").translation_key, ctx.pageUrl(pageId));
    }
    return {
      lang,
      name: languageName(lang),
      basePath: languageBase,
      primary: lang === primary.lang,
      pages,
      home: ctx.pageUrl(ctx.homeId),
    };
  });

  const files = new Map<string, Uint8Array>();
  const warnings: Problem[] = [];
  for (const [index, { lang, document }] of ordered.entries()) {
    const language = siteLanguages[index] as SiteLanguage;
    const result = exportSite(document, media, {
      ...options,
      basePath: language.basePath,
      // One stylesheet, one set of images and icons, at the site's root for every language.
      assetBasePath: basePath,
      languages: siteLanguages,
      // `_redirects` lives once, at the root, and holds every language's redirects.
      redirects: language.primary ? options.redirects : undefined,
    });
    if (!result.ok) return { ok: false, problems: result.problems.map((p) => inLanguage(lang, p)) };
    warnings.push(...result.warnings.map((p) => inLanguage(lang, p)));
    for (const [path, bytes] of result.files) {
      if (language.primary) files.set(path, bytes);
      else if (path.endsWith("index.html")) files.set(`${lang}/${path}`, bytes);
      else if (path.startsWith("assets/images/")) files.set(path, bytes);
    }
  }

  const site = (primary.document as SiteDocument).nodes[
    (primary.document as SiteDocument).document_id
  ];
  const baseUrl = options.siteUrl ?? (site?.type === "site" ? site.base_url : "");
  if (baseUrl !== "") {
    files.set("sitemap.xml", new TextEncoder().encode(sitemap(baseUrl, siteLanguages)));
  }
  const sorted = new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { ok: true, files: sorted, warnings };
}

/** Every page of every language, each with its counterparts as `xhtml:link` alternates. */
function sitemap(baseUrl: string, languages: readonly SiteLanguage[]): string {
  const base = baseUrl.replace(/\/+$/, "");
  const entries = languages.flatMap((language) =>
    [...language.pages].map(([key, url]) => {
      const alternates = languages.flatMap((other) => {
        const otherUrl = other.pages.get(key);
        return otherUrl === undefined
          ? []
          : [
              `    <xhtml:link rel="alternate" hreflang="${escapeHtml(other.lang)}" href="${escapeHtml(base + otherUrl)}"/>\n`,
            ];
      });
      return `  <url>\n    <loc>${escapeHtml(base + url)}</loc>\n${alternates.join("")}  </url>\n`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("")}</urlset>
`;
}
