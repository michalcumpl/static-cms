import { describe, expect, it } from "vitest";
import { readSite, type SourcePage } from "./site.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";
import { pageUnchanged } from "./unchanged.js";

const pages: SourcePage[] = ["/", "/o-nas/"].map((path) => ({
  url: new URL(path, `${FIXTURE_ORIGINS.bakery}/`).href,
  html: fixtureText("bakery", path),
  css: [],
}));
const site = readSite(pages, { languages: ["cs"], fallbackLanguage: "cs" });
type Nodes = Record<string, Record<string, unknown> & { type: string }>;
const imported = site.document as unknown as { nodes: Nodes };
const home = site.origins[0]?.pageId ?? "";
const blocksOf = (doc: { nodes: Nodes }) =>
  (doc.nodes[home]?.blocks as { nodes: string[] } | undefined)?.nodes ?? [];

describe("whether the owner left a page as imported", () => {
  it("An untouched page: unchanged, even saved under other node IDs", () => {
    const current = structuredClone(imported);
    expect(pageUnchanged(imported, current, home)).toBe(true);
    // The same block under another ID, as an editor's copy would have.
    const [first] = blocksOf(current);
    const block = current.nodes[first ?? ""];
    if (!block) throw new Error("no block");
    current.nodes.copy_1 = { ...block, id: "copy_1" };
    delete current.nodes[first ?? ""];
    blocksOf(current)[0] = "copy_1";
    expect(pageUnchanged(imported, current, home)).toBe(true);
  });

  it("A changed paragraph: changed", () => {
    const current = structuredClone(imported);
    // The first paragraph of the page's first text block.
    const block = blocksOf(current).find((id) => current.nodes[id]?.type === "rich_text");
    const paragraph = (current.nodes[block ?? ""]?.body as { nodes: string[] } | undefined)
      ?.nodes[0];
    const node = current.nodes[paragraph ?? ""];
    if (!node) throw new Error("no paragraph");
    const content = node.content as { content: string };
    node.content = { ...content, content: `${content.content} Nově.` };
    expect(pageUnchanged(imported, current, home)).toBe(false);
  });

  it("A reordered block: changed", () => {
    const current = structuredClone(imported);
    blocksOf(current).reverse();
    expect(pageUnchanged(imported, current, home)).toBe(false);
  });

  it("A deleted page: changed", () => {
    const current = structuredClone(imported);
    delete current.nodes[home];
    expect(pageUnchanged(imported, current, home)).toBe(false);
  });
});
