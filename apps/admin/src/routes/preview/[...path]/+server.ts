import { exportSite } from "@static-cms/site";
import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { demoMedia, demoSite } from "$lib/server/demo";
import type { RequestHandler } from "./$types";

// Rendered links end in a slash (`/preview/kontakt/`); don't redirect them away.
export const trailingSlash = "ignore";

/** Serves the demo site's exported files, rendered for the `/preview/` base path. */
export const GET: RequestHandler = ({ params }) => {
  const result = exportSite(demoSite(), demoMedia(), { basePath: "/preview/" });
  if (!result.ok) {
    error(500, result.problems.map((p) => `${p.code}: ${p.message}`).join("\n"));
  }
  const path = params.path.replace(/\/+$/, "");
  const file = path === "" ? "index.html" : result.files.has(path) ? path : `${path}/index.html`;
  const bytes = result.files.get(file);
  const type = contentType(file);
  if (!bytes || !type) error(404, "Not found");
  return new Response(new Uint8Array(bytes), { headers: { "content-type": type } });
};
