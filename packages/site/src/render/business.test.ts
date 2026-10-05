import { describe, expect, it } from "vitest";
import type { Weekday } from "../schema/index.js";
import {
  type BusinessInfo,
  contactDetails,
  formatPhone,
  formatTime,
  groupDays,
  mapLink,
  openingHoursTable,
} from "./business.js";
import { siteStrings } from "./strings.js";

const WEEK: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
type Hours = Partial<Record<Weekday, [string, string][]>>;

function business(fields: Partial<BusinessInfo> = {}, hours: Hours = {}): BusinessInfo {
  return {
    name: "",
    street: "Lipová 12",
    postal_code: "280 02",
    city: "Kolín",
    country: "CZ",
    phone: "+420321123456",
    email: "objednavky@pekarna-ulipy.example",
    map_url: "",
    business_type: "LocalBusiness",
    hours_note: "",
    show_in_footer: true,
    social: [],
    days: WEEK.map((day) => ({
      day,
      ranges: (hours[day] ?? []).map(([opens, closes]) => ({ opens, closes })),
    })),
    ...fields,
  };
}

const cs = siteStrings("cs");
const en = siteStrings("en");
const text = (markup: { value: string } | false) => (markup ? markup.value : "");

describe("formatting", () => {
  it.each([
    ["+420321123456", "+420 321 123 456"],
    ["+421905123456", "+421 905 123 456"],
    ["+4930123456", "+4930123456"],
    ["+42032112345", "+42032112345"],
  ])("shows %s as %s", (phone, shown) => {
    expect(formatPhone(phone)).toBe(shown);
  });

  it("drops the leading zero of hours", () => {
    expect(formatTime("06:00")).toBe("6:00");
    expect(formatTime("17:30")).toBe("17:30");
    expect(formatTime("00:30")).toBe("0:30");
  });
});

describe("groupDays", () => {
  it("groups weekdays with equal hours, and closed days too", () => {
    const b = business(
      {},
      {
        mon: [["06:00", "17:00"]],
        tue: [["06:00", "17:00"]],
        wed: [["06:00", "17:00"]],
        thu: [["06:00", "17:00"]],
        fri: [["06:00", "17:00"]],
        sat: [["07:00", "11:00"]],
      },
    );
    expect(groupDays(b.days).map((g) => [g.first, g.last, g.ranges.length])).toEqual([
      [0, 4, 1],
      [5, 5, 1],
      [6, 6, 0],
    ]);
  });

  it("keeps days with different breaks apart", () => {
    const b = business(
      {},
      {
        mon: [
          ["08:00", "12:00"],
          ["13:00", "17:00"],
        ],
        tue: [["08:00", "17:00"]],
      },
    );
    expect(groupDays(b.days).map((g) => [g.first, g.last])).toEqual([
      [0, 0],
      [1, 1],
      [2, 6],
    ]);
  });
});

describe("mapLink", () => {
  it("searches Google Maps for the address", () => {
    expect(mapLink(business())).toBe(
      "https://www.google.com/maps/search/?api=1&query=Lipov%C3%A1%2012%2C%20280%2002%20Kol%C3%ADn%2C%20CZ",
    );
  });

  it("prefers the business's own map address", () => {
    expect(mapLink(business({ map_url: "https://maps.app.goo.gl/abc" }))).toBe(
      "https://maps.app.goo.gl/abc",
    );
  });

  it("is undefined without a street or city", () => {
    expect(mapLink(business({ street: "", city: "" }))).toBeUndefined();
  });
});

describe("contactDetails", () => {
  it("shows the address, phone, email and map link", () => {
    const markup = text(contactDetails(business(), cs));
    expect(markup).toContain('<address class="contact-details">');
    expect(markup).toContain("<p>Lipová 12<br>280 02 Kolín</p>");
    expect(markup).toContain('<a href="tel:+420321123456">+420\u00a0321\u00a0123\u00a0456</a>');
    expect(markup).toContain(
      '<a href="mailto:objednavky@pekarna-ulipy.example">objednavky@pekarna-ulipy.example</a>',
    );
    expect(markup).toContain(
      '<a href="https://www.google.com/maps/search/?api=1&amp;query=Lipov%C3%A1%2012%2C%20280%2002%20Kol%C3%ADn%2C%20CZ">Zobrazit na mapě</a>',
    );
  });

  it("leaves out hidden and empty parts", () => {
    const markup = text(
      contactDetails(business({ email: "" }), en, {
        address: true,
        phone: false,
        email: true,
        map: true,
      }),
    );
    expect(markup).not.toContain("tel:");
    expect(markup).not.toContain("mailto:");
    expect(markup).toContain("Show on map");
  });

  it("is nothing when nothing is filled in", () => {
    const empty = business({ street: "", postal_code: "", city: "", phone: "", email: "" });
    expect(contactDetails(empty, cs)).toBe(false);
    expect(contactDetails(empty, cs, undefined, "Pekárna")).toBe(false);
  });
});

describe("openingHoursTable", () => {
  it("groups weekdays in Czech", () => {
    const b = business(
      {},
      {
        mon: [["06:00", "17:00"]],
        tue: [["06:00", "17:00"]],
        wed: [["06:00", "17:00"]],
        thu: [["06:00", "17:00"]],
        fri: [["06:00", "17:00"]],
        sat: [["07:00", "11:00"]],
      },
    );
    const markup = text(openingHoursTable(b, cs));
    expect(
      [...markup.matchAll(/<tr><th scope="row">(.*?)<\/th><td>(.*?)<\/td><\/tr>/g)].map((m) => [
        m[1],
        m[2],
      ]),
    ).toEqual([
      ["Po–Pá", "6:00–17:00"],
      ["So", "7:00–11:00"],
      ["Ne", "zavřeno"],
    ]);
  });

  it("lists a lunch break in English", () => {
    const b = business(
      {},
      {
        mon: [
          ["08:00", "12:00"],
          ["13:00", "17:00"],
        ],
      },
    );
    expect(text(openingHoursTable(b, en))).toContain(
      '<tr><th scope="row">Mon</th><td>8:00–12:00, 13:00–17:00</td></tr>',
    );
  });

  it("shows only the note when every day is closed", () => {
    expect(text(openingHoursTable(business({ hours_note: "Po domluvě" }), cs))).toBe(
      '<p class="hours-note">Po domluvě</p>',
    );
    expect(openingHoursTable(business(), cs)).toBe(false);
  });

  it("puts the note after the table", () => {
    const b = business({ hours_note: "Ve svátky zavřeno" }, { sat: [["07:00", "11:00"]] });
    expect(text(openingHoursTable(b, cs))).toMatch(
      /<\/table>\n<p class="hours-note">Ve svátky zavřeno<\/p>$/,
    );
  });
});
