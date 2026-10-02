import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readSite, saveSite } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/** The language asked for with `?lang=`, or undefined for the primary. */
const languageOf = (url: URL) => url.searchParams.get("lang") ?? undefined;

/**
 * `{ document, version, problems }` for the project's current document in `?lang=` (the
 * primary language without it); another language comes with the primary's shared fields.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const site = readSite(getDb(), event.params.project, languageOf(event.url));
  if (!site) notFound(event);
  return json(site);
};

/**
 * Saves `{ document, baseVersion }` in `?lang=` (the primary without it): 200
 * `{ version, problems }`, 409 when `baseVersion`
 * is outdated, 422 `{ problems }` when the document has structural errors, 400 for a
 * malformed body.
 */
export const PUT: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    error(400, "Expected a JSON body.");
  }
  const { document, baseVersion } = (body ?? {}) as Record<string, unknown>;
  if (document === undefined || typeof baseVersion !== "string") {
    error(400, "Expected { document, baseVersion }.");
  }
  const lang = languageOf(event.url);
  if (lang !== undefined && !readSite(getDb(), event.params.project, lang)) notFound(event);
  const result = saveSite(getDb(), event.params.project, user.id, document, baseVersion, lang);
  if (result.ok) return json({ version: result.version, problems: result.problems });
  if (result.reason === "conflict") {
    return json(
      { message: i18n(event.locals.locale).t("server.site.changedElsewhere") },
      { status: 409 },
    );
  }
  return json({ problems: result.problems }, { status: 422 });
};
