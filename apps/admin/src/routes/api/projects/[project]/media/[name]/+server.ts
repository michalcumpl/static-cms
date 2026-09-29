import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { requireMember } from "$lib/server/access";
import { projectMediaFile } from "$lib/server/project-media";
import type { RequestHandler } from "./$types";

/** A project's image, for members of its workspace only. */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const bytes = projectMediaFile(event.params.project, event.params.name);
  const type = contentType(event.params.name);
  if (!bytes || !type) error(404, "Not found");
  return new Response(bytes, { headers: { "content-type": type } });
};
