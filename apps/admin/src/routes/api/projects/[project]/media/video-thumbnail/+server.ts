import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { uploadImage } from "$lib/server/media";
import { fetchVideoThumbnail } from "$lib/server/video-thumbnail";
import type { RequestHandler } from "./$types";

/**
 * Adds a video's thumbnail from YouTube or Vimeo to the library, sent as JSON `{ url }`: 201 or
 * 200 `{ key, width, height, originalName }` like an upload, 422 `{ message }` when the address
 * isn't a video or the provider has no thumbnail.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const { t, say } = i18n(event.locals.locale);
  let url: unknown;
  try {
    url = ((await event.request.json()) as { url?: unknown }).url;
  } catch {
    error(400, "Expected JSON with a url.");
  }
  if (typeof url !== "string") error(400, "Expected JSON with a url.");
  const thumbnail = await fetchVideoThumbnail(url);
  if (!thumbnail.ok) return json({ message: t("server.media.noThumbnail") }, { status: 422 });
  const result = await uploadImage(getDb(), event.params.project, user.id, thumbnail);
  if (!result.ok) return json({ message: say(result.message) }, { status: result.status });
  const { key, width, height, originalName } = result.media;
  return json({ key, width, height, originalName }, { status: result.created ? 201 : 200 });
};
