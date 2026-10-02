import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import {
  type LanguageChange,
  projectLanguages,
  removeLanguage,
  setLanguagePublished,
} from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

function answer(
  event: { locals: App.Locals },
  projectId: string,
  result: LanguageChange,
): Response {
  if (result.ok) return json(projectLanguages(getDb(), projectId));
  const status = result.reason === "not-found" ? 404 : 409;
  return json({ message: i18n(event.locals.locale).say(result.message) }, { status });
}

/** `{ published }` publishes or hides a language other than the primary. */
export const PATCH: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    error(400, "Expected a JSON body.");
  }
  const published = (body as { published?: unknown } | null)?.published;
  if (typeof published !== "boolean") error(400, "Expected { published }.");
  return answer(
    event,
    event.params.project,
    setLanguagePublished(getDb(), event.params.project, event.params.lang, published),
  );
};

/** Removes a language other than the primary, with its versions. */
export const DELETE: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  return answer(
    event,
    event.params.project,
    removeLanguage(getDb(), event.params.project, event.params.lang),
  );
};
