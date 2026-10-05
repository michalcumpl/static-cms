import { editableDemoSite, type LooseNodes, loadDemoSite } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { IMAGE_SIZES, renderBlock, renderImage } from "./blocks.js";
import { RenderContext } from "./context.js";

function render(id: string, edit?: (nodes: LooseNodes) => void) {
  const { doc, nodes } = editableDemoSite();
  edit?.(nodes);
  const ctx = new RenderContext(doc, "/");
  return renderBlock(nodes[id], ctx).value;
}

describe("blocks", () => {
  it("renders each block as a section classed by type", () => {
    expect(render("hero_1")).toMatch(/^<section class="block hero">/);
    expect(render("rich_text_about")).toMatch(/^<section class="block rich-text">/);
    expect(render("services_1")).toMatch(/^<section class="block services">/);
  });

  it("renders a hero with heading, text, image and call to action", () => {
    const out = render("hero_1");
    expect(out).toContain("<h1>Čerstvý chléb každé ráno</h1>");
    expect(out).toContain('<p class="hero-text">Pečeme <strong>z vlastního kvasu</strong>');
    expect(out).toContain('<a class="button" href="/kontakt/">Objednat pečivo</a>');
    expect(out).toContain(
      '<img class="hero-image" src="/assets/images/hero.png-320.webp" srcset="/assets/images/hero.png-320.webp 320w" sizes="(min-width: 48rem) 40vw, 100vw"',
    );
  });

  it("leaves out optional hero parts", () => {
    const out = render("hero_1", (nodes) => {
      nodes.hero_1.text.content = "";
      nodes.hero_1.text.marks = [];
      nodes.hero_1.image.nodes = [];
      nodes.hero_1.action.nodes = [];
    });
    expect(out).not.toMatch(/hero-text|<img|hero-action/);
  });

  it("renders marked paragraph text", () => {
    const out = render("rich_text_about", (nodes) => {
      nodes.para_about.content = {
        content: "Call us today",
        marks: [{ start_offset: 0, end_offset: 7, node_id: "strong_about" }],
        annotations: [],
      };
    });
    expect(out).toContain("<p><strong>Call us</strong> today</p>");
  });

  it("renders subheadings at their level and lists as bullets", () => {
    const out = render("rich_text_contact");
    expect(out).toContain("<h2>Kde nás najdete</h2>");
    expect(out).toContain("<h3>Otevírací doba</h3>");
    expect(out).toMatch(/<ul>\s*<li>Po–Pá: 6:00–17:00<\/li>\s*<li>So: 7:00–11:00<\/li>\s*<\/ul>/);
  });

  it("renders services with an h2 and no empty price element", () => {
    const out = render("services_1");
    expect(out).toContain("<h2>Co pečeme</h2>");
    expect(out.match(/class="service"/g)).toHaveLength(3);
    expect(out.match(/class="service-price"/g)).toHaveLength(2);
    expect(out).not.toMatch(/<p class="service-price"><\/p>/);
  });

  it("renders services without a heading", () => {
    const out = render("services_1", (nodes) => {
      nodes.services_1.heading.content = "";
    });
    expect(out).not.toContain("<h2");
  });
});

describe("renderImage", () => {
  const doc = loadDemoSite();
  const ctx = new RenderContext(doc, "/");
  const image = ctx.node("image_hero", "image");

  it("renders alt text, variants, size, and lazy loading outside the hero", () => {
    expect(renderImage(image, ctx, { lazy: true, sizes: "100vw" }).value).toBe(
      '<img src="/assets/images/hero.png-320.webp" srcset="/assets/images/hero.png-320.webp 320w" sizes="100vw" alt="Bochníky kváskového chleba na dřevěném pultu" width="320" height="180" loading="lazy">',
    );
  });

  it("renders decorative images with empty alt", () => {
    const decorative = { ...image, decorative: true, alt: "" };
    expect(renderImage(decorative, ctx, { lazy: false, sizes: "100vw" }).value).toContain(
      ' alt="" width="320"',
    );
  });

  it("lists every variant of a large image, with src at most 1600 px wide", () => {
    const large = { ...image, src: "pult-3f9a2c1d", width: 4032, height: 3024 };
    const out = renderImage(large, ctx, { lazy: false, sizes: IMAGE_SIZES.hero }).value;
    expect(out).toContain('src="/assets/images/pult-3f9a2c1d-1600.webp"');
    expect(out).toContain(
      'srcset="/assets/images/pult-3f9a2c1d-480.webp 480w, /assets/images/pult-3f9a2c1d-960.webp 960w, /assets/images/pult-3f9a2c1d-1600.webp 1600w, /assets/images/pult-3f9a2c1d-2400.webp 2400w"',
    );
    expect(out).toContain('width="4032" height="3024"');
    expect(out).not.toContain("loading");
  });
});
