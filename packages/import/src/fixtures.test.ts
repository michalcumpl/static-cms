import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { fixtureText, hasFixture } from "./testing.js";

// The fixture websites parse, and hold what the tests rely on (site-import task 2.2).
describe("fixture sites", () => {
  it("the bakery's pages parse and link each other", () => {
    for (const path of ["/", "/nase-pecivo/", "/o-nas/", "/kontakt.html", "/akce/"]) {
      const $ = cheerio.load(fixtureText("bakery", path));
      expect($("title").text(), path).toContain("Pekárna U Lípy");
    }
    const $ = cheerio.load(fixtureText("bakery", "/"));
    expect($("nav a").length).toBeGreaterThanOrEqual(6);
    expect($("details").length).toBe(3);
    expect(hasFixture("bakery", "/images/logo.svg")).toBe(true);
    expect(hasFixture("bakery", "/admin/")).toBe(false);
  });

  it("the bakery's English version has its own pages, and isn't in the sitemap", () => {
    for (const path of ["/en/", "/en/our-bread/", "/en/contact.html", "/en/wholesale/"]) {
      const $ = cheerio.load(fixtureText("bakery", path));
      expect($("html").attr("lang"), path).toBe("en");
      expect($("title").text(), path).toContain("U Lípy Bakery");
    }
    expect(cheerio.load(fixtureText("bakery", "/en/"))("details").length).toBe(3);
    expect(hasFixture("bakery", "/images/velkoobchod.jpg")).toBe(true);
    expect(fixtureText("bakery", "/sitemap.xml")).not.toContain("/en/our-bread/");
  });

  it("the agency's pages parse, and two of its cards link to pages it doesn't serve", () => {
    const pages = ["/", "/zajezdy/chorvatsko/", "/zajezdy/italie/", "/zajezdy/recko/"];
    for (const path of [...pages, "/zajezdy/rakousko/", "/kontakt/"]) {
      const $ = cheerio.load(fixtureText("agency", path));
      expect($("title").text(), path).toContain("Cestovka Vlna");
    }
    const $ = cheerio.load(fixtureText("agency", "/"));
    expect($(".card").length).toBe(6);
    const targets = $(".card h3 a")
      .toArray()
      .map((a) => $(a).attr("href") ?? "");
    expect(targets.filter((href) => !hasFixture("agency", href))).toEqual([
      "/clanky/tipy-na-leto/",
      "/clanky/jak-se-balit/",
    ]);
    for (const img of $("img").toArray()) {
      expect(hasFixture("agency", $(img).attr("src") ?? ""), $(img).attr("src")).toBe(true);
    }
  });

  it("the studio is one minified page", () => {
    const $ = cheerio.load(fixtureText("studio", "/"));
    expect($("html").attr("lang")).toBe("en-GB");
    expect($("section").length).toBe(4);
  });

  it("the script-built page has no content", () => {
    const $ = cheerio.load(fixtureText("spa", "/"));
    expect($("#app").text()).toBe("");
  });
});
