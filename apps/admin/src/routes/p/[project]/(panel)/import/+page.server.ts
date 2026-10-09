import { redirect } from "@sveltejs/kit";
import { problemHref } from "$lib/panel/problems";
import { projectPaths } from "$lib/project-paths";
import { notFound, requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { dismissReview, projectImport } from "$lib/server/import/job";
import { readSite } from "$lib/server/site-documents";
import type { Actions, PageServerLoad } from "./$types";

/**
 * The review of the import that made the project (site-import spec, "Import review"): what was
 * imported and left out, and the saved site's problems, each with where it is fixed.
 */
export const load: PageServerLoad = async ({ params, locals, parent }) => {
  await parent();
  const row = projectImport(getDb(), params.project);
  const site = readSite(getDb(), params.project);
  if (!row?.report || !site) notFound({ locals });
  const paths = projectPaths(params.project);
  // biome-ignore lint/suspicious/noExplicitAny: the saved document, read to locate problems.
  const doc = site.document as any;
  return {
    report: row.report,
    dismissed: row.reviewDismissed,
    problems: site.problems.map((problem) => ({
      ...problem,
      href: problemHref(paths, doc, problem),
    })),
  };
};

export const actions: Actions = {
  /** The owner has seen the review: the Overview stops linking to it. */
  dismiss: (event) => {
    requireMember(event, event.params.project);
    dismissReview(getDb(), event.params.project);
    redirect(303, projectPaths(event.params.project).dashboard);
  },
};
