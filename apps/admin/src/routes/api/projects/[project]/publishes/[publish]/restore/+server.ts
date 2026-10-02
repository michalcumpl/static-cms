import { json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { restorePublish } from "$lib/server/publishing/publish";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/** Makes an earlier publish live again. 200, 404, 409 (not connected) or 502 (Netlify). */
export const POST: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  const { say } = i18n(event.locals.locale);
  try {
    const result = await restorePublish(getDb(), event.params.project, event.params.publish);
    if (result.ok) return json({ ok: true });
    return json(
      { message: say(result.message) },
      { status: result.reason === "not-found" ? 404 : 409 },
    );
  } catch (err) {
    if (err instanceof PublishError) return json({ message: say(err.said) }, { status: 502 });
    throw err;
  }
};
