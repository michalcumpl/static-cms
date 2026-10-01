import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../test/fixtures.js";
import { renderSite } from "./index.js";

function setHours(nodes: LooseNodes, day: string, ranges: [string, string][]) {
  const ids = ranges.map(([opens, closes], i) => {
    const id = `range_${day}_${i}`;
    nodes[id] = { id, type: "time_range", opens, closes };
    return id;
  });
  nodes[`day_${day}`].ranges = { nodes: ids, marks: [], annotations: [] };
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
