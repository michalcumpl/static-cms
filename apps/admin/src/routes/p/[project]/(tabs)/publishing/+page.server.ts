import { notFound } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { readSite } from "$lib/server/site-documents";
import type { PageServerLoad } from "./$types";

/** Whether the saved site is valid: the ZIP download is refused while it has errors. */
export const load: PageServerLoad = async ({ params, parent, locals }) => {
  await parent();
  const site = readSite(getDb(), params.project);
  if (!site) notFound({ locals });
  return { valid: !site.problems.some((p) => p.severity === "error") };
};
