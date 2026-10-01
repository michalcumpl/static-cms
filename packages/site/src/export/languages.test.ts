import { describe, expect, it } from "vitest";
import { editableDemoSite, loadDemoMedia } from "../test/fixtures.js";
import { exportSite } from "./index.js";
import { exportSiteLanguages, type LanguageDocument } from "./languages.js";

/** Czech (primary: Úvod, Kontakt) and an English copy whose "Kontakt" is at `contact`. */
function czechAndEnglish() {
  const cs = editableDemoSite();
  const en = editableDemoSite();
  en.nodes.site_1.lang = "en";
  en.nodes.page_contact.slug = "contact";
  en.nodes.page_contact.title = "Contact";
  const languages: LanguageDocument[] = [
    { lang: "cs", document: cs.doc, primary: true },
    { lang: "en", document: en.doc, primary: false },
  ];
  return { cs, en, languages };
}

const decode = (bytes: Uint8Array | undefined) => new TextDecoder().decode(bytes);

function exported(languages: LanguageDocument[], siteUrl?: string) {
  const result = exportSiteLanguages(languages, loadDemoMedia(), siteUrl ? { siteUrl } : {});
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result;
}

describe("exportSiteLanguages", () => {
  it("puts the primary at the root and English under en/, with shared files once", () => {
    const { files } = exported(czechAndEnglish().languages);
    expect([...files.keys()]).toEqual([
      "404.html",
      "assets/images/hero.png-320.webp",
      "assets/style.css",
      "en/contact/index.html",
      "en/index.html",
      "index.html",
      "kontakt/index.html",
      "robots.txt",
      "sitemap.xml",
    ]);
    const english = decode(files.get("en/contact/index.html"));
    expect(english).toContain('<html lang="en">');
    expect(english).toContain('href="/en/"');
    expect(english).toContain('<link rel="alternate" hreflang="cs" href="/kontakt/">');
    expect(english).toContain('<a href="/kontakt/" lang="cs" hreflang="cs">Čeština</a>');
  });

  it("links the stylesheet, images and icons at the root from every language", () => {
    const { cs, en, languages } = czechAndEnglish();
    for (const nodes of [cs.nodes, en.nodes]) {
      nodes.logo = {
        id: "logo",
        type: "image",
        src: "hero.png",
        alt: "",
        decorative: false,
        width: 320,
        height: 180,
      };
      nodes.site_1.favicon = { nodes: ["logo"], marks: [], annotations: [] };
      nodes.site_1.share_image = { nodes: ["logo"], marks: [], annotations: [] };
      nodes.logo.alt = "Logo";
    }
    const media = loadDemoMedia();
    for (const name of [
      "hero.png-icon-32.png",
      "hero.png-icon-180.png",
      "hero.png-icon-512.png",
      "hero.png-share.jpg",
    ]) {
      media.set(name, new Uint8Array([1]));
    }
    const result = exportSiteLanguages(languages, media, { siteUrl: "https://anideti.cz" });
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
    const english = decode(result.files.get("en/index.html"));
    expect(english).toContain('<link rel="stylesheet" href="/assets/style.css">');
    expect(english).toContain('src="/assets/images/hero.png-320.webp"');
    expect(english).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32">');
    expect(english).toContain(
      '<meta property="og:image" content="https://anideti.cz/assets/images/hero.png-share.jpg">',
    );
    expect(english).not.toContain("/en/assets/");
    // Every file an English page links is in the tree.
    for (const [, href] of english.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
      const path = (href as string).slice(1);
      const file = path === "" || path.endsWith("/") ? `${path}index.html` : path;
      expect([...result.files.keys()], href).toContain(file);
    }
  });

  it("lists every page with its alternates in one sitemap", () => {
    const { files } = exported(czechAndEnglish().languages, "https://anideti.cz");
    const xml = decode(files.get("sitemap.xml"));
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    const entry = xml.slice(
      xml.indexOf("<loc>https://anideti.cz/kontakt/</loc>"),
      xml.indexOf("</url>", xml.indexOf("<loc>https://anideti.cz/kontakt/</loc>")),
    );
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="cs" href="https://anideti.cz/kontakt/"/>',
    );
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://anideti.cz/en/contact/"/>',
    );
    expect(xml.match(/<url>/g)).toHaveLength(4);
    expect(xml).not.toContain("404");
  });

  it("names the language of a problem", () => {
    const { en, languages } = czechAndEnglish();
    en.nodes.image_hero.alt = "";
    const result = exportSiteLanguages(languages, loadDemoMedia());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems).toEqual([
      expect.objectContaining({
        code: "missing-alt",
        message: expect.stringMatching(/^English: /),
      }),
    ]);
  });

  it("is exportSite for one language", () => {
    const { cs } = czechAndEnglish();
    const one = exportSiteLanguages(
      [{ lang: "cs", document: cs.doc, primary: true }],
      loadDemoMedia(),
    );
    expect(one).toEqual(exportSite(cs.doc, loadDemoMedia()));
  });

  it("exports media used by both languages once, and every language's redirects", () => {
    const { languages } = czechAndEnglish();
    const result = exportSiteLanguages(languages, loadDemoMedia(), {
      redirects: [
        { from: "/napiste-nam/", to: "/kontakt/" },
        { from: "/en/kontakt/", to: "/en/contact/" },
      ],
    });
    if (!result.ok) throw new Error("export failed");
    expect([...result.files.keys()].filter((p) => p.startsWith("assets/images/"))).toEqual([
      "assets/images/hero.png-320.webp",
    ]);
    expect(decode(result.files.get("_redirects"))).toBe(
      "/napiste-nam/ /kontakt/ 301\n/en/kontakt/ /en/contact/ 301\n",
    );
  });
});
