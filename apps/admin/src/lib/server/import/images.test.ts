import type { ImageReference } from "@webmio/import";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import { fetchImages } from "./images";

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer("bakery");
});
afterAll(() => server.close());

const options = () => ({ allowHosts: new Set([server.host]) });
const ref = (id: string, candidates: string[], role: ImageReference["role"] = "content") => ({
  id,
  candidates: candidates.map((c) => `${server.origin}${c}`),
  alt: "",
  role,
});

describe("fetching an import's images", () => {
  it("tries candidates in order, the size suffix's original first", async () => {
    const result = await fetchImages(
      [ref("tym", ["/images/tym.jpg", "/images/tym-532x328.jpg"])],
      options(),
    );
    expect(result.byReference.get("tym")).toBe("tym.jpg");
    const meta = await sharp(result.files.get("tym.jpg")).metadata();
    expect(meta.width).toBe(1600);
  });

  it("falls back to the next candidate when one fails", async () => {
    const result = await fetchImages(
      [ref("x", ["/images/missing.jpg", "/images/pec.jpg"])],
      options(),
    );
    expect(result.byReference.get("x")).toBe("pec.jpg");
  });

  it("One photo on two pages: one file", async () => {
    const result = await fetchImages(
      [ref("a", ["/images/chleb.jpg"]), ref("b", ["/images/chleb.jpg?v=2"])],
      options(),
    );
    expect(result.files.size).toBe(1);
    expect(result.byReference.get("a")).toBe(result.byReference.get("b"));
  });

  it("SVG logo: turned into a PNG; an SVG photo is left out", async () => {
    const result = await fetchImages(
      [ref("logo", ["/images/logo.svg"], "logo"), ref("photo", ["/images/logo.svg?photo"])],
      options(),
    );
    const name = result.byReference.get("logo") ?? "";
    expect(name).toBe("logo.png");
    expect((await sharp(result.files.get(name)).metadata()).format).toBe("png");
    expect(result.byReference.has("photo")).toBe(false);
  });

  it("leaves out what isn't an image, and counts references over the limit", async () => {
    const many = Array.from({ length: 102 }, (_, i) => ref(`r${i}`, ["/robots.txt"]));
    const result = await fetchImages(many, options());
    expect(result.files.size).toBe(0);
    expect(result.overLimit).toBe(2);
  });
});
