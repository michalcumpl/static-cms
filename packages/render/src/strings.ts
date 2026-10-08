/** Text the renderer writes itself, in the site's language (seo-and-metadata design.md decision 6). */
export interface SiteStrings {
  notFoundHeading: string;
  notFoundText: string;
  backHome: string;
  /** Day abbreviations, Monday first. */
  days: readonly [string, string, string, string, string, string, string];
  closed: string;
  showOnMap: string;
  /** Placeholder headings of new contact and opening hours blocks. */
  contactHeading: string;
  hoursHeading: string;
  /** The accessible name of the language switcher. */
  languageLabel: string;
  /** The accessible name of the main menu, once there is a language switcher beside it. */
  menuLabel: string;
  /** The accessible name of the footer's social profile links. */
  socialLabel: string;
  /** The name of the business's offer catalog in structured data. */
  servicesLabel: string;
  /** The link after a projects block that shows only some projects (collection-pages). */
  allProjects: string;
  /** The link to a project's video. */
  watchVideo: string;
  /** The link to a service's page inside an opened accordion row. */
  moreAboutService: string;
}

const STRINGS: Record<string, SiteStrings> = {
  cs: {
    notFoundHeading: "Stránka nenalezena",
    notFoundText: "Tuto stránku jsme nenašli. Možná byla přesunuta nebo smazána.",
    backHome: "Přejít na úvodní stránku",
    days: ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"],
    closed: "zavřeno",
    showOnMap: "Zobrazit na mapě",
    contactHeading: "Kontakt",
    hoursHeading: "Otevírací doba",
    languageLabel: "Jazyk",
    menuLabel: "Hlavní nabídka",
    socialLabel: "Sociální sítě",
    servicesLabel: "Služby",
    allProjects: "Všechny projekty",
    watchVideo: "Přehrát video",
    moreAboutService: "Více o službě",
  },
  sk: {
    notFoundHeading: "Stránka sa nenašla",
    notFoundText: "Túto stránku sme nenašli. Možno bola presunutá alebo zmazaná.",
    backHome: "Prejsť na úvodnú stránku",
    days: ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"],
    closed: "zatvorené",
    showOnMap: "Zobraziť na mape",
    contactHeading: "Kontakt",
    hoursHeading: "Otváracie hodiny",
    languageLabel: "Jazyk",
    menuLabel: "Hlavná ponuka",
    socialLabel: "Sociálne siete",
    servicesLabel: "Služby",
    allProjects: "Všetky projekty",
    watchVideo: "Prehrať video",
    moreAboutService: "Viac o službe",
  },
  de: {
    notFoundHeading: "Seite nicht gefunden",
    notFoundText:
      "Diese Seite haben wir nicht gefunden. Vielleicht wurde sie verschoben oder gelöscht.",
    backHome: "Zur Startseite",
    days: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    closed: "geschlossen",
    showOnMap: "Auf der Karte anzeigen",
    contactHeading: "Kontakt",
    hoursHeading: "Öffnungszeiten",
    languageLabel: "Sprache",
    menuLabel: "Hauptmenü",
    socialLabel: "Soziale Medien",
    servicesLabel: "Leistungen",
    allProjects: "Alle Projekte",
    watchVideo: "Video ansehen",
    moreAboutService: "Mehr zu dieser Leistung",
  },
  pl: {
    notFoundHeading: "Nie znaleziono strony",
    notFoundText: "Nie znaleźliśmy tej strony. Mogła zostać przeniesiona lub usunięta.",
    backHome: "Przejdź do strony głównej",
    days: ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"],
    closed: "zamknięte",
    showOnMap: "Pokaż na mapie",
    contactHeading: "Kontakt",
    hoursHeading: "Godziny otwarcia",
    languageLabel: "Język",
    menuLabel: "Menu główne",
    socialLabel: "Media społecznościowe",
    servicesLabel: "Usługi",
    allProjects: "Wszystkie projekty",
    watchVideo: "Obejrzyj wideo",
    moreAboutService: "Więcej o usłudze",
  },
  en: {
    notFoundHeading: "Page not found",
    notFoundText: "We couldn't find this page. It may have been moved or deleted.",
    backHome: "Go to the home page",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    closed: "Closed",
    showOnMap: "Show on map",
    contactHeading: "Contact",
    hoursHeading: "Opening hours",
    languageLabel: "Language",
    menuLabel: "Main menu",
    socialLabel: "Social media",
    servicesLabel: "Services",
    allProjects: "All projects",
    watchVideo: "Watch the video",
    moreAboutService: "More about this service",
  },
};

/** The strings for a language tag, by its primary subtag (`cs-CZ` is `cs`); English otherwise. */
export function siteStrings(lang: string): SiteStrings {
  return STRINGS[lang.split("-")[0]?.toLowerCase() ?? ""] ?? (STRINGS.en as SiteStrings);
}

/** The languages a project can have, each named in its own language (languages spec). */
export const LANGUAGES = {
  cs: "Čeština",
  sk: "Slovenčina",
  en: "English",
  de: "Deutsch",
  pl: "Polski",
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export function isLanguageCode(lang: string): lang is LanguageCode {
  return Object.hasOwn(LANGUAGES, lang);
}

/** A language's name in that language, or its tag for languages not offered. */
export function languageName(lang: string): string {
  return isLanguageCode(lang) ? LANGUAGES[lang] : lang;
}
