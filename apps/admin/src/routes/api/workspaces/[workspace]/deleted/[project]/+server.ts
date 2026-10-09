import { notFound, requireOwner } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { purgeProject } from "$lib/server/project-deletion";
import type { RequestHandler } from "./$types";

/** Owners: Delete now, removing a deleted project of the workspace for good (decision 4). */
export const DELETE: RequestHandler = async (event) => {
  requireOwner(event, event.params.workspace, { api: true });
  if (!(await purgeProject(getDb(), event.params.workspace, event.params.project))) {
    notFound(event);
  }
  return new Response(null, { status: 204 });
};
