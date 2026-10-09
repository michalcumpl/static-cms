import { describe, expect, it } from "vitest";
import { blockItems, socialKind } from "./collections.js";
import type { AnyNode, ServicesNode, SiteDocument } from "./schema/index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

function siteWith(serviceNames: string[], blocks: AnyNode[]): SiteDocument {
  const nodes: Record<string, AnyNode> = {};
  const ids = serviceNames.map((name, i) => {
    const id = `service_${i + 1}`;
    nodes[id] = {
      id,
      type: "service_item",
      name: text(name),
      description: text(""),
      price: text(""),
      slug: "",
      body: { nodes: [], marks: [], annotations: [] },
    };
    return id;
  });
  for (const block of blocks) nodes[block.id] = block;
  nodes.site_1 = {
    id: "site_1",
    type: "site",
    services: list(ids),
    team: list([]),
    testimonials: list([]),
    faqs: list([]),
  } as unknown as AnyNode;
  return { document_id: "site_1", nodes };
}

const block = (show: "all" | "chosen", refs: string[] = []): ServicesNode => ({
  id: "services_block",
  type: "services",
  hidden: false,
  layout: "cards",
  heading: text(""),
  show,
  chosen: list(refs.map((_, i) => `ref_${i + 1}`)),
});
const refs = (itemIds: string[]): AnyNode[] =>
  itemIds.map((item_id, i) => ({ id: `ref_${i + 1}`, type: "item_ref", item_id }));

const names = (doc: SiteDocument, b: ServicesNode) =>
  blockItems(doc, b).map((item) => (item.type === "service_item" ? item.name.content : ""));

describe("blockItems", () => {
  it("shows the whole collection in its order", () => {
    const b = block("all");
    expect(names(siteWith(["Chléb", "Rohlíky", "Dorty"], [b]), b)).toEqual([
      "Chléb",
      "Rohlíky",
      "Dorty",
    ]);
  });

  it("shows chosen items in the block's order", () => {
    const b = block("chosen", ["service_3", "service_1"]);
    const doc = siteWith(["Chléb", "Rohlíky", "Dorty"], [b, ...refs(["service_3", "service_1"])]);
    expect(names(doc, b)).toEqual(["Dorty", "Chléb"]);
  });

  it("skips a reference to an item that isn't in the collection", () => {
    const b = block("chosen", ["service_9", "service_2"]);
    const doc = siteWith(["Chléb", "Rohlíky"], [b, ...refs(["service_9", "service_2"])]);
    expect(names(doc, b)).toEqual(["Rohlíky"]);
  });

  it("shows nothing for an empty collection", () => {
    const b = block("all");
    expect(blockItems(siteWith([], [b]), b)).toEqual([]);
  });
});

describe("socialKind", () => {
  it.each([
    ["https://www.facebook.com/pekarna", "Facebook"],
    ["https://m.facebook.com/pekarna", "Facebook"],
    ["https://www.instagram.com/pekarnaulipy", "Instagram"],
    ["https://cz.linkedin.com/company/pekarna", "LinkedIn"],
    ["https://www.linkedin.com/company/pekarna", "LinkedIn"],
    ["https://youtube.com/@pekarna", "YouTube"],
    ["https://x.com/pekarna", "X"],
    ["https://twitter.com/pekarna", "X"],
    ["https://www.tiktok.com/@pekarna", "TikTok"],
    ["https://www.pinterest.com/pekarna", "pinterest.com"],
  ])("names %s %s", (url, label) => {
    expect(socialKind(url).label).toBe(label);
  });

  it("knows the kind of known networks only", () => {
    expect(socialKind("https://instagram.com/x").kind).toBe("instagram");
    expect(socialKind("https://mastodon.social/@x").kind).toBeUndefined();
  });

  it("has no label for an address it can't read", () => {
    expect(socialKind("not an address")).toEqual({ kind: undefined, label: "" });
  });
});
