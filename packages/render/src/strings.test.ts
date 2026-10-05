import { editableDemoSite } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";
import { LANGUAGES, languageName, siteStrings } from "./strings.js";

function notFoundHeading(lang: string): string {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.lang = lang;
  const result = renderSite(doc);
  if (!result.ok) throw new Error("render failed");
  return /<h1 class="page-title">(.*?)<\/h1>/.exec(result.site.notFound)?.[1] ?? "";
}

describe("site strings", () => {
  it.each([
    ["cs", "Stránka nenalezena"],
    ["sk", "Stránka sa nenašla"],
    ["en", "Page not found"],
    ["de", "Seite nicht gefunden"],
    ["pl", "Nie znaleziono strony"],
    ["fr", "Page not found"],
  ])("the not-found page of a %s site says %j", (lang, heading) => {
    expect(notFoundHeading(lang)).toBe(heading);
  });

  it.each([
    ["cs", ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"], "zavřeno"],
    ["sk", ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"], "zatvorené"],
    ["de", ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], "geschlossen"],
    ["pl", ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"], "zamknięte"],
    ["en", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "Closed"],
  ])("%s has its own day names and word for closed", (lang, days, closed) => {
    expect(siteStrings(lang).days).toEqual(days);
    expect(siteStrings(lang).closed).toBe(closed);
  });

  it("has every string for every offered language", () => {
    for (const lang of Object.keys(LANGUAGES)) {
      const strings = siteStrings(lang);
      for (const value of Object.values(strings)) expect(value, lang).toBeTruthy();
    }
  });

  it("names each language in its own language", () => {
    expect(Object.keys(LANGUAGES).map(languageName)).toEqual([
      "Čeština",
      "Slovenčina",
      "English",
      "Deutsch",
      "Polski",
    ]);
    expect(languageName("fr")).toBe("fr");
  });
});
