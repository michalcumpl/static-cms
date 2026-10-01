import { exportSiteLanguages, type Problem, usedMediaFiles } from "@static-cms/site";
import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { projectPaths } from "$lib/project-paths";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { mediaFiles } from "$lib/server/media";
import { readLanguages } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash (`…/preview/kontakt/`); don't redirect them away.
export const trailingSlash = "ignore";

/**
 * Serves the project's saved site in all its languages as exported files, rendered for its
 * preview base path (other languages under `<lang>/`).
 */
export const GET: RequestHandler = async (event) => {
  const { params } = event;
  requireMember(event, params.project);
  // Every language, hidden ones too, so they can be checked before they're published.
  const sites = readLanguages(getDb(), params.project, "all");
  if (sites.length === 0) error(404, "Not found");
  const paths = projectPaths(params.project);
  const names = new Set(sites.flatMap((site) => usedMediaFiles(site.document)));
  const media = await mediaFiles(params.project, [...names]);
  const result = exportSiteLanguages(
    sites.map(({ lang, document, primary }) => ({ lang, document, primary })),
    media,
    { basePath: paths.preview },
  );
  if (!result.ok) return problemsPage(result.problems, paths.edit());
  const path = params.path.replace(/\/+$/, "");
  const file = path === "" ? "index.html" : result.files.has(path) ? path : `${path}/index.html`;
  const bytes = result.files.get(file);
  const type = contentType(file);
  if (bytes && type) {
    return new Response(new Uint8Array(bytes), { headers: { "content-type": type } });
  }
  // What visitors of the published site see for addresses it doesn't have.
  const notFound = result.files.get("404.html");
  if (!notFound) error(404, "Not found");
  return new Response(new Uint8Array(notFound), {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ESCAPES[c] ?? c);

/** Shown instead of the site while the saved document can't be published. */
function problemsPage(problems: Problem[], editorHref: string): Response {
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
