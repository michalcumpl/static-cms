import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { projectTranslations } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/**
 * Every language's pages (`{ key, pageId, title, slug, home }`) and, for the languages other than
 * the primary, the pages not translated yet and the primary's pages they're missing.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  return json(projectTranslations(getDb(), event.params.project));
};
