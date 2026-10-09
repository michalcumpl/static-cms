import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { ImageCollector, imageCandidates, largerVersions, srcsetEntries } from "./images.js";
import { fixtureText } from "./testing.js";

const base = new URL("https://pekarna-ulipy.cz/");
const candidates = (html: string) => imageCandidates(load(html)("img").first(), base);

describe("image candidates", () => {
  it("Lazy image: the largest srcset size up to 1600 px first, then the lazy source", () => {
    const hero = load(fixtureText("bakery", "/"))(".hero img");
    expect(imageCandidates(hero, base)).toEqual([
      "https://pekarna-ulipy.cz/images/chleb.jpg",
      "https://pekarna-ulipy.cz/images/chleb-800x450.jpg",
    ]);
    expect(candidates('<img src="" data-src="/foto/chleb.jpg" alt="Chléb">')).toEqual([
      "https://pekarna-ulipy.cz/foto/chleb.jpg",
    ]);
  });

  it("tries the image without its size suffix first", () => {
    expect(candidates('<img src="/images/tym-532x328.jpg">')).toEqual([
      "https://pekarna-ulipy.cz/images/tym.jpg",
      "https://pekarna-ulipy.cz/images/tym-532x328.jpg",
    ]);
    expect(
      largerVersions(new URL("https://cdn.example/a.jpg?w=800&q=80")).map((u) => u.href),
    ).toEqual(["https://cdn.example/a.jpg?w=1600&q=80"]);
  });

  it("prefers sizes up to 1600 px over larger ones, and skips data: images", () => {
    expect(
      candidates(
        '<img src="data:image/gif;base64,R0lGOD" srcset="/a-3000.jpg 3000w, /a-1200.jpg 1200w">',
      ),
    ).toEqual(["https://pekarna-ulipy.cz/a-1200.jpg", "https://pekarna-ulipy.cz/a-3000.jpg"]);
  });

  it("reads srcset entries with and without spaces, and density descriptors", () => {
    expect(srcsetEntries("a.jpg 800w,b.jpg 1600w")).toEqual([
      { url: "a.jpg", width: 800 },
      { url: "b.jpg", width: 1600 },
    ]);
    expect(srcsetEntries("a.jpg, b.jpg 2x")).toEqual([
      { url: "a.jpg", width: 0 },
      { url: "b.jpg", width: 2000 },
    ]);
  });
});

describe("one reference per image", () => {
  it("One photo on two pages: one reference, the first description kept", () => {
    const images = new ImageCollector();
    const a = images.add(["https://pekarna-ulipy.cz/images/chleb.jpg"], "");
    const b = images.add(
      [
        "https://pekarna-ulipy.cz/images/chleb-800x450.jpg",
        "https://pekarna-ulipy.cz/images/chleb.jpg",
      ],
      "Chléb",
    );
    expect(b).toBe(a);
    expect(images.references.size).toBe(1);
    expect(images.references.get(a ?? "")?.alt).toBe("Chléb");
  });
});
