import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../test/fixtures.js";
import type { SiteLanguage } from "./context.js";
import { type RenderOptions, renderSite } from "./index.js";

/** Czech at `/` (Úvod, Kontakt) and English at `/en/` (home, and "Kontakt" as `contact`). */
const LANGUAGES: SiteLanguage[] = [
  {
    lang: "cs",
    name: "Čeština",
    basePath: "/",
    primary: true,
    home: "/",
    pages: new Map([
      ["page_home", "/"],
      ["page_contact", "/kontakt/"],
    ]),
  },
  {
    lang: "en",
    name: "English",
    basePath: "/en/",
    primary: false,
    home: "/en/",
    pages: new Map([
      ["page_home", "/en/"],
      ["page_contact", "/en/contact/"],
    ]),
  },
];

function render(options: RenderOptions = {}) {
  const { doc } = editableDemoSite();
  const result = renderSite(doc, options);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return {
    home: page("index.html"),
    contact: page("kontakt/index.html"),
    notFound: result.site.notFound,
  };
}

describe("language alternates", () => {
  it("link the page in every language, and x-default to the primary's", () => {
    const { contact } = render({ siteUrl: "https://anideti.cz", languages: LANGUAGES });
    expect(contact).toContain(
      '<link rel="alternate" hreflang="cs" href="https://anideti.cz/kontakt/">',
    );
    expect(contact).toContain(
      '<link rel="alternate" hreflang="en" href="https://anideti.cz/en/contact/">',
    );
    expect(contact).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://anideti.cz/kontakt/">',
    );
  });

  it("use paths without the site's address", () => {
    const { contact } = render({ languages: LANGUAGES });
    expect(contact).toContain('<link rel="alternate" hreflang="en" href="/en/contact/">');
  });

  it("leave out a language without a counterpart", () => {
    const languages = LANGUAGES.map((l) =>
      l.lang === "en" ? { ...l, pages: new Map([["page_home", "/en/"]]) } : l,
    );
    const { contact } = render({ languages });
    expect(contact).not.toContain('rel="alternate" hreflang="en"');
  });

  it("are left out with one language, or none given", () => {
    const [czech] = LANGUAGES;
    for (const options of [{}, { languages: czech ? [czech] : [] }]) {
      const { contact } = render(options);
      expect(contact).not.toContain('rel="alternate"');
      expect(contact).not.toContain("language-switcher");
    }
  });
});

describe("language switcher", () => {
  it("links each language's counterpart, marking the current one", () => {
    const { contact } = render({ languages: LANGUAGES });
    expect(contact).toContain('<nav class="language-switcher" aria-label="Jazyk">');
    expect(contact).toContain(
      '<a href="/kontakt/" lang="cs" hreflang="cs" aria-current="true">Čeština</a>',
    );
    expect(contact).toContain('<a href="/en/contact/" lang="en" hreflang="en">English</a>');
  });

  it("links a language's home when the page has no counterpart", () => {
    const languages = LANGUAGES.map((l) =>
      l.lang === "en" ? { ...l, pages: new Map([["page_home", "/en/"]]) } : l,
    );
    expect(render({ languages }).contact).toContain(
      '<a href="/en/" lang="en" hreflang="en">English</a>',
    );
  });

  it("links every home from the not-found page, which has no alternates", () => {
    const { notFound } = render({ languages: LANGUAGES });
    expect(notFound).toContain('<a href="/en/" lang="en" hreflang="en">English</a>');
    expect(notFound).not.toContain('rel="alternate"');
  });

  it("passes html-validate", async () => {
    const { contact, notFound } = render({ siteUrl: "https://anideti.cz", languages: LANGUAGES });
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    for (const html of [contact, notFound]) {
      const report = await validator.validateString(html);
      expect(
        report.results.flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${m.message}`)),
      ).toEqual([]);
    }
  });
});
