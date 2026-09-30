import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { restorePublish } from "$lib/server/publishing/publish";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/** Makes an earlier publish live again. 200, 404, 409 (not connected) or 502 (Netlify). */
export const POST: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  try {
    const result = await restorePublish(getDb(), event.params.project, event.params.publish);
    if (result.ok) return json({ ok: true });
    return json({ message: result.message }, { status: result.reason === "not-found" ? 404 : 409 });
  } catch (err) {
    if (err instanceof PublishError) return json({ message: err.message }, { status: 502 });
    throw err;
  }
};
