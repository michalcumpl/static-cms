import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { deleteProject } from "$lib/server/project-deletion";
import type { RequestHandler } from "./$types";

/**
 * Owners: deletes the project with `{ name }`, its name as typed (project-deletion decision 4).
 * 204 when deleted; 422 when the name doesn't match; 502 `{ message }` when Netlify couldn't take
 * the website offline, in which case nothing is deleted.
 */
export const DELETE: RequestHandler = async (event) => {
  const { user, role, project } = requireMember(event, event.params.project, { api: true });
  const { t, say } = i18n(event.locals.locale);
  if (role !== "owner") error(403, t("server.ownersOnly"));
  const input = (await event.request.json().catch(() => ({}))) as { name?: unknown };
  // Exact, after trimming: case and diacritics count.
  if (typeof input.name !== "string" || input.name.trim() !== project.name.trim()) {
    return json({ message: t("server.deleteNameMismatch") }, { status: 422 });
  }
  const result = await deleteProject(getDb(), project.id, user.id);
  if (result.ok) return new Response(null, { status: 204 });
  if (result.reason === "not-found") notFound(event);
  return json({ message: say(result.message), reason: result.reason }, { status: 502 });
};
