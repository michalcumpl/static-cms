import { renderSite, usedMediaFiles } from "@static-cms/site";
import { error } from "@sveltejs/kit";
import { projectPaths } from "$lib/project-paths";
import { getDb } from "$lib/server/app";
import { projectLanguages, readSite } from "$lib/server/site-documents";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, parent }) => {
  await parent(); // the layout's membership check runs first
  const site = readSite(getDb(), params.project);
  if (!site) error(404, "Not found");
  const valid = !site.problems.some((p) => p.severity === "error");
  const rendered = renderSite(site.document, { basePath: projectPaths(params.project).preview });
  const pages = rendered.ok
    ? rendered.site.pages.map((page) => ({ id: page.pageId, path: page.path, url: page.url }))
    : [];
  // The ZIP download fetches only the image files the saved site uses.
  return {
    valid,
    problems: site.problems,
    pages,
    mediaFiles: usedMediaFiles(site.document),
    languages: projectLanguages(getDb(), params.project),
  };
};
