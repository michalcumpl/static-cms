import { exportSite, type Problem } from "@static-cms/site";
import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { projectPaths } from "$lib/project-paths";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { projectMedia } from "$lib/server/project-media";
import { readSite } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash (`…/preview/kontakt/`); don't redirect them away.
export const trailingSlash = "ignore";

/** Serves the project's saved site as exported files, rendered for its preview base path. */
export const GET: RequestHandler = (event) => {
  const { params } = event;
  requireMember(event, params.project);
  const site = readSite(getDb(), params.project);
  if (!site) error(404, "Not found");
  const paths = projectPaths(params.project);
  const result = exportSite(site.document, projectMedia(params.project), {
    basePath: paths.preview,
  });
  if (!result.ok) return problemsPage(result.problems, paths.edit());
  const path = params.path.replace(/\/+$/, "");
  const file = path === "" ? "index.html" : result.files.has(path) ? path : `${path}/index.html`;
  const bytes = result.files.get(file);
  const type = contentType(file);
  if (!bytes || !type) error(404, "Not found");
  return new Response(new Uint8Array(bytes), { headers: { "content-type": type } });
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
