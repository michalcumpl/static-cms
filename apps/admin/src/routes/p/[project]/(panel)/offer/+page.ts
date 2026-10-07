import { loadSection } from "$lib/editor/section-load";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, parent, url }) => {
  const { lang, primaryLang } = await parent();
  return loadSection({ fetch, projectId: params.project, lang, primaryLang, url });
};
