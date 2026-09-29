import { error } from "@sveltejs/kit";
import { contentType } from "$lib/content-type";
import { demoMediaFile, demoSiteJson } from "$lib/server/demo";
import type { RequestHandler } from "./$types";

/** Serves the raw demo fixture: `demo-site.json` and `media/<name>`. Nothing else. */
export const GET: RequestHandler = ({ params }) => {
  if (params.file === "demo-site.json") {
    return new Response(demoSiteJson(), {
      headers: { "content-type": contentType("x.json") ?? "" },
    });
  }
  const name = params.file.startsWith("media/") ? params.file.slice("media/".length) : undefined;
  const bytes = name === undefined ? undefined : demoMediaFile(name);
  const type = name === undefined ? undefined : contentType(name);
  if (!bytes || !type) error(404, "Not found");
  return new Response(bytes, { headers: { "content-type": type } });
};
