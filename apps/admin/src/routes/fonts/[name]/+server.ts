import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { fontFile } from "$lib/server/fonts";
import type { RequestHandler } from "./$types";

/**
 * A font file or licence of the site fonts, for the editor canvas and the in-browser ZIP. They are
 * public, open-licence files that only change with a package upgrade, so they are cached long.
 */
export const GET: RequestHandler = async ({ params }) => {
  const bytes = await fontFile(params.name);
  const type = contentType(params.name);
  if (!bytes || !type) error(404, "Not found");
  return new Response(bytes, {
    headers: { "content-type": type, "cache-control": "public, max-age=86400" },
  });
};
