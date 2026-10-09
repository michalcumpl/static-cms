import { describe, expect, it, vi } from "vitest";
import { verifyLive } from "./verify";

const encode = (text: string) => new TextEncoder().encode(text);
const published = new Map([
  ["index.html", encode("<h1>Nová</h1>")],
  ["kontakt/index.html", encode("<h1>Kontakt</h1>")],
  ["assets/style.css", encode("h1{}")],
  ["assets/hero.webp", new Uint8Array(1000)],
  ["_redirects", encode("/a/ /b/ 301\n")],
]);
const fast = { deadlineMs: 300, pollMs: 10, retryMs: 10 };

/** A live website serving the given bodies by address; HEAD answers with the length. */
function website(served: Record<string, Uint8Array | string | undefined>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const body = served[new URL(url).pathname];
    if (body === undefined) return new Response("Not found", { status: 404 });
    const bytes = typeof body === "string" ? encode(body) : body;
    if (init?.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "content-length": String(bytes.byteLength) },
      });
    }
    return new Response(bytes.slice(), { status: 200 });
  });
}

const everything = {
  "/": "<h1>Nová</h1>",
  "/kontakt/": "<h1>Kontakt</h1>",
  "/assets/style.css": "h1{}",
  "/assets/hero.webp": new Uint8Array(1000),
};

describe("verifyLive", () => {
  it("passes when every page and file is served as published", async () => {
    const fetchLive = website(everything);
    expect(await verifyLive(published, "https://pekarna.webmio.site/", fetchLive, fast)).toEqual({
      ok: true,
    });
    const asked = fetchLive.mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(asked).toContain("GET https://pekarna.webmio.site/kontakt/");
    expect(asked).toContain("HEAD https://pekarna.webmio.site/assets/hero.webp");
    // Redirects are the hosting's own file, never served.
    expect(asked.some((call) => call.includes("_redirects"))).toBe(false);
  });

  it("waits for the switch: an old home page is asked again until it is the new one", async () => {
    let calls = 0;
    const fetchLive = vi.fn(async (url: string, init?: RequestInit) => {
      if (new URL(url).pathname === "/" && ++calls < 3) return new Response("<h1>Stará</h1>");
      return website(everything)(url, init);
    });
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: true,
    });
    expect(calls).toBe(3);
  });

  it("fails with the addresses that stayed old or missing until the deadline", async () => {
    const fetchLive = website({
      ...everything,
      "/kontakt/": "<h1>Starý kontakt</h1>",
      "/assets/hero.webp": undefined,
    });
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: false,
      failing: ["/assets/hero.webp", "/kontakt/"],
    });
  });

  it("fails when an image has the wrong size", async () => {
    const fetchLive = website({ ...everything, "/assets/hero.webp": new Uint8Array(10) });
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: false,
      failing: ["/assets/hero.webp"],
    });
  });

  it("fails at the deadline when the home page never becomes the new one", async () => {
    const fetchLive = website({ ...everything, "/": "<h1>Stará</h1>" });
    const started = Date.now();
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: false,
      failing: ["/"],
    });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("counts a redirect instead of the page as not served", async () => {
    const fetchLive = vi.fn(async (url: string, init?: RequestInit) =>
      new URL(url).pathname === "/kontakt/"
        ? new Response(null, { status: 301, headers: { location: "/" } })
        : website(everything)(url, init),
    );
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: false,
      failing: ["/kontakt/"],
    });
  });

  it("checks by length when HEAD gives none", async () => {
    const fetchLive = vi.fn(async (url: string, init?: RequestInit) =>
      init?.method === "HEAD"
        ? new Response(null, { status: 405 })
        : website(everything)(url, init),
    );
    expect(await verifyLive(published, "https://pekarna.webmio.site", fetchLive, fast)).toEqual({
      ok: true,
    });
  });
});
