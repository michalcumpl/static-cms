import { fail, redirect } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { sayIn } from "$lib/i18n";
import { projectPaths } from "$lib/project-paths";
import { requireOwner } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { workspaces } from "$lib/server/db/schema";
import { startImport } from "$lib/server/import/job";
import { testHosts } from "$lib/server/import/test-hosts";
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
  /** Start empty: the starter site. */
  empty: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const name = String((await event.request.formData()).get("name") ?? "").trim();
    if (!name) return fail(400, { name, missing: true });
    const projectId = createProject(getDb(), event.params.workspace, name, undefined, user.id);
    redirect(303, projectPaths(projectId).edit());
  },
  /** Start from your current website: an import (site-import). */
  import: async (event) => {
    const user = requireOwner(event, event.params.workspace);
    const form = await event.request.formData();
    const address = String(form.get("address") ?? "");
    const started = startImport(
      getDb(),
      {
        workspaceId: event.params.workspace,
        userId: user.id,
        address,
        confirmed: form.get("confirm") === "on",
        locale: event.locals.locale,
      },
      { allowHosts: testHosts() },
    );
    if (!started.ok) {
      return fail(400, { address, importError: sayIn(event.locals.locale, started.message) });
    }
    redirect(303, `/w/${event.params.workspace}/imports/${started.importId}`);
  },
};
