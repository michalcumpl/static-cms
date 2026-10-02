import { notFound } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { languagePages, projectTranslations } from "$lib/server/site-documents";
import type { PageServerLoad } from "./$types";

/** The pages of the language in `?lang=`, and, outside the primary, what it still lacks. */
export const load: PageServerLoad = async ({ params, parent, locals }) => {
  const { lang, primaryLang } = await parent();
  const pages = languagePages(getDb(), params.project, lang);
  if (!pages) notFound({ locals });
  const status = projectTranslations(getDb(), params.project).find((t) => t.lang === lang);
  return {
    pages: pages.map((page) => ({
      ...page,
      untranslated:
        lang !== primaryLang && Boolean(status?.untranslated.some((u) => u.key === page.key)),
    })),
    missing: lang !== primaryLang ? (status?.missing ?? []) : [],
  };
};
