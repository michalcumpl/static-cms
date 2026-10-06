import { error } from "@sveltejs/kit";
import type { SiteData } from "$lib/editor/state.svelte";
import type { EditorTranslations } from "$lib/editor/translations";
import { projectPaths } from "$lib/project-paths";

// The Business section and the Website section's site settings are edited through the editor's
// own session and operations, which only run in the browser (control-panel design decision 2):
// their pages load with this and show the section's screen in the browser only.

/** The saved document of the language in `?lang=`, and the translations the editor state wants. */
export async function loadSection({
  fetch,
  projectId,
  lang,
  primaryLang,
  url,
}: {
  fetch: typeof globalThis.fetch;
  projectId: string;
  lang: string;
  primaryLang: string;
  url: URL;
}) {
  const paths = projectPaths(projectId, lang === primaryLang ? undefined : lang);
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
}
