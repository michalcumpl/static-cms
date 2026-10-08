import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { parseEdit } from "$lib/image-edit";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { editImage, mediaItem } from "$lib/server/media";
import type { RequestHandler } from "./$types";

/**
 * What the crop dialog starts from: `{ key, width, height, originalName, source? }` for any
 * image of the project, removed from the library or not; `source` is `{ key, width, height,
 * turn, crop }` for an image made by editing another. 404 for others.
 */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  const item = mediaItem(getDb(), event.params.project, event.params.name);
  if (!item) notFound(event);
  const { key, width, height, originalName, source } = item;
  return json({ key, width, height, originalName, source });
};

/**
 * Makes a new image from this one (image-cropping design decision 1), sent as JSON
 * `{ turn, crop: { x, y, width, height } }`: 201 `{ key, width, height, originalName, source }`
 * for a new image, 200 for one the library already has, 400 or 404 `{ message }` when refused.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const { say } = i18n(event.locals.locale);
  let body: unknown;
  try {
    body = await event.request.json();
  } catch {
    error(400, "Expected a JSON edit.");
  }
  const edit = parseEdit(body);
  if (!edit) error(400, "Expected a JSON edit.");
  const result = await editImage(getDb(), event.params.project, user.id, event.params.name, edit);
  if (!result.ok) return json({ message: say(result.message) }, { status: result.status });
  const { key, width, height, originalName, source } = result.media;
  return json({ key, width, height, originalName, source }, { status: result.created ? 201 : 200 });
};
