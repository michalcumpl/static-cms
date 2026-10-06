import { getDb } from "$lib/server/app";
import { projectTranslations } from "$lib/server/site-documents";
import type { PageServerLoad } from "./$types";

/** What each language other than the primary still lacks, for the Languages tab. */
export const load: PageServerLoad = async ({ params, parent }) => {
  await parent();
  return { translations: projectTranslations(getDb(), params.project) };
};
