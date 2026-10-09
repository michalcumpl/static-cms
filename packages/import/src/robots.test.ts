import { describe, expect, it } from "vitest";
import { robotsRules } from "./robots.js";
import { fixtureText } from "./testing.js";

describe("robots.txt", () => {
  it("Disallowed by robots.txt: only the rules for every crawler count", () => {
    const allowed = robotsRules(fixtureText("bakery", "/robots.txt"));
    expect(allowed("/admin/")).toBe(false);
    expect(allowed("/admin/login.php")).toBe(false);
    // Googlebot's own rule doesn't apply to us.
    expect(allowed("/akce/")).toBe(true);
    expect(allowed("/")).toBe(true);
  });

  it("lets the longest rule win, and Allow win a tie", () => {
    const allowed = robotsRules(fixtureText("bakery", "/robots.txt"));
    expect(allowed("/admin/verejne/cenik/")).toBe(true);
    const tie = robotsRules("User-agent: *\nDisallow: /a\nAllow: /a\n");
    expect(tie("/a/b")).toBe(true);
  });

  it("reads wildcards and end anchors", () => {
    const allowed = robotsRules("User-agent: *\nDisallow: /*.pdf$\nDisallow: /tmp*\n");
    expect(allowed("/cenik.pdf")).toBe(false);
    expect(allowed("/cenik.pdf?x=1")).toBe(true);
    expect(allowed("/tmpfiles/")).toBe(false);
  });

  it("allows everything without a file, with an empty Disallow, or for another crawler", () => {
    expect(robotsRules(undefined)("/admin/")).toBe(true);
    expect(robotsRules("User-agent: *\nDisallow:\n")("/admin/")).toBe(true);
    expect(robotsRules("User-agent: Bingbot\nDisallow: /\n")("/x")).toBe(true);
  });

  it("reads groups naming several agents, and comments", () => {
    const allowed = robotsRules("User-agent: Bingbot\nUser-agent: *  # all\nDisallow: /x\n");
    expect(allowed("/x/y")).toBe(false);
  });
});
