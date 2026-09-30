import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { locateMark, locateNode, pageSettingsTarget, selectionFor } from "./locate";

type Doc = Parameters<typeof locateNode>[0];
const doc = () => demoSite() as Doc;

describe("locateNode", () => {
  it("finds blocks and nested nodes with their page", () => {
    expect(locateNode(doc(), "services_1")).toEqual({
      path: ["site_1", "pages", 0, "blocks", 1],
      pageId: "page_home",
      parentType: "page",
    });
    expect(locateNode(doc(), "sub_hours")).toEqual({
      path: ["site_1", "pages", 1, "blocks", 0, "body", 4],
      pageId: "page_contact",
      parentType: "rich_text",
    });
  });

  it("finds navigation items outside pages", () => {
    expect(locateNode(doc(), "nav_contact")).toEqual({
      path: ["site_1", "nav", "items", 1],
      parentType: "nav",
    });
  });

  it("has no place for marks, unknown or unreachable nodes", () => {
    expect(locateNode(doc(), "strong_about")).toBeUndefined();
    expect(locateNode(doc(), "nope")).toBeUndefined();
  });
});

describe("selectionFor", () => {
  const select = (id: string) => {
    const d = doc();
    const location = locateNode(d, id);
    return location && selectionFor(d, id, location);
  };

  it("puts the caret at the start of the node's first text", () => {
    expect(select("sub_about")).toEqual({
      type: "text",
      path: ["site_1", "pages", 0, "blocks", 2, "body", 0, "content"],
      anchor_offset: 0,
      focus_offset: 0,
    });
    expect(select("nav_contact")).toMatchObject({
      type: "text",
      path: ["site_1", "nav", "items", 1, "label"],
    });
  });

  it("selects blocks without text as nodes, and images by their picture", () => {
    expect(select("rich_text_about")).toEqual({
      type: "node",
      path: ["site_1", "pages", 0, "blocks"],
      anchor_offset: 2,
      focus_offset: 3,
    });
    expect(select("image_hero")).toEqual({
      type: "property",
      path: ["site_1", "pages", 0, "blocks", 0, "image", 0, "src"],
    });
  });

  it("doesn't node-select pages", () => {
    expect(select("page_contact")).toBeUndefined();
  });
});

describe("pageSettingsTarget", () => {
  it("leads a page's title, slug and SEO problems to that page's field", () => {
    expect(pageSettingsTarget(doc(), "page_contact", "slug")).toEqual({
      pageId: "page_contact",
      field: "slug",
    });
    expect(pageSettingsTarget(doc(), "page_home", "title")).toEqual({
      pageId: "page_home",
      field: "title",
    });
    expect(pageSettingsTarget(doc(), "page_home", "seo_description")?.field).toBe(
      "seo_description",
    );
  });

  it("leads a home page problem to the home setting of the current page", () => {
    expect(pageSettingsTarget(doc(), "site_1", "home_page_id")).toEqual({
      pageId: undefined,
      field: "home",
    });
  });

  it("is undefined for problems about other nodes or properties", () => {
    expect(pageSettingsTarget(doc(), "hero_1", "heading")).toBeUndefined();
    expect(pageSettingsTarget(doc(), "page_home", "blocks")).toBeUndefined();
    expect(pageSettingsTarget(doc(), "site_1", "name")).toBeUndefined();
  });
});

describe("locateMark", () => {
  it("finds the text a link mark belongs to, its range and its page", () => {
    expect(locateMark(doc(), "internal_contact")).toEqual({
      path: ["site_1", "pages", 0, "blocks", 2, "body", 1, "content"],
      start: 112,
      end: 127,
      pageId: "page_home",
    });
    expect(locateMark(doc(), "link_tel")).toMatchObject({
      path: ["site_1", "pages", 1, "blocks", 0, "body", 3, "content"],
      pageId: "page_contact",
    });
  });

  it("finds nothing for nodes that aren't marks", () => {
    expect(locateMark(doc(), "hero_1")).toBeUndefined();
    expect(locateMark(doc(), "nope")).toBeUndefined();
  });
});
