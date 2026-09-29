import { renderSite } from "@static-cms/site";
import { demoMediaNames } from "$lib/server/demo";
import { readSite } from "$lib/server/site-store";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const { document, problems } = await readSite();
  const valid = !problems.some((p) => p.severity === "error");
  const rendered = renderSite(document, { basePath: "/preview/" });
  const pages = rendered.ok
    ? rendered.site.pages.map((page) => ({ id: page.pageId, path: page.path, url: page.url }))
    : [];
  return { valid, problems, pages, mediaNames: demoMediaNames() };
};
