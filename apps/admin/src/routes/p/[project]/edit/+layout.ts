import { error, redirect } from "@sveltejs/kit";
import type { SiteData } from "$lib/editor/state.svelte";
import type { EditorTranslations } from "$lib/editor/translations";
import { projectPaths } from "$lib/project-paths";
import type { LayoutLoad } from "./$types";

// contenteditable and the selection only exist in the browser.
export const ssr = false;
export const trailingSlash = "always";

export interface EditorLanguage {
  lang: string;
  name: string;
  primary: boolean;
  published: boolean;
}

/**
 * The document of the language in `?lang=` (the primary without it) and the project's languages.
 * `?key=` asks for the page with that translation key (switching languages): the editor then
 * opens on it, or on the home page when the language has no such page.
 */
export const load: LayoutLoad = async ({ fetch, params, url }) => {
  const lang = url.searchParams.get("lang") ?? undefined;
  const paths = projectPaths(params.project, lang);
  // The site and business settings moved to the panel's sections; old addresses follow.
  const asked = url.searchParams.get("tab");
  if (asked === "site") redirect(302, paths.website);
  if (asked === "business") redirect(302, paths.business);
  const [siteResponse, languagesResponse, translationsResponse] = await Promise.all([
    fetch(paths.api),
    fetch(paths.languages),
    fetch(paths.translations),
  ]);
  if (!siteResponse.ok) error(siteResponse.status, "Could not load the site.");
  if (!languagesResponse.ok) error(languagesResponse.status, "Could not load the languages.");
  const site = (await siteResponse.json()) as SiteData;
  const languages = (await languagesResponse.json()) as EditorLanguage[];
  const translations = translationsResponse.ok
    ? ((await translationsResponse.json()) as EditorTranslations[])
    : [];

  const key = url.searchParams.get("key");
  if (key !== null) {
    const doc = site.document as {
      document_id: string;
      nodes: Record<
        string,
        { type?: string; translation_key?: string; pages?: { nodes: string[] } }
      >;
    };
    const pageIds = doc.nodes[doc.document_id]?.pages?.nodes ?? [];
    const match = pageIds.find((id) => doc.nodes[id]?.translation_key === key);
    const tab = url.searchParams.get("tab");
    const target = paths.edit(match);
    redirect(302, tab ? `${target}${target.includes("?") ? "&" : "?"}tab=${tab}` : target);
  }
  const primary = languages.find((l) => l.primary)?.lang ?? "cs";
  const tab = url.searchParams.get("tab");
  return {
    site,
    languages,
    translations,
    lang: lang ?? primary,
    primaryLang: primary,
    // `theme` is the Design tab's former name.
    tab: tab === "design" || tab === "theme" ? ("design" as const) : undefined,
  };
};
