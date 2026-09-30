import { error, json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { startPublish } from "$lib/server/publishing/publish";
import type { RequestHandler } from "./$types";

/**
 * Publishes the saved site: 202 `{ id }` while it deploys in the background; 409 `{ message }`
 * when the workspace isn't connected or a publish is running; 422 `{ problems }` with errors.
 */
export const POST: RequestHandler = (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const result = startPublish(getDb(), event.params.project, user.id);
  if (result.ok) return json({ id: result.publishId }, { status: 202 });
  if (result.reason === "not-found") error(404, "Not found");
  if (result.reason === "invalid") return json({ problems: result.problems }, { status: 422 });
  return json({ message: result.message, reason: result.reason }, { status: 409 });
};
