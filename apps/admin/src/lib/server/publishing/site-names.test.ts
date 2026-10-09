import { describe, expect, it } from "vitest";
import { nameCandidates, slugifyName } from "./site-names";

describe("slugifyName", () => {
  it.each([
    ["Pekárna U Lípy", "pekarna-u-lipy"],
    ["Kadeřnictví Eva", "kadernictvi-eva"],
    ["  Žluťoučký kůň!! ", "zlutoucky-kun"],
    ["WWW", "www"],
    ["Café & Bistro 2", "cafe-bistro-2"],
    ["Ünïcödé", "unicode"],
    ["", "web"],
    ["!!!", "web"],
    ["日本語", "web"],
  ])("%s → %s", (name, slug) => {
    expect(slugifyName(name)).toBe(slug);
  });

  it("keeps at most 40 characters, without a trailing dash", () => {
    const slug = slugifyName("Velmi dlouhý název pekárny a cukrárny u kostela svatého Jakuba");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug).toBe("velmi-dlouhy-nazev-pekarny-a-cukrarny-u");
  });
});

describe("nameCandidates", () => {
  it("adds a number after the first", () => {
    const names = nameCandidates("pekarna-u-lipy");
    expect([names.next().value, names.next().value, names.next().value]).toEqual([
      "pekarna-u-lipy",
      "pekarna-u-lipy-2",
      "pekarna-u-lipy-3",
    ]);
  });

  it("shortens a long name to fit its number", () => {
    const names = nameCandidates("a".repeat(40));
    names.next();
    expect(names.next().value).toBe(`${"a".repeat(38)}-2`);
  });
});
