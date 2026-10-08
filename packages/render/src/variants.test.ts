import { editableDemoSite, editableImageBlocksSite } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });

type Nodes = ReturnType<typeof editableImageBlocksSite>["nodes"];

/** Every page of the image-blocks site after `edit`, joined. */
function render(edit: (nodes: Nodes) => void, site = editableImageBlocksSite()): string {
  edit(site.nodes);
  const result = renderSite(site.doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages.map((p) => p.html).join("\n");
}

function page(edit: (nodes: Nodes) => void, path: string, site = editableImageBlocksSite()) {
  edit(site.nodes);
  const result = renderSite(site.doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages.find((p) => p.path === path)?.html ?? "";
}

/** The HTML of the first section whose classes start with these. */
function section(html: string, cls: string): string {
  const start = html.indexOf(`<section class="block ${cls}`);
  if (start < 0) throw new Error(`no ${cls} section`);
  return html.slice(start, html.indexOf("</section>", start));
}

/** Eight services, each with a description and a price, all shown on the demo home page. */
function eightServices(nodes: Nodes) {
  const ids = Array.from({ length: 8 }, (_, i) => `service_area_${i + 1}`);
  for (const [i, id] of ids.entries()) {
    nodes[id] = {
      id,
      type: "service_item",
      name: text(`Oblast ${i + 1}`),
      description: text(`Rozsah oblasti ${i + 1}.`),
      price: text(`${i + 1} 000 Kč`),
      slug: "",
      body: { nodes: [], marks: [], annotations: [] },
    };
  }
  nodes.site_1.services = { nodes: ids, marks: [], annotations: [] };
  nodes.services_1.show = "all";
  nodes.services_1.layout = "accordion";
}

const everyVariant = (nodes: Nodes) => {
  nodes.hero_1.layout = "cover";
  nodes.services_1.layout = "accordion";
  nodes.team_1.layout = "list";
  nodes.gallery_work.image_fit = "whole";
};

describe("block variants", () => {
  it("Full-photo hero", () => {
    const out = section(
      render((n) => (n.hero_1.layout = "cover"), editableDemoSite()),
      "hero",
    );
    expect(out).toMatch(/^<section class="block hero hero-cover">/);
    const image = out.indexOf('class="hero-image"');
    expect(image).toBeGreaterThan(0);
    expect(out).toContain('sizes="100vw"');
    expect(out.slice(0, out.indexOf("<h1"))).not.toContain('loading="lazy"');
    expect(out.indexOf("<h1")).toBeGreaterThan(image);
    expect(out.indexOf('class="hero-action"')).toBeGreaterThan(image);
  });

  it("falls back to the hero beside the text without an image", () => {
    const out = section(
      render((n) => {
        n.hero_1.layout = "cover";
        n.hero_1.image.nodes = [];
        delete n.image_hero;
      }, editableDemoSite()),
      "hero",
    );
    expect(out).toMatch(/^<section class="block hero">/);
    expect(out).not.toContain("hero-image");
  });

  it("Practice areas as an accordion", () => {
    const out = section(render(eightServices, editableDemoSite()), "services");
    expect(out).toMatch(/^<section class="block services services-as-accordion">/);
    const details = [...out.matchAll(/<details>([\s\S]*?)<\/details>/g)];
    expect(details).toHaveLength(8);
    expect(out).not.toContain("<details open");
    expect(details[2]?.[1]).toMatch(/<summary>[\s\S]*Oblast 3[\s\S]*3 000 Kč[\s\S]*<\/summary>/);
  });

  it("renders a service without a description as a plain row", () => {
    const out = section(
      render((n) => {
        eightServices(n);
        n.service_area_1.description = text("");
      }, editableDemoSite()),
      "services",
    );
    expect([...out.matchAll(/<details>/g)]).toHaveLength(7);
    expect(out).toContain("Oblast 1");
  });

  it("renders services as a list", () => {
    const out = section(
      render((n) => (n.services_1.layout = "list"), editableDemoSite()),
      "services",
    );
    expect(out).toMatch(/^<section class="block services services-as-list">/);
    expect(out).not.toContain("<details");
    expect(out).toContain('<p class="service-description">');
  });

  it("Team as a list", () => {
    const out = section(
      render((n) => (n.team_1.layout = "list")),
      "team",
    );
    expect(out).toMatch(/^<section class="block team team-as-list">/);
    expect(out).toContain("Kateřina");
    expect(out).toContain("lektorka");
    expect(out).toContain("Vede kroužky malování.");
    expect(out).not.toContain("<img");
  });

  it("Whole screenshots", () => {
    const fill = section(
      render(() => {}),
      "gallery",
    );
    const whole = section(
      render((n) => (n.gallery_work.image_fit = "whole")),
      "gallery",
    );
    expect(whole).toMatch(/^<section class="block gallery gallery-whole">/);
    expect(whole.replace(" gallery-whole", "")).toBe(fill);
  });

  it("passes html-validate with every variant", async () => {
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    const pages = [
      page(everyVariant, "index.html"),
      page(everyVariant, "galerie/index.html"),
      page(eightServices, "index.html", editableDemoSite()),
    ];
    for (const html of pages) {
      const report = await validator.validateString(html);
      expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
    }
  });
});
