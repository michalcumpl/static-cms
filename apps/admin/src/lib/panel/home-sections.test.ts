import { STANDARD } from "@webmio/templates";
import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { homeSections } from "./home-sections";
import { designSummary } from "./summary";

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the document.
type Doc = { document_id: string; nodes: Record<string, any> };

describe("home page sections", () => {
  it("lists the home page's blocks in order, with their headings and switches", () => {
    const doc = demoSite() as Doc;
    doc.nodes.services_1.hidden = true;
    expect(homeSections(doc)).toEqual([
      { id: "hero_1", type: "hero", heading: "Čerstvý chléb každé ráno", hidden: false },
      { id: "services_1", type: "services", heading: "Co pečeme", hidden: true },
      { id: "rich_text_about", type: "rich_text", heading: "O nás", hidden: false },
    ]);
  });

  it("follows the home page, wherever it is listed", () => {
    const doc = demoSite() as Doc;
    doc.nodes.site_1.home_page_id = "page_contact";
    expect(homeSections(doc).map((s) => s.id)).toEqual(["rich_text_contact"]);
  });
});

describe("the design card", () => {
  it("Template named: the site's template with its description", () => {
    expect(designSummary(demoSite() as Doc).template).toEqual({
      name: STANDARD.name,
      description: STANDARD.description,
    });
  });
});
