import { migrateSite } from "@webmio/model";
import { type LooseNodes, loadFixture } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

// Moved from @webmio/model's migrate.test.ts (package-split): the model doesn't render.
describe("pages of an upgraded version-6 document", () => {
  const text = (content: string) => ({ content, marks: [], annotations: [] });
  const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
  const service = (id: string, name: string) => ({
    id,
    type: "service_item",
    name: text(name),
    description: text(""),
    price: text(""),
  });
  const serviceNames = (html = "") =>
    [...html.matchAll(/<p class="service-name">([^<]*)<\/p>/g)].map((m) => m[1]);

  it("Highlights and a full list: each page lists the services its block held before", () => {
    const v6 = loadFixture("demo-site-v6.json") as { document_id: string; nodes: LooseNodes };
    for (const id of v6.nodes.services_1.items.nodes) delete v6.nodes[id];
    delete v6.nodes.emphasis_cakes;
    const home = [service("s_bread", "Chléb"), service("s_rolls", "Rohlíky")];
    const contact = [
      service("s_bread_2", "Chléb"),
      service("s_rolls_2", "Rohlíky"),
      service("s_cakes", "Dorty"),
    ];
    for (const item of [...home, ...contact]) v6.nodes[item.id] = item;
    v6.nodes.services_1.items = list(home.map((i) => i.id));
    v6.nodes.services_2 = {
      id: "services_2",
      type: "services",
      heading: text("Služby"),
      items: list(contact.map((i) => i.id)),
    };
    v6.nodes.page_contact.blocks.nodes.push("services_2");
    const result = renderSite(migrateSite(v6));
    if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
    const [homeHtml, contactHtml] = result.site.pages.map((page) => page.html);
    expect(serviceNames(homeHtml)).toEqual(["Chléb", "Rohlíky"]);
    expect(serviceNames(contactHtml)).toEqual(["Chléb", "Rohlíky", "Dorty"]);
  });
});
