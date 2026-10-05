import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

function setHours(nodes: LooseNodes, day: string, ranges: [string, string][]) {
  const ids = ranges.map(([opens, closes], i) => {
    const id = `range_${day}_${i}`;
    nodes[id] = { id, type: "time_range", opens, closes };
    return id;
  });
  nodes[`day_${day}`].ranges = { nodes: ids, marks: [], annotations: [] };
}

/** The demo site without its services, so the organization has no offer catalog. */
function withoutServices(nodes: LooseNodes): void {
  for (const id of nodes.site_1.services.nodes) delete nodes[id];
  delete nodes.emphasis_cakes;
  nodes.site_1.services.nodes = [];
}

function organization(doc: unknown): Record<string, unknown> {
  const result = renderSite(doc, { siteUrl: "https://anideti.cz" });
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const home = result.site.pages.find((p) => p.path === "index.html")?.html ?? "";
  const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(home)?.[1] ?? "{}";
  return JSON.parse(json)["@graph"][1];
}

describe("organization structured data", () => {
  it("stays an Organization while the business has no address or phone", () => {
    const { doc, nodes } = editableDemoSite();
    withoutServices(nodes);
    nodes.business_1.email = "objednavky@pekarna-ulipy.example";
    expect(organization(doc)).toEqual({
      "@type": "Organization",
      "@id": "https://anideti.cz/#organization",
      name: "Pekárna U Lípy",
      url: "https://anideti.cz/",
    });
  });

  it("describes a bakery with its address, phone and opening hours", () => {
    const { doc, nodes } = editableDemoSite();
    withoutServices(nodes);
    Object.assign(nodes.business_1, {
      business_type: "Bakery",
      street: "Lipová 12",
      postal_code: "280 02",
      city: "Kolín",
      phone: "+420321123456",
      email: "objednavky@pekarna-ulipy.example",
      map_url: "https://maps.app.goo.gl/abc",
    });
    for (const day of ["mon", "tue", "wed", "thu", "fri"])
      setHours(nodes, day, [["06:00", "17:00"]]);
    setHours(nodes, "sat", [["07:00", "11:00"]]);
    expect(organization(doc)).toEqual({
      "@type": "Bakery",
      "@id": "https://anideti.cz/#organization",
      name: "Pekárna U Lípy",
      url: "https://anideti.cz/",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Lipová 12",
        postalCode: "280 02",
        addressLocality: "Kolín",
        addressCountry: "CZ",
      },
      telephone: "+420321123456",
      email: "objednavky@pekarna-ulipy.example",
      hasMap: "https://maps.app.goo.gl/abc",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "06:00",
          closes: "17:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday"],
          opens: "07:00",
          closes: "11:00",
        },
      ],
    });
  });

  it("lists a day with a lunch break in two entries", () => {
    const { doc, nodes } = editableDemoSite();
    nodes.business_1.city = "Kolín";
    setHours(nodes, "mon", [
      ["08:00", "12:00"],
      ["13:00", "17:00"],
    ]);
    setHours(nodes, "tue", [["08:00", "12:00"]]);
    const specs = organization(doc).openingHoursSpecification as { dayOfWeek: string[] }[];
    expect(specs.map((s) => s.dayOfWeek)).toEqual([["Monday", "Tuesday"], ["Monday"]]);
  });

  it("Services and profiles", () => {
    const { doc, nodes } = editableDemoSite();
    for (const id of nodes.site_1.services.nodes.slice(1)) delete nodes[id];
    delete nodes.emphasis_cakes;
    nodes.site_1.services.nodes = ["service_bread"];
    nodes.service_bread.name.content = "Chléb";
    nodes.service_bread.description.content = "";
    nodes.service_cake = {
      ...nodes.service_bread,
      id: "service_cake",
      name: { content: "Dorty na zakázku", marks: [], annotations: [] },
    };
    nodes.site_1.services.nodes.push("service_cake");
    nodes.social_ig = {
      id: "social_ig",
      type: "social_link",
      url: "https://instagram.com/pekarna",
    };
    nodes.business_1.social = { nodes: ["social_ig"], marks: [], annotations: [] };
    const org = organization(doc);
    expect(org.sameAs).toEqual(["https://instagram.com/pekarna"]);
    expect(org.hasOfferCatalog).toEqual({
      "@type": "OfferCatalog",
      name: "Služby",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Chléb" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Dorty na zakázku" } },
      ],
    });
  });

  it("uses the business name when it has one", () => {
    const { doc, nodes } = editableDemoSite();
    Object.assign(nodes.business_1, { name: "Pekárna U Lípy s.r.o.", phone: "+420321123456" });
    expect(organization(doc)).toMatchObject({
      "@type": "LocalBusiness",
      name: "Pekárna U Lípy s.r.o.",
      telephone: "+420321123456",
    });
    expect(organization(doc)).not.toHaveProperty("address");
  });
});
