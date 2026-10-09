import { error } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readImport } from "$lib/server/import/job";
import type { PageServerLoad } from "./$types";

/** An import's progress page, for the person who started it (site-import, "Import progress"). */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  const row = readImport(getDb(), event.params.id, user.id);
  if (!row || row.workspaceId !== event.params.workspace) {
    error(404, i18n(event.locals.locale).t("server.notFound"));
  }
  return { importId: row.id, workspaceId: row.workspaceId, address: row.address };
};
