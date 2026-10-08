import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import {
  listFieldId,
  listTarget,
  listTargetOfFieldId,
  locateMark,
  locateNode,
  selectionFor,
  settingsFieldId,
  settingsTarget,
} from "./locate";

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

  it("leads theme problems to their field in the Theme tab", () => {
    for (const field of [
      "color_primary",
      "color_secondary",
      "color_background",
      "color_text",
      "font_heading",
      "font_body",
      "radius",
      "content_width",
    ]) {
      expect(settingsTarget(doc(), "theme_1", field)).toEqual({ tab: "theme", field });
    }
    expect(settingsTarget(doc(), "theme_1", undefined)).toEqual({
      tab: "theme",
      field: "color_primary",
    });
  });

  it("leads logo problems to the Theme tab", () => {
    expect(settingsTarget(doc(), "site_1", "logo")).toEqual({ tab: "theme", field: "logo" });
    expect(settingsTarget(doc(), "site_1", "header_show_name")).toEqual({
      tab: "theme",
      field: "header_show_name",
    });
    const withLogo = doc();
    withLogo.nodes.brand = { id: "brand", type: "image", src: "pekarna-7c1e", alt: "" };
    (withLogo.nodes.site_1 as unknown as { logo: { nodes: string[] } }).logo.nodes = ["brand"];
    expect(settingsTarget(withLogo, "brand", "src")).toEqual({ tab: "theme", field: "logo" });
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
      focus_x: 50,
      focus_y: 50,
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

  it("leads business problems to the business settings' fields", () => {
    expect(settingsTarget(doc(), "business_1", "name")).toEqual({ tab: "business", field: "name" });
    expect(settingsTarget(doc(), "location_1", "phone")).toEqual({
      tab: "business",
      field: "phone",
      locationId: "location_1",
    });
    expect(settingsTarget(doc(), "location_1", "map_url")?.field).toBe("map_url");
    expect(settingsTarget(doc(), "location_1", "days")).toEqual({
      tab: "business",
      field: "hours_mon",
      locationId: "location_1",
    });
    expect(settingsTarget(doc(), "day_wed", undefined)).toEqual({
      tab: "business",
      field: "hours_wed",
      locationId: "location_1",
    });
  });

  it("names the Settings tab's element for site and business problems only", () => {
    expect(settingsFieldId(settingsTarget(doc(), "business_1", "name"))).toBe(
      "business-settings-name",
    );
    expect(settingsFieldId(settingsTarget(doc(), "location_1", "phone"))).toBe(
      "business-settings-location_1-phone",
    );
    expect(settingsFieldId(settingsTarget(doc(), "day_wed", undefined))).toBe(
      "business-settings-location_1-hours_wed",
    );
    expect(settingsFieldId({ tab: "site", field: "name" })).toBe("site-settings-name");
    expect(settingsFieldId({ tab: "page", pageId: "page_home", field: "title" })).toBeUndefined();
    expect(settingsFieldId({ tab: "theme", field: "radius" })).toBeUndefined();
    expect(settingsFieldId(undefined)).toBeUndefined();
  });

  it("leads a time range's problem to its day", () => {
    const d = doc();
    Object.assign(d.nodes, {
      range_x: { id: "range_x", type: "time_range", opens: "12:00", closes: "08:00" },
    });
    (d.nodes.day_thu as unknown as { ranges: { nodes: string[] } }).ranges.nodes = ["range_x"];
    expect(settingsTarget(d, "range_x", "closes")).toEqual({
      tab: "business",
      field: "hours_thu",
      locationId: "location_1",
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

describe("settingsTarget for a second location", () => {
  /** The demo site with a second location, "Kutná Hora", whose Monday has a broken range. */
  function branch() {
    const d = doc();
    const nodes = d.nodes as unknown as Record<string, Record<string, unknown>>;
    nodes.kh_mon = {
      id: "kh_mon",
      type: "opening_day",
      day: "mon",
      ranges: { nodes: ["kh_r"], marks: [], annotations: [] },
    };
    nodes.kh_r = { id: "kh_r", type: "time_range", opens: "17:00", closes: "08:00" };
    nodes.location_kh = {
      id: "location_kh",
      type: "location",
      name: "Kutná Hora",
      phone: "321",
      days: { nodes: ["kh_mon"], marks: [], annotations: [] },
    };
    return d;
  }

  it("leads a branch's phone to its field", () => {
    expect(settingsFieldId(settingsTarget(branch(), "location_kh", "phone"))).toBe(
      "business-settings-location_kh-phone",
    );
  });

  it("leads a branch's Monday hours to that location's Monday", () => {
    expect(settingsFieldId(settingsTarget(branch(), "kh_r", "closes"))).toBe(
      "business-settings-location_kh-hours_mon",
    );
  });
});

describe("listTarget (offer-and-about decision 7)", () => {
  // biome-ignore lint/suspicious/noExplicitAny: tests reshape the document.
  const withTeam = (): any => {
    // biome-ignore lint/suspicious/noExplicitAny: tests reshape the document.
    const doc = demoSite() as any;
    doc.nodes.portrait = {
      id: "portrait",
      type: "image",
      src: "a.webp",
      alt: "",
      decorative: false,
    };
    doc.nodes["person-1"] = {
      id: "person-1",
      type: "person",
      name: { content: "", marks: [], annotations: [] },
      image: { nodes: ["portrait"] },
    };
    doc.nodes.site_1.team = { nodes: ["person-1"], marks: [], annotations: [] };
    return doc;
  };

  it("leads to an item's text, its first text for the whole item, and its image", () => {
    const doc = withTeam();
    expect(listTarget(doc, "service_rolls", "price")).toEqual({
      section: "offer",
      collection: "services",
      index: 1,
      itemId: "service_rolls",
      field: "price",
    });
    expect(listTarget(doc, "service_rolls", undefined)?.field).toBe("name");
    expect(listTarget(doc, "person-1", "image")).toMatchObject({
      section: "about",
      field: "image",
    });
    expect(listTarget(doc, "portrait", "alt")).toMatchObject({
      itemId: "person-1",
      field: "image-alt",
    });
    expect(listTarget(doc, "hero_1", "heading")).toBeUndefined();
  });

  it("reads a field ID back, item IDs with dashes included", () => {
    const doc = withTeam();
    expect(
      listTargetOfFieldId(doc, "about", listFieldId("about", "person-1", "name")),
    ).toMatchObject({ index: 0, field: "name" });
    expect(
      listTargetOfFieldId(doc, "about", listFieldId("about", "person-1", "image-alt")),
    ).toMatchObject({ itemId: "person-1", field: "image-alt" });
    expect(listTargetOfFieldId(doc, "offer", "about-person-1-name")).toBeUndefined();
    expect(listTargetOfFieldId(doc, "offer", "offer-service_bread-price")).toMatchObject({
      collection: "services",
      index: 0,
    });
  });
});
