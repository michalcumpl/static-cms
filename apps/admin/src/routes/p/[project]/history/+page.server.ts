import { error } from "@sveltejs/kit";
import { getDb } from "$lib/server/app";
import { primaryLanguage, projectLanguages } from "$lib/server/site-documents";
import { listVersions } from "$lib/server/versions";
import type { PageServerLoad } from "./$types";

/** The first 50 versions of the language in `?lang=` (the primary without it). */
export const load: PageServerLoad = async ({ params, parent, url }) => {
  await parent(); // the layout's membership check runs first
  const primary = primaryLanguage(getDb(), params.project);
  const lang = url.searchParams.get("lang") ?? primary;
  const history = lang ? listVersions(getDb(), params.project, lang) : undefined;
  if (!lang || !history) error(404, "Not found");
  return {
    lang,
    primaryLang: primary,
    languages: projectLanguages(getDb(), params.project),
    history,
  };
};
