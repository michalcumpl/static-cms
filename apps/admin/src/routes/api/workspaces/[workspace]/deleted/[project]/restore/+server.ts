import { notFound, requireOwner } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { restoreProject } from "$lib/server/project-deletion";
import type { RequestHandler } from "./$types";

/** Owners: brings a deleted project of the workspace back, unpublished (decision 4). */
export const POST: RequestHandler = (event) => {
  requireOwner(event, event.params.workspace, { api: true });
  if (!restoreProject(getDb(), event.params.workspace, event.params.project)) notFound(event);
  return new Response(null, { status: 204 });
};
