import { blocks, type SiteDocument, siteBuilder, usedMediaFiles } from "@webmio/model";
import type { LooseNodes } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

// Hidden blocks (template-system, site-rendering delta).

const photo = (src: string) => ({ src, alt: "Chléb", width: 1920, height: 1080 });

/** A bakery whose home page has a hero, a text, testimonials and a gallery. */
function bakery(): { doc: SiteDocument; nodes: LooseNodes } {
  const s = siteBuilder({ name: "Pekárna", lang: "cs", description: "Chléb každé ráno." });
  s.location({ street: "Lipová 1", city: "Brno" });
  s.testimonial({ quote: "Nejlepší chléb ve městě.", name: "Jana" });
  s.page({ title: "Úvod", slug: "uvod" }, [
    blocks.hero({ heading: "Vítejte", text: "Pečeme od pěti.", image: photo("hero.jpg") }),
    blocks.text("Pečeme z kvasu."),
    blocks.testimonials("Co říkají zákazníci"),
    blocks.gallery({ heading: "Pekárna", items: [{ image: photo("pec.jpg") }] }),
  ]);
  const doc = s.build();
  return { doc, nodes: doc.nodes as LooseNodes };
}

const idOf = (nodes: LooseNodes, type: string) =>
  Object.values(nodes).find((n) => n.type === type)?.id as string;

function home(doc: SiteDocument) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return { html: result.site.pages[0]?.html ?? "", scripts: result.site.scripts };
}

describe("hidden blocks", () => {
  it("Hidden testimonials on the home page", () => {
    const { doc, nodes } = bakery();
    const shown = home(doc).html;
    nodes[idOf(nodes, "testimonials")].hidden = true;
    const hidden = home(doc).html;
    expect(shown).toContain("Nejlepší chléb ve městě.");
    expect(hidden).not.toContain("Nejlepší chléb ve městě.");
    expect(hidden).not.toContain("Co říkají zákazníci");
    // The other blocks render as before: the page is the shown one without the section.
    const section = /\n\s*<section class="block testimonials">[\s\S]*?<\/section>/.exec(shown);
    expect(section).not.toBeNull();
    expect(hidden).toBe(shown.replace(section?.[0] ?? "", ""));
  });

  it("Hidden hero: the page title becomes the only h1", () => {
    const { doc, nodes } = bakery();
    nodes.page_1.title = "O nás";
    nodes[idOf(nodes, "hero")].hidden = true;
    const { html } = home(doc);
    expect([...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/g)].map((m) => m[1])).toEqual(["O nás"]);
    expect(html).not.toContain("Vítejte");
    expect(html).not.toContain("hero.jpg");
  });

  it("Hidden slideshow: the page doesn't load the slideshow script", () => {
    const { doc, nodes } = bakery();
    const hero = nodes[idOf(nodes, "hero")];
    hero.layout = "slideshow";
    const slide = (id: string, src: string) => {
      nodes[`img_${id}`] = { ...nodes[hero.image.nodes[0]], id: `img_${id}`, src };
      nodes[id] = {
        id,
        type: "slide",
        image: { nodes: [`img_${id}`], marks: [], annotations: [] },
        title: { content: id, marks: [], annotations: [] },
        clip_url: "",
        target_id: "",
        url: "",
      };
      return id;
    };
    hero.slides = {
      nodes: [slide("s1", "a.jpg"), slide("s2", "b.jpg")],
      marks: [],
      annotations: [],
    };
    expect(home(doc).scripts).toHaveProperty("slideshow.js");
    hero.hidden = true;
    const { html, scripts } = home(doc);
    expect(scripts).not.toHaveProperty("slideshow.js");
    expect(html).not.toContain("slideshow.js");
  });
});

describe("media files of hidden blocks", () => {
  it("Image only in a hidden block", () => {
    const { doc, nodes } = bakery();
    nodes[idOf(nodes, "hero")].image.nodes = [];
    expect(usedMediaFiles(doc).some((f) => f.startsWith("pec.jpg"))).toBe(true);
    nodes[idOf(nodes, "gallery")].hidden = true;
    expect(usedMediaFiles(doc)).toEqual([]);
  });
});
