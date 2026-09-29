import { error, json } from "@sveltejs/kit";
import { readSite, saveSite } from "$lib/server/site-store";
import type { RequestHandler } from "./$types";

/** `{ document, version, problems }` for the current working copy. */
export const GET: RequestHandler = async () => json(await readSite());

/**
 * Saves `{ document, baseVersion }`: 200 `{ version, problems }`, 409 when `baseVersion`
 * is outdated, 422 `{ problems }` when the document has structural errors.
 */
export const PUT: RequestHandler = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    error(400, "Expected a JSON body.");
  }
  const { document, baseVersion } = (body ?? {}) as Record<string, unknown>;
  if (document === undefined || typeof baseVersion !== "string") {
    error(400, "Expected { document, baseVersion }.");
  }
  const result = await saveSite(document, baseVersion);
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
