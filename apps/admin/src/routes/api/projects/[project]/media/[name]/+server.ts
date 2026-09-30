import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { mediaFile, removeFromLibrary } from "$lib/server/media";
import type { RequestHandler } from "./$types";

/** One of the project's published image files (`<key>-<width>.webp`), for members only. */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const bytes = mediaFile(event.params.project, event.params.name);
  const type = contentType(event.params.name);
  if (!bytes || !type) error(404, "Not found");
  return new Response(bytes, { headers: { "content-type": type } });
};

/** Removes the image with this media key from the library; its files stay. 204, or 404. */
export const DELETE: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  if (!removeFromLibrary(getDb(), event.params.project, event.params.name)) {
    error(404, "Not found");
  }
  return new Response(null, { status: 204 });
};
