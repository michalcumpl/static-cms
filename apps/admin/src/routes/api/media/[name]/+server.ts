import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { demoMediaFile } from "$lib/server/demo";
import type { RequestHandler } from "./$types";

/** Image files the site can reference. Until uploads exist (M3), these are the fixture's media. */
export const GET: RequestHandler = ({ params }) => {
  const bytes = demoMediaFile(params.name);
  const type = contentType(params.name);
  if (!bytes || !type) error(404, "Not found");
  return new Response(bytes, { headers: { "content-type": type } });
};
