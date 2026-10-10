// Serving a project's site from an export, as the preview and version previews do
// (version-history design.md decision 2).

import { error } from "@sveltejs/kit";
import { exportSiteLanguages, type LanguageDocument } from "@webmio/export";
import { type Problem, usedMediaFiles } from "@webmio/model";
import { contentType } from "$lib/content-type";
import { siteFonts } from "./fonts";
import { mediaFiles } from "./media";

export interface PreviewOptions {
  /** Where the preview is served, e.g. `/p/<project>/preview/`. */
  basePath: string;
  /** Where the site's contact forms post: the admin's `/forms/<project>`. */
  formEndpoint?: string;
  /** The path inside the site that was asked for. */
  path: string;
  /** Where the problems page sends owners to fix them. */
  editHref: string;
  /** HTML shown at the top of every page, e.g. which version it is. */
  banner?: string;
}

/**
 * Exports the given languages with their images and fonts and answers with the file at `path`:
 * the page, the stylesheet, an image or a font, the site's own not-found page for addresses it doesn't have, and
 * the problems instead when the documents can't be exported.
 */
export async function servePreview(
  projectId: string,
  languages: readonly LanguageDocument[],
  options: PreviewOptions,
): Promise<Response> {
  if (languages.length === 0) error(404, "Not found");
  const names = new Set(languages.flatMap((language) => usedMediaFiles(language.document)));
  const media = await mediaFiles(projectId, [...names]);
  const fonts = await siteFonts(languages);
  const result = exportSiteLanguages(languages, media, {
    basePath: options.basePath,
    formEndpoint: options.formEndpoint,
    fonts,
  });
  if (!result.ok) return problemsPage(result.problems, options.editHref);
  const path = options.path.replace(/\/+$/, "");
  const file = path === "" ? "index.html" : result.files.has(path) ? path : `${path}/index.html`;
  const bytes = result.files.get(file);
  const type = contentType(file);
  if (bytes && type) return respond(bytes, type, 200, options.banner);
  // What visitors of the published site see for addresses it doesn't have.
  const notFound = result.files.get("404.html");
  if (!notFound) error(404, "Not found");
  return respond(notFound, "text/html; charset=utf-8", 404, options.banner);
}

function respond(bytes: Uint8Array, type: string, status: number, banner?: string): Response {
  if (banner && type.startsWith("text/html")) {
    const html = new TextDecoder().decode(bytes).replace(/<body>/, `<body>\n${banner}`);
    return new Response(html, { status, headers: { "content-type": type } });
  }
  return new Response(new Uint8Array(bytes), { status, headers: { "content-type": type } });
}

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** Shown instead of the site while the saved document can't be published. */
export function problemsPage(problems: Problem[], editorHref: string): Response {
  const items = problems
    .filter((p) => p.severity === "error")
    .map((p) => `<li><code>${escapeHtml(p.code)}</code> ${escapeHtml(p.message)}</li>`)
    .join("\n");
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Preview unavailable</title></head>
<body>
<h1>The site can't be previewed yet</h1>
<p>Fix these problems in the <a href="${escapeHtml(editorHref)}">editor</a>, then save:</p>
<ul>
${items}
</ul>
</body>
</html>
`;
  return new Response(html, {
    status: 422,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
