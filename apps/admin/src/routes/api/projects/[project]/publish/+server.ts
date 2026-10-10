import { json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { startPublish } from "$lib/server/publishing/publish";
import type { RequestHandler } from "./$types";

/**
 * Publishes the saved site: 202 `{ id }` while it deploys in the background; 409 `{ message }`
 * when the workspace isn't connected or a publish is running; 422 `{ problems }` with errors.
 */
export const POST: RequestHandler = (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const { locale, say } = i18n(event.locals.locale);
  const result = startPublish(getDb(), event.params.project, user.id, {
    locale,
    adminOrigin: event.url.origin,
  });
  if (result.ok) return json({ id: result.publishId }, { status: 202 });
  if (result.reason === "not-found") notFound(event);
  if (result.reason === "invalid") return json({ problems: result.problems }, { status: 422 });
  return json({ message: say(result.message), reason: result.reason }, { status: 409 });
};
