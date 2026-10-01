import { error } from "@sveltejs/kit";
import { projectPaths } from "$lib/project-paths";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { servePreview } from "$lib/server/preview";
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
  return servePreview(
    params.project,
    sites.map(({ lang, document, primary }) => ({ lang, document, primary })),
    { basePath: paths.preview, path: params.path, editHref: paths.edit() },
  );
};
