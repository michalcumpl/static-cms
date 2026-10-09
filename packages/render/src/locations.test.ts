import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

// Several locations (business-locations, site-rendering delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** The demo bakery with two shops, "Kolín – Lipová" and "Kutná Hora", and both business blocks on "Kontakt". */
function twoShops(options: { contact?: string; hours?: string; heading?: string } = {}) {
  const { doc, nodes } = editableDemoSite();
  nodes.business_1.name = "Pekárna U Lípy";
  nodes.business_1.business_type = "Bakery";
  Object.assign(nodes.location_1, {
    name: "Kolín – Lipová",
    street: "Lipová 12",
    postal_code: "280 02",
    city: "Kolín",
    phone: "+420321123456",
  });
  nodes.range_mon = { id: "range_mon", type: "time_range", opens: "06:00", closes: "17:00" };
  nodes.day_mon.ranges = list(["range_mon"]);
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
    const id = `kh_${day}`;
    nodes[id] = { id, type: "opening_day", day, ranges: list([]) };
    return id;
  });
  nodes.kh_range = { id: "kh_range", type: "time_range", opens: "07:00", closes: "15:00" };
  nodes.kh_sat.ranges = list(["kh_range"]);
  nodes.location_kh = {
    id: "location_kh",
    type: "location",
    name: "Kutná Hora",
    street: "Palackého 3",
    postal_code: "284 01",
    city: "Kutná Hora",
    country: "CZ",
    phone: "+420327111222",
    email: "",
    map_url: "",
    hours_note: "",
    days: list(days),
  };
  nodes.business_1.locations = list(["location_1", "location_kh"]);
  nodes.contact_1 = {
    id: "contact_1",
    type: "contact",
    hidden: false,
    heading: text(options.heading ?? "Kde nás najdete"),
    show_address: true,
    show_phone: true,
    show_email: true,
    show_map: false,
    location_id: options.contact ?? "",
  };
  nodes.hours_1 = {
    id: "hours_1",
    type: "opening_hours",
    hidden: false,
    heading: text("Otevírací doba"),
    location_id: options.hours ?? "",
  };
  nodes.page_contact.blocks.nodes.push("contact_1", "hours_1");
  return { doc, nodes };
}

function pages(doc: unknown, siteUrl?: string) {
  const result = renderSite(doc, siteUrl ? { siteUrl } : {});
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return {
    home: page("index.html"),
    contact: page("kontakt/index.html"),
    notFound: result.site.notFound,
  };
}

const section = (html: string, cls: string) => {
  const start = html.indexOf(`<section class="block ${cls}">`);
  return html.slice(start, html.indexOf("</section>", start));
};
const squash = (html: string) => html.replace(/\s+</g, "<").replace(/>\s+/g, ">");

describe("Business blocks for several locations", () => {
  it("Contact block for all shops", () => {
    const contact = squash(section(pages(twoShops().doc).contact, "contact"));
    expect(contact).toContain("<h2>Kde nás najdete</h2>");
    const kolin = contact.indexOf("<h3>Kolín – Lipová</h3>");
    const kh = contact.indexOf("<h3>Kutná Hora</h3>");
    expect(kolin).toBeGreaterThan(0);
    expect(kh).toBeGreaterThan(kolin);
    expect(contact.slice(kolin, kh)).toContain("Lipová 12");
    expect(contact.slice(kh)).toContain("Palackého 3");
  });

  it("names locations as h2 when the block has no heading", () => {
    const contact = squash(section(pages(twoShops({ heading: "" }).doc).contact, "contact"));
    expect(contact).toContain("<h2>Kolín – Lipová</h2>");
    expect(contact).not.toContain("<h3>");
  });

  it("One shop chosen", () => {
    const hours = squash(
      section(pages(twoShops({ hours: "location_kh" }).doc).contact, "opening-hours"),
    );
    expect(hours).not.toContain("<h3>");
    expect(hours).toContain('<th scope="row">So</th><td>7:00–15:00</td>');
    expect(hours).not.toContain("6:00–17:00");
  });

  it("leaves out a location with nothing to show for the block", () => {
    const { doc, nodes } = twoShops();
    nodes.kh_sat.ranges = list([]);
    delete nodes.kh_range;
    const hours = squash(section(pages(doc).contact, "opening-hours"));
    expect(hours).toContain("<h3>Kolín – Lipová</h3>");
    expect(hours).not.toContain("Kutná Hora");
  });
});

describe("Footer contact details with several locations", () => {
  it("Two shops in the footer: names, addresses and phones, no hours", () => {
    const { home, contact, notFound } = pages(twoShops().doc);
    for (const html of [home, contact, notFound]) {
      const footer = squash(html.slice(html.indexOf("<footer")));
      expect(footer).toContain("<p><strong>Kolín – Lipová</strong></p>");
      expect(footer).toContain("<p><strong>Kutná Hora</strong></p>");
      expect(footer).toContain('href="tel:+420327111222"');
      expect(footer).not.toContain("<table");
    }
  });

  it("passes html-validate", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(pages(twoShops().doc).contact);
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});

describe("Structured data with several locations", () => {
  it("Two shops", () => {
    const { home } = pages(twoShops().doc, "https://pekarna.cz");
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(home)?.[1] ?? "{}";
    const graph = JSON.parse(json)["@graph"] as LooseNodes[];
    expect(graph[1]).toMatchObject({ "@type": "Organization", name: "Pekárna U Lípy" });
    expect(graph[1]?.address).toBeUndefined();
    expect(graph.slice(2)).toEqual([
      expect.objectContaining({
        "@type": "Bakery",
        "@id": "https://pekarna.cz/#location-1",
        name: "Pekárna U Lípy – Kolín – Lipová",
        address: expect.objectContaining({ streetAddress: "Lipová 12" }),
        parentOrganization: { "@id": "https://pekarna.cz/#organization" },
      }),
      expect.objectContaining({
        "@type": "Bakery",
        "@id": "https://pekarna.cz/#location-2",
        name: "Pekárna U Lípy – Kutná Hora",
        telephone: "+420327111222",
        openingHoursSpecification: [
          expect.objectContaining({ dayOfWeek: ["Saturday"], opens: "07:00", closes: "15:00" }),
        ],
      }),
    ]);
  });
});
