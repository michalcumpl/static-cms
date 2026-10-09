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
