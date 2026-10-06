import { problemHref } from "$lib/panel/problems";
import { designSummary, siteSummary } from "$lib/panel/summary";
import { projectPaths } from "$lib/project-paths";
import { notFound } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readSite } from "$lib/server/site-documents";
import type { PageServerLoad } from "./$types";

/**
 * The dashboard (control-panel design decision 3), for the primary language: the saved site's
 * problems, each with where it's fixed, and what the section cards say.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
  const site = readSite(getDb(), params.project);
  if (!site) notFound({ locals });
  const paths = projectPaths(params.project);
  // biome-ignore lint/suspicious/noExplicitAny: the saved document, read for summaries.
  const doc = site.document as any;
  return {
    valid: !site.problems.some((p) => p.severity === "error"),
    problems: site.problems.map((problem) => ({
      ...problem,
      href: problemHref(paths, doc, problem),
    })),
    summary: siteSummary(doc),
    design: designSummary(doc),
  };
};
