import { error } from "@sveltejs/kit";
import type { SiteData } from "$lib/editor/state.svelte";
import type { EditorTranslations } from "$lib/editor/translations";
import { projectPaths } from "$lib/project-paths";
import type { PageLoad } from "./$types";

// The settings are edited through the editor's own session and operations, which only exist in
// the browser (project-tabs design.md decision 3).
export const ssr = false;

/** The saved document of the language in `?lang=`, and the translations the editor state wants. */
export const load: PageLoad = async ({ fetch, params, parent, url }) => {
  const { lang, primaryLang } = await parent();
  const paths = projectPaths(params.project, lang === primaryLang ? undefined : lang);
  const [siteResponse, translationsResponse] = await Promise.all([
    fetch(paths.api),
    fetch(paths.translations),
  ]);
  if (!siteResponse.ok) error(siteResponse.status, "Could not load the site.");
  return {
    site: (await siteResponse.json()) as SiteData,
    translations: translationsResponse.ok
      ? ((await translationsResponse.json()) as EditorTranslations[])
      : [],
    focus: url.searchParams.get("focus"),
  };
};
