import { contentType } from "$lib/content-type";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { mediaFile, removeFromLibrary } from "$lib/server/media";
import type { RequestHandler } from "./$types";

/** One of the project's published media files (variants, icons, share images), for members only. */
export const GET: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  const bytes = await mediaFile(event.params.project, event.params.name);
  const type = contentType(event.params.name);
  if (!bytes || !type) notFound(event);
  return new Response(bytes, { headers: { "content-type": type } });
};

/** Removes the image with this media key from the library; its files stay. 204, or 404. */
export const DELETE: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  if (!removeFromLibrary(getDb(), event.params.project, event.params.name)) {
    notFound(event);
  }
  return new Response(null, { status: 204 });
};
