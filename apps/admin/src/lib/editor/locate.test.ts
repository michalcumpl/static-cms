import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { locateNode, selectionFor } from "./locate";

type Doc = Parameters<typeof locateNode>[0];
const doc = () => demoSite() as Doc;

describe("locateNode", () => {
  it("finds blocks and nested nodes with their page", () => {
    expect(locateNode(doc(), "services_1")).toEqual({
      path: ["site_1", "pages", 0, "blocks", 1],
      pageIndex: 0,
      parentType: "page",
    });
    expect(locateNode(doc(), "sub_hours")).toEqual({
      path: ["site_1", "pages", 1, "blocks", 0, "body", 4],
      pageIndex: 1,
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
