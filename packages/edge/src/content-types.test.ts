import { describe, expect, it } from "vitest";
import { cacheControlOf, contentTypeOf } from "./content-types.js";

describe("contentTypeOf", () => {
  it.each([
    ["kontakt/index.html", "text/html; charset=utf-8"],
    ["assets/style.css", "text/css; charset=utf-8"],
    ["assets/site.js", "text/javascript; charset=utf-8"],
    ["sitemap.xml", "application/xml; charset=utf-8"],
    ["robots.txt", "text/plain; charset=utf-8"],
    ["media/hero.webp", "image/webp"],
    ["fonts/inter.woff2", "font/woff2"],
    ["media/HERO.JPG", "image/jpeg"],
    ["_redirects", "application/octet-stream"],
    ["files/data.xyz", "application/octet-stream"],
  ])("%s → %s", (path, type) => {
    expect(contentTypeOf(path)).toBe(type);
  });
});

describe("cacheControlOf", () => {
  it("revalidates pages, stylesheets, scripts, the sitemap and robots.txt", () => {
    for (const path of ["index.html", "assets/style.css", "a.js", "sitemap.xml", "robots.txt"]) {
      expect(cacheControlOf(path)).toBe("public, max-age=0, must-revalidate");
    }
  });

  it("keeps images and fonts for a day", () => {
    for (const path of ["media/hero.webp", "fonts/inter.woff2", "favicon.ico"]) {
      expect(cacheControlOf(path)).toBe("public, max-age=86400");
    }
  });

  it("revalidates unknown files", () => {
    expect(cacheControlOf("files/data.xyz")).toBe("public, max-age=0, must-revalidate");
  });
});
