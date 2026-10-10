import { getDb } from "$lib/server/app";
import { unhandledCount } from "$lib/server/messages";
import { primaryLanguage, projectLanguages } from "$lib/server/site-documents";
import type { LayoutServerLoad } from "./$types";

/**
 * What the tabs share: the project's languages and the one the tab shows, from `?lang=` (the
 * primary language without it). The membership check is the parent layout's.
 */
export const load: LayoutServerLoad = async ({ params, parent, url }) => {
  await parent();
  const languages = projectLanguages(getDb(), params.project);
  const primary = primaryLanguage(getDb(), params.project) ?? languages[0]?.lang ?? "cs";
  const asked = url.searchParams.get("lang");
  const lang = languages.some((l) => l.lang === asked) ? (asked as string) : primary;
  // The section bar shows how many messages wait (contact-form spec, "Messages section").
  const unhandled = unhandledCount(getDb(), params.project);
  return { languages, primaryLang: primary, lang, unhandled };
};
