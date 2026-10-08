import { blocks, type ImageInput, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

// The cards block (cards, site-rendering delta).

const photo = (src: string, alt: string): ImageInput => ({ src, alt, width: 1200, height: 900 });

/** Scénografie in miniature: category tiles and awards on the home page, projects under "Realizace". */
function site(options: { listing?: boolean } = {}): SiteDocument {
  const s = siteBuilder({ name: "Scénografie", lang: "cs" });
  s.location({ street: "Černokostelecká 90", city: "Praha" });
  const petrof = s.project({
    name: "PETROF 160",
    slug: "petrof-160",
    cover: photo("p.jpg", "Klavír"),
  });
  s.page({ title: "Úvod", slug: "uvod" }, [
    blocks.cards({
      heading: "Projekty",
      look: "over",
      items: ["TV a film", "Eventy", "Výstavy", "Interiéry"].map((title, i) => ({
        image: photo(`tile-${i}.jpg`, title),
        title,
        page: "vystavy",
      })),
    }),
    blocks.cards({
      items: [
        {
          image: photo("a1.jpg", "Cena"),
          title: "Designblok 2020",
          text: "Hlavní cena za *expozici*.",
        },
        { title: "PETROF 160", text: "[Muzeum](https://ntm.cz) a výstava.", item: petrof },
      ],
    }),
  ]);
  s.page({ title: "Výstavy", slug: "vystavy", menu: true }, [blocks.text("Výstavy.")]);
  s.page({ title: "Realizace", slug: "realizace" }, [blocks.projects()]);
  if (options.listing !== false) s.itemPages({ projects: "realizace" });
  return s.build();
}

function home(doc: SiteDocument): string {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages.find((p) => p.path === "index.html")?.html ?? "";
}

const sections = (html: string) =>
  [...html.matchAll(/<section class="block cards[\s\S]*?<\/section>/g)].map((m) => m[0]);

describe("cards", () => {
  it("Category tiles", () => {
    const [tiles] = sections(home(site()));
    expect(tiles).toMatch(/^<section class="block cards cards-over">/);
    expect(tiles).toContain("<h2>Projekty</h2>");
    expect(tiles).toContain('<ul class="card-list card-columns-4">');
    expect(tiles?.match(/<li class="card">/g)).toHaveLength(4);
    expect(tiles).toMatch(
      /<img class="card-image" [^>]*alt="Výstavy"[^>]*loading="lazy">\s*<h3 class="card-title"><a href="\/vystavy\/">Výstavy<\/a><\/h3>/,
    );
  });

  it("Awards under photos: titles are h2 without a block heading", () => {
    const [, awards] = sections(home(site()));
    expect(awards).toMatch(/^<section class="block cards cards-below">/);
    expect(awards).toContain('<h2 class="card-title">Designblok 2020</h2>');
    expect(awards).toContain('<p class="card-text">Hlavní cena za <em>expozici</em>.</p>');
    // A card without an image says so, for its styles.
    expect(awards).toContain('<li class="card card-no-image">');
  });

  it("links a card to a project's page", () => {
    const [, awards] = sections(home(site()));
    expect(awards).toContain(
      '<h2 class="card-title"><a href="/realizace/petrof-160/">PETROF 160</a></h2>',
    );
  });

  it("Link that leads nowhere", () => {
    const [, awards] = sections(home(site({ listing: false })));
    expect(awards).toContain('<h2 class="card-title">PETROF 160</h2>');
  });

  it("passes html-validate with both looks, and matches its snapshot", async () => {
    const html = home(site());
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(html);
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
    await expect(html).toMatchFileSnapshot("__snapshots__/cards/index.html");
  });
});
