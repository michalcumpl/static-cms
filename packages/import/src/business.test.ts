import { describe, expect, it } from "vitest";
import { internationalPhone, mailtoAddress, openingHours, readBusiness } from "./business.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";

const pages = (site: "bakery" | "studio", paths: string[]) =>
  paths.map((path) => ({
    url: new URL(path, `${FIXTURE_ORIGINS[site]}/`).href,
    html: fixtureText(site, path),
  }));

describe("business details", () => {
  it("Structured data: name, type, phone, address and hours", () => {
    const business = readBusiness(pages("bakery", ["/", "/kontakt.html"]), "cs", []);
    expect(business).toMatchObject({
      name: "Pekárna U Lípy",
      type: "Bakery",
      location: {
        phone: "+420321123456",
        street: "Lipová 12",
        city: "Kutná Hora",
        postal_code: "284 01",
        country: "CZ",
        hours: {
          mon: [["06:00", "18:00"]],
          fri: [["06:00", "18:00"]],
          sat: [["07:00", "12:00"]],
        },
      },
    });
    expect(business.location.hours?.sun).toBeUndefined();
    expect(business.logo).toEqual(["https://pekarna-ulipy.cz/images/logo.svg"]);
  });

  it("Hidden email: none found, so it is reported", () => {
    const business = readBusiness(pages("bakery", ["/", "/kontakt.html"]), "cs", []);
    expect(business.location.email).toBeUndefined();
    expect(business.hiddenEmail).toBe(true);
  });

  it("takes social profiles from sameAs and the menu", () => {
    const business = readBusiness(pages("bakery", ["/"]), "cs", [
      "https://www.youtube.com/@pekarna",
    ]);
    expect(business.social.sort()).toEqual([
      "https://www.facebook.com/pekarnaulipy",
      "https://www.instagram.com/pekarnaulipy",
      "https://www.youtube.com/@pekarna",
    ]);
  });

  it("falls back to tel: and percent-encoded mailto: links", () => {
    const business = readBusiness(pages("studio", ["/"]), "en", []);
    expect(business.location).toMatchObject({
      phone: "+420777123456",
      email: "hello@northlight.example",
    });
    expect(business.hiddenEmail).toBe(false);
  });

  it("reads an address element", () => {
    const html = "<address>Pekárna U Lípy<br>Lipová 12<br>284 01 Kutná Hora</address>";
    const business = readBusiness([{ url: "https://x.cz/", html }], "cs", []);
    expect(business.location).toMatchObject({
      street: "Lipová 12",
      postal_code: "284 01",
      city: "Kutná Hora",
    });
  });
});

describe("phones, emails and hours", () => {
  it("writes phones in international form", () => {
    expect(internationalPhone("tel:321%20123%20456", "cs")).toBe("+420321123456");
    expect(internationalPhone("00420 777 123 456", "en")).toBe("+420777123456");
    expect(internationalPhone("(0)20 7946 0018", "en")).toBe("");
    expect(internationalPhone("777 123 456", "sk")).toBe("+421777123456");
  });

  it("decodes emails and drops their query", () => {
    expect(mailtoAddress("mailto:info%40pekarna.cz?subject=Dort")).toBe("info@pekarna.cz");
    expect(mailtoAddress("mailto:%E0%A4%A")).toBe("");
  });

  it("reads openingHours strings", () => {
    expect(openingHours({ openingHours: ["Mo-We 08:00-16:00", "Sa 9:00-12:00"] })).toEqual({
      mon: [["08:00", "16:00"]],
      tue: [["08:00", "16:00"]],
      wed: [["08:00", "16:00"]],
      sat: [["9:00", "12:00"]],
    });
  });
});
