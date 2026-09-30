import { describe, expect, it } from "vitest";
import { demoSite } from "../demo";
import { pageAddresses, redirectsFrom } from "./redirects";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };
const demo = () => demoSite() as Doc;

describe("pageAddresses", () => {
  it("puts home at / and other pages at /<slug>/", () => {
    expect([...pageAddresses(demo())]).toEqual([
      ["page_home", "/"],
      ["page_contact", "/kontakt/"],
    ]);
  });
});

describe("redirectsFrom", () => {
  it("redirects a renamed address to the current one", () => {
    const now = demo();
    now.nodes.page_contact.slug = "napiste-nam";
    expect(redirectsFrom([demo()], now)).toEqual([{ from: "/kontakt/", to: "/napiste-nam/" }]);
  });

  it("doesn't redirect deleted pages or unchanged addresses", () => {
    const now = demo();
    now.nodes.site_1.pages.nodes = ["page_home"];
    delete now.nodes.page_contact;
    expect(redirectsFrom([demo()], now)).toEqual([]);
    expect(redirectsFrom([demo()], demo())).toEqual([]);
  });

  it("redirects a page's old address when it became home", () => {
    const now = demo();
    now.nodes.site_1.home_page_id = "page_contact";
    // Úvod now lives at /uvod/; Kontakt, the new home, at /.
    expect(redirectsFrom([demo()], now)).toEqual([{ from: "/kontakt/", to: "/" }]);
  });

  it("collects every earlier address once, and never redirects an address in use", () => {
    const second = demo();
    second.nodes.page_contact.slug = "napiste-nam";
    const now = demo();
    now.nodes.page_contact.slug = "kontakty";
    expect(redirectsFrom([demo(), second, second], now)).toEqual([
      { from: "/kontakt/", to: "/kontakty/" },
      { from: "/napiste-nam/", to: "/kontakty/" },
    ]);
    const back = demo();
    expect(redirectsFrom([demo(), second], back)).toEqual([
      { from: "/napiste-nam/", to: "/kontakt/" },
    ]);
  });
});
