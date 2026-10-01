import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { restoreVersion } from "$lib/server/versions";
import type { RequestHandler } from "./$types";

/**
 * Restores a version as its language's new current version: 200 `{ lang }`, 404 for a version
 * of another project or none, 409 when the language changed since `{ baseVersion }` (when sent),
 * 422 `{ problems }` for a broken document.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const body = (await event.request.json().catch(() => ({}))) as { baseVersion?: unknown };
  const baseVersion = typeof body.baseVersion === "string" ? body.baseVersion : undefined;
  const result = restoreVersion(
    getDb(),
    event.params.project,
    event.params.version,
    user.id,
    baseVersion,
  );
  if (result.ok) return json({ lang: result.lang });
  if (result.reason === "not-found") return json({ message: "Not found" }, { status: 404 });
  if (result.reason === "conflict") {
    return json(
      { message: "The site was changed meanwhile. Reload the history and try again." },
      { status: 409 },
    );
  }
  return json({ problems: "problems" in result ? result.problems : [] }, { status: 422 });
};
