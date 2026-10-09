import { describe, expect, it } from "vitest";
import { type MenuEntry, menuLinks, sitemapLinks } from "./links.js";
import { FIXTURE_ORIGINS, fixtureText } from "./testing.js";

const bakery = FIXTURE_ORIGINS.bakery;
const shape = (menu: MenuEntry[]) =>
  menu.map((e) =>
    "items" in e
      ? { group: e.label, items: e.items.map((i) => [i.label, i.url.pathname]) }
      : [e.label, e.url.pathname],
  );

describe("the menu", () => {
  it("reads the bakery's menu in order, with its group", () => {
    const nav = menuLinks(fixtureText("bakery", "/"), `${bakery}/`);
    expect(shape(nav.menu)).toEqual([
      ["Úvod", "/"],
      ["Naše pečivo", "/nase-pecivo/"],
      {
        group: "O nás",
        items: [
          ["Náš příběh", "/o-nas/"],
          ["Akce", "/akce/"],
        ],
      },
      ["Kontakt", "/kontakt.html"],
      ["Pro zaměstnance", "/admin/"],
    ]);
  });

  it("drops fragments, and sets social profiles and other languages apart", () => {
    const nav = menuLinks(fixtureText("bakery", "/"), `${bakery}/`);
    const akce = nav.menu
      .flatMap((e) => ("items" in e ? e.items : [e]))
      .find((l) => l.label === "Akce");
    expect(akce?.url.href).toBe(`${bakery}/akce/`);
    expect(nav.social.sort()).toEqual([
      "https://www.facebook.com/pekarnaulipy",
      "https://www.instagram.com/pekarnaulipy",
    ]);
    expect(nav.languages).toEqual([`${bakery}/en/`]);
  });

  it("reads a www. twin as the same site", () => {
    const html = '<nav><a href="https://www.pekarna-ulipy.cz/kontakt/">Kontakt</a></nav>';
    expect(shape(menuLinks(html, `${bakery}/`).menu)).toEqual([["Kontakt", "/kontakt/"]]);
  });

  it("takes no anchors of a one-page site as pages", () => {
    const nav = menuLinks(fixtureText("studio", "/"), `${FIXTURE_ORIGINS.studio}/`);
    expect(nav.menu).toEqual([]);
    expect(nav.languages).toEqual([`${FIXTURE_ORIGINS.studio}/cs/`]);
  });

  it("finds a menu of plain links in the header, without a list or a nav element", () => {
    const html =
      '<header><a href="https://pekarna-ulipy.cz"><img src="l.svg" alt="Pekárna"></a><a href="/work">Work</a><a href="https://intl.example">International</a><a href="/about">About</a></header>';
    expect(shape(menuLinks(html, `${bakery}/`).menu)).toEqual([
      ["Pekárna", "/"],
      ["Work", "/work"],
      ["About", "/about"],
    ]);
  });

  it("finds a list in a container named for navigation", () => {
    const html = `<div class="site-header"><div class="logo"><a href="https://pekarna-ulipy.cz"></a></div>
      <div class="navigation"><ul><li><a href="/work"><span>Work</span></a></li>
      <li><a href="https://intl.example">Services</a></li><li><a href="/about"><span>About</span></a></li>
      <li><a href="#">Contact</a></li></ul></div></div>`;
    expect(shape(menuLinks(html, `${bakery}/`).menu)).toEqual([
      ["Work", "/work"],
      ["About", "/about"],
    ]);
  });

  it("takes no videos as social profiles, and no other site as a language version", () => {
    const html = `<main><a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Film</a>
      <a href="https://youtu.be/dQw4w9WgXcQ">Film</a><a href="https://vimeo.com/76979871">Klip</a>
      <a href="https://www.youtube.com/@pekarna">Kanál</a></main>
      <div class="lang-and-social"><a href="/en/">EN</a><a href="https://www.facebook.com/pekarna/?ref=x">Facebook</a></div>`;
    const nav = menuLinks(html, `${bakery}/`);
    expect(nav.social.sort()).toEqual([
      "https://www.facebook.com/pekarna",
      "https://www.youtube.com/@pekarna",
    ]);
    expect(nav.languages).toEqual([`${bakery}/en/`]);
  });

  it("names an image link by its alt text, and keeps the first of two links to one page", () => {
    const html =
      '<header><nav><a href="/"><img src="l.png" alt="Domů"></a><a href="/index.html">Úvod</a><a href="/o-nas">O nás</a></nav></header>';
    expect(shape(menuLinks(html, `${bakery}/`).menu)).toEqual([
      ["Domů", "/"],
      ["O nás", "/o-nas"],
    ]);
  });
});

describe("sitemap.xml", () => {
  it("lists the pages", () => {
    const { pages, sitemaps } = sitemapLinks(fixtureText("bakery", "/sitemap.xml"));
    expect(pages).toHaveLength(8);
    expect(pages[1]).toBe(`${bakery}/nase-pecivo/`);
    expect(sitemaps).toEqual([]);
  });

  it("lists the sitemaps of an index", () => {
    const xml = `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${bakery}/page-sitemap.xml</loc></sitemap></sitemapindex>`;
    expect(sitemapLinks(xml)).toEqual({ pages: [], sitemaps: [`${bakery}/page-sitemap.xml`] });
  });
});
