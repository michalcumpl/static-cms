import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// Banners (banner-block, site-document delta "Banner").

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** The demo site with a banner "Last minute" at the start of "Kontakt", with a photo and a button. */
function site(banner: Record<string, unknown> = {}) {
  const { doc, nodes } = editableDemoSite();
  nodes.image_banner = { ...nodes.image_hero, id: "image_banner", alt: "Letadlo nad mořem" };
  nodes.link_banner = {
    id: "link_banner",
    type: "page_link",
    label: text("Objednat"),
    page_id: "page_home",
  };
  nodes.banner_1 = {
    id: "banner_1",
    type: "banner",
    hidden: false,
    heading: text("Last minute"),
    text: text("Odlety z Brna"),
    image: list(["image_banner"]),
    action: list(["link_banner"]),
    ...banner,
  };
  nodes.page_contact.blocks.nodes.unshift("banner_1");
  return { doc, nodes };
}

const problemsOf = (doc: unknown, id = "banner_1") =>
  validateSite(doc).problems.filter((p) => p.nodeId === id);

describe("banners", () => {
  it("A banner between two blocks: valid with no problems", () => {
    const { doc, nodes } = site();
    // Anywhere on a page, also after other blocks, and more than once.
    nodes.page_home.blocks.nodes.push("banner_1");
    expect(validateSite(doc).problems.filter((p) => p.nodeId.includes("banner"))).toEqual([]);
    expect(validateSite(doc).valid).toBe(true);
  });

  it("A colour band: a banner without a photo or a button is fine", () => {
    expect(problemsOf(site({ image: list([]), action: list([]), text: text("") }).doc)).toEqual([]);
  });

  it("Banner without a heading: empty-heading", () => {
    expect(problemsOf(site({ heading: text(" ") }).doc)).toEqual([
      expect.objectContaining({ code: "empty-heading", severity: "error", property: "heading" }),
    ]);
  });

  it("refuses a second photo or button", () => {
    const { doc, nodes } = site();
    nodes.image_banner_2 = { ...nodes.image_banner, id: "image_banner_2" };
    nodes.banner_1.image = list(["image_banner", "image_banner_2"]);
    expect(problemsOf(doc).map((p) => [p.code, p.property])).toEqual([["too-many-items", "image"]]);
  });

  it("A smaller subheading after a banner: no heading-skip", () => {
    const { doc, nodes } = site();
    nodes.sub_address.level = 3;
    expect(problemsOf(doc, "sub_address")).toEqual([]);
    nodes.page_contact.blocks.nodes.shift();
    expect(problemsOf(doc, "sub_address").map((p) => p.code)).toEqual(["heading-skip"]);
  });

  it("asks for the photo's description", () => {
    const { doc, nodes } = site();
    nodes.image_banner.alt = "";
    expect(problemsOf(doc, "image_banner").map((p) => p.code)).toEqual(["missing-alt"]);
  });
});
