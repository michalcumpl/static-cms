import { notFound } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readSite } from "$lib/server/site-documents";
import { listVersions } from "$lib/server/versions";
import type { PageServerLoad } from "./$types";

/** The Overview: whether the saved site is valid (with its problems) and when it was last saved. */
export const load: PageServerLoad = async ({ params, parent, locals }) => {
  const { primaryLang } = await parent();
  const site = readSite(getDb(), params.project);
  if (!site) notFound({ locals });
  const newest = listVersions(getDb(), params.project, primaryLang, { limit: 1 })?.versions[0];
  return {
    valid: !site.problems.some((p) => p.severity === "error"),
    problems: site.problems,
    lastSaved: newest ? { at: newest.savedAt.toISOString(), by: newest.savedBy } : null,
  };
};
