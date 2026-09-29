import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { projectPaths } from "$lib/project-paths";
import { requireOwner } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { workspaces } from "$lib/server/db/schema";
import { createProject } from "$lib/server/site-documents";
import type { Actions, PageServerLoad } from "./$types";

function workspaceName(id: string): string {
  return (
    getDb().select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, id)).get()
      ?.name ?? ""
  );
}

export const load: PageServerLoad = (event) => {
  requireOwner(event, event.params.workspace);
  return { workspace: { id: event.params.workspace, name: workspaceName(event.params.workspace) } };
};

export const actions: Actions = {
  default: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const name = String((await event.request.formData()).get("name") ?? "").trim();
    if (!name) return fail(400, { name, missing: true });
    const projectId = createProject(getDb(), event.params.workspace, name, undefined, user.id);
    redirect(303, projectPaths(projectId).edit());
  },
};
