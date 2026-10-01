/** Text the renderer writes itself, in the site's language (seo-and-metadata design.md decision 6). */
export interface SiteStrings {
  notFoundHeading: string;
  notFoundText: string;
  backHome: string;
}

const STRINGS: Record<string, SiteStrings> = {
  cs: {
    notFoundHeading: "Stránka nenalezena",
    notFoundText: "Tuto stránku jsme nenašli. Možná byla přesunuta nebo smazána.",
    backHome: "Přejít na úvodní stránku",
  },
  en: {
    notFoundHeading: "Page not found",
    notFoundText: "We couldn't find this page. It may have been moved or deleted.",
    backHome: "Go to the home page",
  },
};

/** The strings for a language tag, by its primary subtag (`cs-CZ` is `cs`); English otherwise. */
export function siteStrings(lang: string): SiteStrings {
  return STRINGS[lang.split("-")[0]?.toLowerCase() ?? ""] ?? (STRINGS.en as SiteStrings);
}
