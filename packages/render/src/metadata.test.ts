import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { type RenderOptions, renderSite } from "./index.js";

const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

function addImage(nodes: LooseNodes, id: string, src: string, alt = "") {
  nodes[id] = { id, type: "image", src, alt, decorative: false, width: 1600, height: 1200 };
  return id;
}

/** The demo site with a favicon, a site share image and a site description. */
function metadataSite() {
  const { doc, nodes } = editableDemoSite();
  nodes.site_1.description = "Rodinná pekárna v Kolíně";
  nodes.site_1.favicon = list([addImage(nodes, "image_logo", "logo-1a2b")]);
  nodes.site_1.share_image = list([addImage(nodes, "image_pult", "pult-3f9a", "Pult s chlebem")]);
  return { doc, nodes };
}

function render(doc: unknown, options: RenderOptions = {}) {
  const result = renderSite(doc, options);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const html = (path: string) => {
    const page = result.site.pages.find((p) => p.path === path);
    if (!page) throw new Error(`no ${path}`);
    return page.html;
  };
  return { home: html("index.html"), contact: html("kontakt/index.html") };
}

const meta = (html: string, property: string) =>
  new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)">`).exec(html)?.[1];

describe("meta description", () => {
  it("falls back to the site's description", () => {
    const { doc, nodes } = metadataSite();
    nodes.page_contact.seo_description = "";
    expect(render(doc).contact).toContain(
      '<meta name="description" content="Rodinná pekárna v Kolíně">',
    );
  });

  it("uses the page's own description first", () => {
    const { doc } = metadataSite();
    expect(meta(render(doc).contact, "description")).toBe(
      "Adresa, telefon a otevírací doba pekárny U Lípy v Kolíně.",
    );
  });

  it("is left out when neither has one", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.seo_description = "";
    const { contact } = render(doc);
    expect(contact).not.toContain('name="description"');
    expect(contact).not.toContain("og:description");
  });
});

describe("share previews", () => {
  it("use the site's share image with the site's address", () => {
    const { doc } = metadataSite();
    const { contact } = render(doc, { siteUrl: "https://anideti.cz" });
    expect(meta(contact, "og:type")).toBe("website");
    expect(meta(contact, "og:site_name")).toBe("Pekárna U Lípy");
    expect(meta(contact, "og:title")).toBe("Kontakt");
    expect(meta(contact, "og:url")).toBe("https://anideti.cz/kontakt/");
    expect(meta(contact, "og:image")).toBe("https://anideti.cz/assets/images/pult-3f9a-share.jpg");
    expect(meta(contact, "og:image:width")).toBe("1200");
    expect(meta(contact, "og:image:height")).toBe("630");
    expect(meta(contact, "og:image:alt")).toBe("Pult s chlebem");
    expect(meta(contact, "twitter:card")).toBe("summary_large_image");
  });

  it("prefer the page's own share image", () => {
    const { doc, nodes } = metadataSite();
    nodes.page_contact.share_image = list([addImage(nodes, "image_mapa", "mapa-77aa", "Mapa")]);
    const { contact, home } = render(doc, { siteUrl: "https://anideti.cz" });
    expect(meta(contact, "og:image")).toMatch(/\/mapa-77aa-share\.jpg$/);
    expect(meta(home, "og:image")).toMatch(/\/pult-3f9a-share\.jpg$/);
  });

  it("title the home page with the site name", () => {
    const { doc } = metadataSite();
    expect(meta(render(doc).home, "og:title")).toBe("Pekárna U Lípy");
  });

  it("leave out the address and image without the site's address", () => {
    const { doc } = metadataSite();
    const { contact } = render(doc);
    expect(meta(contact, "og:title")).toBe("Kontakt");
    expect(meta(contact, "twitter:card")).toBe("summary");
    expect(contact).not.toContain("og:url");
    expect(contact).not.toContain("og:image");
  });

  it("include the base path in absolute URLs", () => {
    const { doc } = metadataSite();
    const { contact } = render(doc, { siteUrl: "https://example.cz", basePath: "/web/" });
    expect(meta(contact, "og:url")).toBe("https://example.cz/web/kontakt/");
    expect(meta(contact, "og:image")).toBe(
      "https://example.cz/web/assets/images/pult-3f9a-share.jpg",
    );
  });
});

describe("favicon links", () => {
  it("link the three icons at the base path", () => {
    const { doc } = metadataSite();
    for (const html of Object.values(render(doc))) {
      expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="32x32">');
      expect(html).toContain(
        '<link rel="icon" href="/icon-512.png" type="image/png" sizes="512x512">',
      );
      expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    }
  });

  it("are left out without a favicon", () => {
    const { doc } = editableDemoSite();
    for (const html of Object.values(render(doc))) {
      expect(html).not.toContain('rel="icon"');
      expect(html).not.toContain("apple-touch-icon");
    }
  });
});

/** The parsed JSON-LD of a page, or undefined. */
function structuredData(html: string): unknown {
  const match = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
  return match?.[1] === undefined ? undefined : JSON.parse(match[1]);
}

describe("structured data", () => {
  it("describes the site and its organization on the home page", () => {
    const { doc } = metadataSite();
    const { home } = render(doc, { siteUrl: "https://anideti.cz" });
    expect(structuredData(home)).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://anideti.cz/#website",
          url: "https://anideti.cz/",
          name: "Pekárna U Lípy",
          inLanguage: "cs",
          description: "Rodinná pekárna v Kolíně",
          publisher: { "@id": "https://anideti.cz/#organization" },
        },
        {
          "@type": "Organization",
          "@id": "https://anideti.cz/#organization",
          name: "Pekárna U Lípy",
          url: "https://anideti.cz/",
          logo: "https://anideti.cz/icon-512.png",
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Služby",
            itemListElement: [
              ["Kváskový chléb", "Žitno-pšeničný bochník, 1 kg."],
              ["Rohlíky a housky", "Každé ráno čerstvé, i celozrnné."],
              ["Dorty na objednávku", "Svatby, narozeniny i firemní akce – ozvěte se nám předem."],
            ].map(([name, description]) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name, description },
            })),
          },
        },
      ],
    });
  });

  it("prefers the site's logo over the favicon as the organization's logo", () => {
    const { doc, nodes } = metadataSite();
    nodes.brand = {
      ...nodes.image_logo,
      id: "brand",
      src: "pekarna-7c1e",
      width: 600,
      height: 200,
    };
    nodes.site_1.logo = list(["brand"]);
    const data = structuredData(render(doc, { siteUrl: "https://pekarna.cz" }).home) as {
      "@graph": Record<string, unknown>[];
    };
    expect(data["@graph"][1]?.logo).toBe("https://pekarna.cz/assets/images/pekarna-7c1e-600.webp");
  });

  it("leaves out the description and logo when the site has none", () => {
    const { doc } = editableDemoSite();
    const data = structuredData(render(doc, { siteUrl: "https://anideti.cz" }).home) as {
      "@graph": Record<string, unknown>[];
    };
    expect(data["@graph"][0]).not.toHaveProperty("description");
    expect(data["@graph"][1]).not.toHaveProperty("logo");
  });

  it("can't be ended early by text in the site's name", () => {
    const { doc, nodes } = metadataSite();
    nodes.site_1.name = "Pekárna </script><script>alert(1)</script>";
    const { home } = render(doc, { siteUrl: "https://anideti.cz" });
    const script = home.slice(home.indexOf('<script type="application/ld+json">'));
    expect(script.indexOf("</script>")).toBe(script.lastIndexOf("</script>"));
    expect((structuredData(home) as { "@graph": { name: string }[] })["@graph"][0]?.name).toBe(
      "Pekárna </script><script>alert(1)</script>",
    );
  });

  it("is only on the home page, and only with the site's address", () => {
    const { doc } = metadataSite();
    expect(structuredData(render(doc, { siteUrl: "https://anideti.cz" }).contact)).toBeUndefined();
    expect(structuredData(render(doc).home)).toBeUndefined();
  });
});

describe("a page with full metadata", () => {
  it("passes html-validate", async () => {
    const { doc, nodes } = metadataSite();
    nodes.page_contact.share_image = list([addImage(nodes, "image_mapa", "mapa-77aa", "Mapa")]);
    const { home, contact } = render(doc, { siteUrl: "https://anideti.cz" });
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    for (const html of [home, contact]) {
      const report = await validator.validateString(html);
      const messages = report.results.flatMap((r) =>
        r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
      );
      expect(messages).toEqual([]);
    }
  });
});
