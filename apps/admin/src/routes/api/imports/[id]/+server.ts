import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readImport } from "$lib/server/import/job";
import type { RequestHandler } from "./$types";

/**
 * An import's state for its progress page (site-import spec, "Import progress"): what it is
 * doing, and where its review is once done, or why it failed. Only for the person who started it.
 */
export const GET: RequestHandler = (event) => {
  const user = requireUser(event, { api: true });
  const row = readImport(getDb(), event.params.id, user.id);
  if (!row) error(404, i18n(event.locals.locale).t("server.notFound"));
  return json({
    state: row.state,
    progress: row.progress,
    error: row.error,
    review: row.projectId ? projectPaths(row.projectId).importReview : null,
  });
};
