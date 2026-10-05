import { describe, expect, it } from "vitest";
import { editableDemoSite, type LooseNodes } from "../testing.js";
import { validateSite } from "./index.js";

const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const text = (content: string) => ({ content, marks: [], annotations: [] });

/** The demo site with a filled-in business and, optionally, opening hours per day. */
function site(hours: Partial<Record<string, [string, string][]>> = {}) {
  const { doc, nodes } = editableDemoSite();
  Object.assign(nodes.location_1, {
    street: "Lipová 12",
    postal_code: "280 02",
    city: "Kolín",
    phone: "+420321123456",
    email: "objednavky@pekarna-ulipy.example",
  });
  for (const [day, ranges] of Object.entries(hours)) {
    const ids = (ranges ?? []).map(([opens, closes], i) => {
      const id = `range_${day}_${i}`;
      nodes[id] = { id, type: "time_range", opens, closes };
      return id;
    });
    nodes[`day_${day}`].ranges = list(ids);
  }
  return { doc, nodes };
}

/** Adds a contact and an opening hours block to the page "Kontakt". */
function addBusinessBlocks(nodes: LooseNodes) {
  nodes.contact_1 = {
    id: "contact_1",
    type: "contact",
    heading: text("Kde nás najdete"),
    show_address: true,
    show_phone: true,
    show_email: true,
    show_map: true,
    location_id: "",
  };
  nodes.hours_1 = {
    id: "hours_1",
    type: "opening_hours",
    heading: text("Otevírací doba"),
    location_id: "",
  };
  nodes.page_contact.blocks.nodes.push("contact_1", "hours_1");
}

const problems = (doc: unknown) => validateSite(doc).problems;
const only = (doc: unknown) => problems(doc).map((p) => [p.code, p.message]);

describe("business details", () => {
  it("accepts filled-in details", () => {
    const { doc } = site();
    expect(problems(doc)).toEqual([]);
  });

  it("accepts empty details", () => {
    const { doc } = editableDemoSite();
    expect(problems(doc)).toEqual([]);
  });

  it("wants the phone in international form", () => {
    const { doc, nodes } = site();
    nodes.location_1.phone = "321 123 456";
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-phone",
        severity: "error",
        nodeId: "location_1",
        property: "phone",
        message:
          'The phone number "321 123 456" must be in international form, like +420 321 123 456.',
      }),
    ]);
  });

  it("checks the email, map address and country", () => {
    const { doc, nodes } = site();
    nodes.location_1.email = "objednavky";
    nodes.location_1.map_url = "http://maps.example/pekarna";
    nodes.location_1.country = "Czechia";
    expect(problems(doc).map((p) => [p.code, p.property])).toEqual([
      ["invalid-email", "email"],
      ["invalid-map-url", "map_url"],
      ["invalid-country", "country"],
    ]);
  });

  it("needs each day from Monday to Sunday once", () => {
    const { doc, nodes } = site();
    nodes.location_1.days.nodes = [...nodes.location_1.days.nodes].reverse();
    expect(problems(doc)).toContainEqual(
      expect.objectContaining({ code: "invalid-value", nodeId: "location_1", property: "days" }),
    );
  });
});

describe("opening hours", () => {
  it("accepts a lunch break and midnight closing", () => {
    const { doc } = site({
      mon: [
        ["08:00", "12:00"],
        ["13:00", "17:00"],
      ],
      fri: [["18:00", "24:00"]],
    });
    expect(problems(doc)).toEqual([]);
  });

  it("reports hours that close before they open, by day", () => {
    const { doc } = site({ tue: [["17:00", "08:00"]] });
    expect(only(doc)).toEqual([
      ["invalid-hours", "Tuesday's hours close before they open (17:00–08:00)."],
    ]);
  });

  it("reports overlapping hours", () => {
    const { doc } = site({
      wed: [
        ["08:00", "13:00"],
        ["12:00", "17:00"],
      ],
    });
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-hours",
        nodeId: "range_wed_1",
        message:
          "Wednesday's hours overlap or are out of order; each range must start after the previous one ends.",
      }),
    ]);
  });

  it("reports times that aren't times", () => {
    const { doc } = site({ thu: [["25:00", "26:00"]] });
    expect(problems(doc)).toEqual([
      expect.objectContaining({
        code: "invalid-value",
        nodeId: "range_thu_0",
        property: "opens",
        message: `Thursday's hours: "25:00" is not a time; use hours and minutes, like 08:30.`,
      }),
    ]);
  });
});

describe("business blocks", () => {
  it("are valid with details to show", () => {
    const { doc, nodes } = site({ mon: [["06:00", "17:00"]] });
    addBusinessBlocks(nodes);
    expect(problems(doc)).toEqual([]);
  });

  it("warn while there is nothing to show", () => {
    const { doc, nodes } = editableDemoSite();
    addBusinessBlocks(nodes);
    const result = validateSite(doc);
    expect(result.valid).toBe(true);
    expect(result.problems.map((p) => [p.code, p.nodeId, p.message])).toEqual([
      [
        "nothing-to-show",
        "contact_1",
        'The contact block on "Kontakt" has nothing to show yet; fill in the business details in the business settings.',
      ],
      [
        "nothing-to-show",
        "hours_1",
        'The opening hours block on "Kontakt" has nothing to show yet; fill in the opening hours in the business settings.',
      ],
    ]);
  });

  it("warn about a contact block with every switch off", () => {
    const { doc, nodes } = site();
    addBusinessBlocks(nodes);
    Object.assign(nodes.contact_1, {
      show_address: false,
      show_phone: false,
      show_email: false,
      show_map: false,
    });
    nodes.location_1.hours_note = "Po domluvě";
    expect(problems(doc).map((p) => p.nodeId)).toEqual(["contact_1"]);
  });
});

describe("locations", () => {
  /** The demo site's business with a second location, "Kutná Hora", with an address. */
  function twoShops() {
    const { doc, nodes } = site();
    nodes.location_1.name = "Kolín – Lipová";
    nodes.location_kh = {
      ...structuredClone(nodes.location_1),
      id: "location_kh",
      name: "Kutná Hora",
      street: "Palackého 3",
      city: "Kutná Hora",
      days: list([]),
    };
    // Its own seven closed days.
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
      const id = `kh_${day}`;
      nodes[id] = { id, type: "opening_day", day, ranges: list([]) };
      return id;
    });
    nodes.location_kh.days = list(days);
    nodes.business_1.locations = list(["location_1", "location_kh"]);
    return { doc, nodes };
  }

  it("Two shops", () => {
    expect(problems(twoShops().doc)).toEqual([]);
  });

  it("Second location without a name", () => {
    const { doc, nodes } = twoShops();
    nodes.location_kh.name = " ";
    expect(only(doc)).toEqual([
      ["empty-name", "Location 2 needs a name; once there are several locations, each is named."],
    ]);
  });

  it("Phone of a branch", () => {
    const { doc, nodes } = twoShops();
    nodes.location_kh.phone = "321 123 456";
    expect(only(doc)).toEqual([
      [
        "invalid-phone",
        'Kutná Hora: The phone number "321 123 456" must be in international form, like +420 321 123 456.',
      ],
    ]);
  });

  it("names the location in hours messages when there are several", () => {
    const { doc, nodes } = twoShops();
    nodes.kh_tue_r = { id: "kh_tue_r", type: "time_range", opens: "17:00", closes: "08:00" };
    nodes.kh_tue.ranges = list(["kh_tue_r"]);
    expect(only(doc)).toEqual([
      ["invalid-hours", "Kutná Hora: Tuesday's hours close before they open (17:00–08:00)."],
    ]);
  });

  it("needs at least one location", () => {
    const { doc, nodes } = site();
    nodes.business_1.locations = list([]);
    for (const id of [
      "location_1",
      "day_mon",
      "day_tue",
      "day_wed",
      "day_thu",
      "day_fri",
      "day_sat",
      "day_sun",
    ])
      delete nodes[id];
    expect(problems(doc)).toContainEqual(
      expect.objectContaining({
        code: "invalid-value",
        category: "structure",
        property: "locations",
      }),
    );
  });

  it("Contact block for one shop", () => {
    const { doc, nodes } = twoShops();
    addBusinessBlocks(nodes);
    nodes.contact_1.location_id = "location_kh";
    expect(problems(doc).filter((p) => p.nodeId === "contact_1")).toEqual([]);
  });

  it("Location removed", () => {
    const { doc, nodes } = twoShops();
    addBusinessBlocks(nodes);
    nodes.contact_1.location_id = "location_gone";
    const forContact = problems(doc).filter((p) => p.nodeId === "contact_1");
    expect(forContact.map((p) => [p.code, p.message])).toEqual([
      [
        "missing-location",
        'The contact block on "Kontakt" shows a location that no longer exists; choose another in the block\'s panel.',
      ],
    ]);
  });

  it("warns when the one chosen location has nothing to show, though another has", () => {
    const { doc, nodes } = twoShops();
    addBusinessBlocks(nodes);
    nodes.hours_1.location_id = "location_kh";
    nodes.range_mon_0 = { id: "range_mon_0", type: "time_range", opens: "08:00", closes: "12:00" };
    nodes.day_mon.ranges = list(["range_mon_0"]);
    expect(problems(doc).map((p) => [p.code, p.nodeId])).toEqual([["nothing-to-show", "hours_1"]]);
    nodes.hours_1.location_id = "";
    expect(problems(doc)).toEqual([]);
  });
});
