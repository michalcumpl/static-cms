import { loadDemoMedia, loadDemoSite } from "@webmio/model/testing";
import { describe, expect, it } from "vitest";
import { addressOf, checkSiteLinks, exportSite } from "./index.js";

const encode = (text: string) => new TextEncoder().encode(text);
const site = (files: Record<string, string>) =>
  new Map(Object.entries(files).map(([path, text]) => [path, encode(text)]));
const siteUrl = "https://pekarna-u-lipy.webmio.site";

describe("addressOf", () => {
  it("names files as visitors reach them", () => {
    expect(addressOf("index.html")).toBe("/");
    expect(addressOf("kontakt/index.html")).toBe("/kontakt/");
    expect(addressOf("assets/style.css")).toBe("/assets/style.css");
  });
});

describe("checkSiteLinks", () => {
  it("accepts a site whose every reference leads to a file", () => {
    const files = site({
      "index.html":
        '<a href="/">Domů</a><a href="/kontakt/">Kontakt</a><a href="kontakt/#mapa">Mapa</a>' +
        '<link rel="stylesheet" href="/assets/style.css"><script src="/assets/menu.js"></script>' +
        '<img src="/assets/images/a-320.webp" srcset="/assets/images/a-320.webp 320w, /assets/images/a-640.webp 640w">' +
        '<meta property="og:image" content="https://pekarna-u-lipy.webmio.site/assets/images/a-640.webp">' +
        '<link rel="canonical" href="https://pekarna-u-lipy.webmio.site/">',
      "kontakt/index.html": '<a href="../">Zpět</a><a href="/?a=1&amp;b=2">Domů</a>',
      "assets/style.css": '@font-face { src: url("fonts/inter.woff2") format("woff2"); }',
      "assets/fonts/inter.woff2": "",
      "assets/menu.js": "",
      "assets/images/a-320.webp": "",
      "assets/images/a-640.webp": "",
      _redirects: "/o-nas/ /kontakt/ 301\n",
    });
    expect(checkSiteLinks(files, { siteUrl })).toEqual({ broken: [], outside: [] });
  });

  it("names a missing page, image size, font and redirect target with where they are", () => {
    const files = site({
      "index.html":
        '<a href="/cenik/">Ceník</a><img src="/assets/a-320.webp" srcset="/assets/a-320.webp 320w, /assets/a-640.webp 640w">',
      "assets/a-320.webp": "",
      "assets/style.css": "@font-face { src: url(fonts/lora.woff2); }",
      _redirects: "/stary/ /neni/ 301\n",
    });
    expect(checkSiteLinks(files, { siteUrl }).broken).toEqual([
      { page: "/", address: "/cenik/" },
      { page: "/", address: "/assets/a-640.webp" },
      { page: "/assets/style.css", address: "fonts/lora.woff2" },
      { page: "/_redirects", address: "/neni/" },
    ]);
  });

  it("treats the site's own address written in full as a reference into the website", () => {
    const files = site({
      "index.html": '<a href="https://pekarna-u-lipy.webmio.site/cenik/">x</a>',
    });
    expect(checkSiteLinks(files, { siteUrl }).broken).toEqual([
      { page: "/", address: "https://pekarna-u-lipy.webmio.site/cenik/" },
    ]);
  });

  it("returns links to other websites once per page, and ignores anchors, email and phone", () => {
    const files = site({
      "index.html":
        '<a href="https://www.facebook.com/pekarna">FB</a><a href="https://www.facebook.com/pekarna">FB</a>' +
        '<a href="#obsah">Obsah</a><a href="mailto:a@b.cz">E-mail</a><a href="tel:+420123">Tel</a>' +
        '<img src="https://img.example/x.png"><a href="data:text/plain,x">x</a>',
      "kontakt/index.html": '<a href="https://www.facebook.com/pekarna">FB</a>',
    });
    expect(checkSiteLinks(files, { siteUrl })).toEqual({
      broken: [],
      outside: [
        { page: "/", url: "https://www.facebook.com/pekarna" },
        { page: "/kontakt/", url: "https://www.facebook.com/pekarna" },
      ],
    });
  });

  it("works without an address, for root-relative links", () => {
    const files = site({ "index.html": '<a href="/kontakt/">x</a>' });
    expect(checkSiteLinks(files).broken).toEqual([{ page: "/", address: "/kontakt/" }]);
  });

  it("finds nothing broken in the demo site's export", () => {
    const media = loadDemoMedia();
    media.set("hero.png-share.jpg", new Uint8Array([1]));
    const exported = exportSite(loadDemoSite(), media, {
      siteUrl,
      redirects: [{ from: "/stary-kontakt/", to: "/kontakt/" }],
    });
    if (!exported.ok) throw new Error(JSON.stringify(exported.problems));
    expect(checkSiteLinks(exported.files, { siteUrl }).broken).toEqual([]);
  });
});
