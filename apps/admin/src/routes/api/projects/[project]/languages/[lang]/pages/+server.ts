import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { copyPageToLanguage } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/**
 * Copies `{ from, pageId }` (a page of the language `from`, as last saved) into this language:
 * 201 `{ pageId, title }`, 409 when the language has the page already or changed meanwhile,
 * 404 for an unknown language or page.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    error(400, "Expected a JSON body.");
  }
  const { from, pageId } = (body ?? {}) as Record<string, unknown>;
  if (typeof from !== "string" || typeof pageId !== "string") {
    error(400, "Expected { from, pageId }.");
  }
  const result = copyPageToLanguage(
    getDb(),
    event.params.project,
    from,
    pageId,
    event.params.lang,
    user.id,
  );
  if (result.ok) return json({ pageId: result.pageId, title: result.title }, { status: 201 });
  return json(
    { message: i18n(event.locals.locale).say(result.message) },
    { status: result.reason === "not-found" ? 404 : 409 },
  );
};
