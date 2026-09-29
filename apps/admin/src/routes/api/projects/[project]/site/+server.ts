import { error, json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readSite, saveSite } from "$lib/server/site-documents";
import type { RequestHandler } from "./$types";

/** `{ document, version, problems }` for the project's current document. */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const site = readSite(getDb(), event.params.project);
  if (!site) error(404, "Not found");
  return json(site);
};

/**
 * Saves `{ document, baseVersion }`: 200 `{ version, problems }`, 409 when `baseVersion`
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
  const result = saveSite(getDb(), event.params.project, user.id, document, baseVersion);
  if (result.ok) return json({ version: result.version, problems: result.problems });
  if (result.reason === "conflict") {
    return json(
      {
        message:
          "The site was changed elsewhere since you opened it. Reload to get the latest version.",
      },
      { status: 409 },
    );
  }
  return json({ problems: result.problems }, { status: 422 });
};
