import { blocks, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { BASE_CSS } from "./css.js";
import { renderSite } from "./index.js";

// Banners (banner-block, site-rendering delta "Banner rendering").

type Banner = Parameters<typeof blocks.banner>[0];

const PHOTO = {
  src: "a1b2c3d4e5f60718.jpg",
  width: 2400,
  height: 1200,
  alt: "Letadlo nad mořem",
} as const;

/** The agency's home page: a text, a banner, and a text after it. */
function site(banner: Banner): SiteDocument {
  const s = siteBuilder({ name: "Cestovka Vlna", lang: "cs", description: "Zájezdy." });
  s.location({ city: "Brno", email: "info@cestovka-vlna.cz" });
  s.page({ title: "Úvod", slug: "uvod" }, [
    blocks.text("## Kam vyrazit\n\nChorvatsko, Itálie."),
    blocks.banner(banner),
    blocks.text("## Proč my\n\nJezdíme od roku 1998."),
  ]);
  s.page({ title: "Zájezdy", slug: "zajezdy" }, [blocks.text("Nabídka.")]);
  return s.build();
}

function home(doc: SiteDocument): string {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages[0]?.html ?? "";
}

const tight = (html: string) => html.replace(/>\s+</g, "><");

describe("banners", () => {
  it("A photo band: the photo, and over it a panel with the heading, text and button", () => {
    const html = tight(
      home(
        site({
          heading: "Last minute",
          text: "Odlety z Brna **každou sobotu**.",
          image: PHOTO,
          action: { label: "Všechny zájezdy", page: "zajezdy" },
        }),
      ),
    );
    expect(html).toContain('<section class="block banner banner-photo"><img class="banner-image"');
    expect(html).toContain(
      '<div class="banner-content"><h2>Last minute</h2><p class="banner-text">Odlety z Brna <strong>každou sobotu</strong>.</p><p class="banner-action"><a class="button" href="/zajezdy/">Všechny zájezdy</a></p></div>',
    );
    // The page keeps one <h1>, its title, as there is no hero.
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("The photo loads when needed, cut around its focal point", () => {
    const html = home(
      site({ heading: "Last minute", image: { ...PHOTO, focus: { x: 20, y: 70 } } }),
    );
    const img = /<img class="banner-image[^"]*"[^>]*>/.exec(html)?.[0] ?? "";
    expect(img).toContain('loading="lazy"');
    expect(img).toContain('sizes="100vw"');
    expect(img).toContain('alt="Letadlo nad mořem"');
    // The focal point is a class the page's <style> positions.
    expect(img).toMatch(/class="banner-image focus-[\w-]+"/);
  });

  it("A colour band: no image, the heading and button on the primary colour", () => {
    const html = tight(
      home(site({ heading: "Last minute", action: { label: "Zájezdy", page: "zajezdy" } })),
    );
    expect(html).toContain(
      '<section class="block banner banner-plain"><div class="container banner-inner"><div class="banner-content"><h2>Last minute</h2><p class="banner-action">',
    );
    expect(html).not.toContain("banner-image");
    expect(BASE_CSS).toMatch(/\.block\.banner-plain \{\s*background: var\(--color-primary\);/);
  });

  it("is valid HTML", async () => {
    const html = home(
      site({
        heading: "Last minute",
        text: "Odlety z Brna.",
        image: PHOTO,
        action: { label: "Zájezdy", page: "zajezdy" },
      }),
    );
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(html);
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});
