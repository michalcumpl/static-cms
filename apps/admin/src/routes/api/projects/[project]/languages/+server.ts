import { error, json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { addLanguage, projectLanguages } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/** The project's languages: `[{ lang, name, primary, published }]`, the primary first. */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  return json(projectLanguages(getDb(), event.params.project));
};

/**
 * Adds `{ lang }` as a hidden copy of the primary language: 201 with the languages, 409 when
 * the project has it already, 400 for a language sites can't have.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    error(400, "Expected a JSON body.");
  }
  const lang = (body as { lang?: unknown } | null)?.lang;
  if (typeof lang !== "string") error(400, "Expected { lang }.");
  const result = addLanguage(getDb(), event.params.project, lang, user.id);
  if (!result.ok) {
    const status = result.reason === "exists" ? 409 : result.reason === "not-found" ? 404 : 400;
    return json({ message: result.message }, { status });
  }
  return json(projectLanguages(getDb(), event.params.project), { status: 201 });
};
