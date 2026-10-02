import { json } from "@sveltejs/kit";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { primaryLanguage } from "$lib/server/site-documents";
import { listVersions } from "$lib/server/versions";
import type { RequestHandler } from "./$types";

/**
 * A language's versions (`?lang=`, the primary without it), newest first, 50 at a time;
 * `?before=<version>` continues below that version. `{ versions, more }`.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const lang = event.url.searchParams.get("lang") ?? primaryLanguage(getDb(), event.params.project);
  const before = event.url.searchParams.get("before") ?? undefined;
  const result = lang ? listVersions(getDb(), event.params.project, lang, { before }) : undefined;
  if (!result) notFound(event);
  return json(result);
};
