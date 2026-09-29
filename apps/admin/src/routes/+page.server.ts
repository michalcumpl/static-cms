import { renderSite, validateSite } from "@static-cms/site";
import { demoMediaNames, demoSite } from "$lib/server/demo";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = () => {
  const doc = demoSite();
  const { valid, problems } = validateSite(doc);
  const rendered = renderSite(doc, { basePath: "/preview/" });
  const pages = rendered.ok
    ? rendered.site.pages.map((page) => ({ id: page.pageId, path: page.path, url: page.url }))
    : [];
  return { valid, problems, pages, mediaNames: demoMediaNames() };
};
