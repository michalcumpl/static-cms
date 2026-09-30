import { error, json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { listLibrary, MAX_UPLOAD_BYTES, uploadImage } from "$lib/server/media";
import type { RequestHandler } from "./$types";

/** The project's library: `[{ key, originalName, width, height, createdAt }]`, newest first. */
export const GET: RequestHandler = (event) => {
  requireMember(event, event.params.project, { api: true });
  return json(listLibrary(getDb(), event.params.project));
};

// Room for the multipart envelope around the file.
const MAX_BODY_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;
const TOO_BIG = { message: "Images can be at most 20 MB." };

/**
 * Uploads one image, sent as multipart `file`: 201 `{ key, width, height, originalName }` for a
 * new image, 200 for one the library already has, 413 or 415 `{ message }` when refused.
 */
export const POST: RequestHandler = async (event) => {
  const { user } = requireMember(event, event.params.project, { api: true });
  const length = Number(event.request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return json(TOO_BIG, { status: 413 });
  let form: FormData;
  try {
    form = await event.request.formData();
  } catch {
    error(400, "Expected a multipart form with a file.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) error(400, "Expected a multipart form with a file.");
  if (file.size > MAX_UPLOAD_BYTES) return json(TOO_BIG, { status: 413 });

  const result = await uploadImage(getDb(), event.params.project, user.id, {
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (!result.ok) return json({ message: result.message }, { status: result.status });
  const { key, width, height, originalName } = result.media;
  return json({ key, width, height, originalName }, { status: result.created ? 201 : 200 });
};
