import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// The registry as `@webmio/templates` would pass it: Standard at release 1.
const TEMPLATES = new Map([["standard", 1]]);

const codes = (input: unknown, templates?: ReadonlyMap<string, number>) =>
  validateSite(input, { templates }).problems.map((p) => [p.severity, p.code, p.nodeId]);

describe("site template", () => {
  it("Standard at release 1", () => {
    const { doc } = editableDemoSite();
    expect(validateSite(doc, { templates: TEMPLATES }).problems).toEqual([]);
  });

  it("Unknown template", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.template = "bakery";
    expect(codes(doc, TEMPLATES)).toEqual([["error", "unknown-template", "site_1"]]);
    expect(validateSite(doc, { templates: TEMPLATES }).problems[0]?.message).toBe(
      `The site's template "bakery" doesn't exist.`,
    );
  });

  it("Release from the future", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.template_release = 4;
    expect(codes(doc, new Map([["standard", 2]]))).toEqual([
      ["error", "unknown-template-release", "site_1"],
    ]);
  });

  it("accepts an older release, which upgrading brings up to date", () => {
    const { doc } = editableDemoSite();
    expect(codes(doc, new Map([["standard", 3]]))).toEqual([]);
  });

  it("checks only the shape without the registry", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.site_1.template = "bakery";
    nodes.site_1.template_release = 9;
    expect(codes(doc)).toEqual([]);
    nodes.site_1.template = "Bakery Shop";
    expect(codes(doc)).toEqual([["error", "unknown-template", "site_1"]]);
    nodes.site_1.template = "bakery";
    nodes.site_1.template_release = 0;
    expect(codes(doc)).toEqual([["error", "invalid-value", "site_1"]]);
  });
});

describe("hidden blocks", () => {
  it("Hidden testimonials: a hidden block is valid and keeps its content", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.services_1.hidden = true;
    expect(validateSite(doc).problems).toEqual([]);
    expect(nodes.services_1.heading.content).toBe("Co pečeme");
  });

  it("validates a hidden block as any other", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.hidden = true;
    nodes.hero_1.heading = { content: "", marks: [], annotations: [] };
    expect(codes(doc)).toEqual([["error", "empty-heading", "hero_1"]]);
  });

  it("Everything hidden", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.title = "Ceník";
    nodes.rich_text_contact.hidden = true;
    const problems = validateSite(doc).problems;
    expect(problems.map((p) => [p.severity, p.code, p.nodeId])).toEqual([
      ["warning", "page-shows-nothing", "page_contact"],
    ]);
    expect(problems[0]?.message).toBe(
      `"Ceník" shows nothing but its title; add a block or show a hidden one.`,
    );
  });

  it("warns about a page without blocks", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.page_contact.blocks.nodes = [];
    // The removed block's nodes are left unreachable; only the page warning matters here.
    const pageProblems = codes(doc).filter(([, code]) => code !== "unreachable-node");
    expect(pageProblems).toEqual([["warning", "page-shows-nothing", "page_contact"]]);
  });

  it("Hidden hero not first", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.hero_1.hidden = true;
    nodes.page_home.blocks.nodes = ["rich_text_about", "hero_1", "services_1"];
    expect(codes(doc)).toEqual([["error", "hero-not-first", "hero_1"]]);
  });
});
