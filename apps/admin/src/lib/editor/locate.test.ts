import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { locateMark, locateNode, selectionFor, settingsTarget } from "./locate";

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

describe("settingsTarget", () => {
  it("leads a page's title, slug and SEO problems to that page's field", () => {
    expect(settingsTarget(doc(), "page_contact", "slug")).toEqual({
      tab: "page",
      pageId: "page_contact",
      field: "slug",
    });
    expect(settingsTarget(doc(), "page_home", "title")).toEqual({
      tab: "page",
      pageId: "page_home",
      field: "title",
    });
    expect(settingsTarget(doc(), "page_home", "seo_description")?.field).toBe("seo_description");
  });

  it("leads a home page problem to the home setting of the current page", () => {
    expect(settingsTarget(doc(), "site_1", "home_page_id")).toEqual({
      tab: "page",
      pageId: undefined,
      field: "home",
    });
  });

  it("leads site problems to the site settings", () => {
    expect(settingsTarget(doc(), "site_1", "name")).toEqual({ tab: "site", field: "name" });
    expect(settingsTarget(doc(), "site_1", "favicon")).toEqual({ tab: "site", field: "favicon" });
    expect(settingsTarget(doc(), "site_1", "share_image")).toEqual({
      tab: "site",
      field: "share_image",
    });
  });

  it("leads problems of the favicon's and share images' own nodes to their fields", () => {
    const d = doc();
    const image = (id: string) => ({
      id,
      type: "image",
      src: id,
      alt: "",
      decorative: false,
      width: 100,
      height: 100,
    });
    const list = (ids: string[]) => ({ nodes: ids, marks: [], annotations: [] });
    Object.assign(d.nodes, {
      image_logo: image("image_logo"),
      image_site_share: image("image_site_share"),
      image_page_share: image("image_page_share"),
    });
    Object.assign(d.nodes.site_1 as object, {
      favicon: list(["image_logo"]),
      share_image: list(["image_site_share"]),
    });
    Object.assign(d.nodes.page_contact as object, { share_image: list(["image_page_share"]) });

    expect(settingsTarget(d, "image_logo", "width")).toEqual({ tab: "site", field: "favicon" });
    expect(settingsTarget(d, "image_site_share", "alt")).toEqual({
      tab: "site",
      field: "share_image_alt",
    });
    expect(settingsTarget(d, "image_site_share", "width")).toEqual({
      tab: "site",
      field: "share_image",
    });
    expect(settingsTarget(d, "image_page_share", "alt")).toEqual({
      tab: "page",
      pageId: "page_contact",
      field: "share_image_alt",
    });
    expect(settingsTarget(d, "page_contact", "share_image")).toEqual({
      tab: "page",
      pageId: "page_contact",
      field: "share_image",
    });
  });

  it("is undefined for problems about other nodes or properties", () => {
    expect(settingsTarget(doc(), "hero_1", "heading")).toBeUndefined();
    expect(settingsTarget(doc(), "page_home", "blocks")).toBeUndefined();
    expect(settingsTarget(doc(), "site_1", "theme")).toBeUndefined();
    expect(settingsTarget(doc(), "image_hero", "alt")).toBeUndefined();
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
