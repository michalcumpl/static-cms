import { afterEach, describe, expect, it } from "vitest";
import { crawl, decodeText } from "./crawl";
import { type FixtureServer, startFixtureServer } from "./fixture-server";

let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function serve(site: string) {
  server = await startFixtureServer(site);
  return { origin: server.origin, options: { allowHosts: new Set([server.host]) } };
}

describe("crawling a site", () => {
  it("reads the home page, the menu's pages, then the sitemap's, following robots.txt", async () => {
    const { origin, options } = await serve("bakery");
    const result = await crawl(`${origin}/`, options);
    if (!result.ok) throw new Error(result.failure);
    expect(result.pages.map((p) => new URL(p.url).pathname)).toEqual([
      "/",
      "/nase-pecivo/",
      "/o-nas/",
      "/akce/",
      "/kontakt.html",
    ]);
    expect(result.leftOut).toEqual([
      { reason: "disallowed", page: "/admin/" },
      { reason: "language", page: "/en/", detail: `${origin}/en/`, lang: "en" },
      { reason: "unreachable", page: "/cenik.pdf", detail: "404" },
    ]);
    expect(server?.hits.get("/admin/")).toBeUndefined();
    expect(result.unreachable).toEqual([`${origin}/cenik.pdf`]);
    expect(result.queue).toEqual([]);
    // Each page with its stylesheet, fetched once.
    expect(result.pages[0]?.css[0]).toContain("Brandon Grotesque");
    expect(server?.hits.get("/style.css")).toBe(1);
  });

  it("Menu first, then the sitemap: the pages over the limit are counted", async () => {
    const { origin, options } = await serve("bakery");
    const progress: [number, number][] = [];
    const result = await crawl(`${origin}/`, {
      ...options,
      maxPages: 3,
      onProgress: (done, total) => progress.push([done, total]),
    });
    if (!result.ok) throw new Error(result.failure);
    expect(result.pages.map((p) => new URL(p.url).pathname)).toEqual([
      "/",
      "/nase-pecivo/",
      "/o-nas/",
    ]);
    expect(result.leftOut).toEqual([{ reason: "over-limit", detail: "5" }]);
    // What a retry imports next, and the menu's pages among them.
    expect(result.queue.map((url) => new URL(url).pathname)).toEqual([
      "/akce/",
      "/kontakt.html",
      "/admin/",
      "/en/",
      "/cenik.pdf",
    ]);
    expect(result.menu.map((url) => new URL(url).pathname)).toEqual([
      "/",
      "/nase-pecivo/",
      "/o-nas/",
      "/akce/",
      "/kontakt.html",
      "/admin/",
    ]);
    expect(progress.at(-1)).toEqual([3, 3]);
  });

  it("Built in the browser: the import can't go on", async () => {
    const { origin, options } = await serve("spa");
    expect(await crawl(`${origin}/`, options)).toEqual({ ok: false, failure: "script-built" });
  });

  it("Site down: unreachable", async () => {
    const { origin, options } = await serve("bakery");
    await server?.close();
    server = undefined;
    expect(await crawl(`${origin}/`, options)).toMatchObject({ ok: false, failure: "unreachable" });
  });

  it("refuses a home page robots.txt disallows, and one at a private address", async () => {
    const { origin, options } = await serve("bakery");
    expect(await crawl(`${origin}/admin/`, options)).toEqual({ ok: false, failure: "disallowed" });
    expect(await crawl(`${origin}/`)).toMatchObject({ ok: false, failure: "blocked" });
  });
});

describe("decoding pages", () => {
  it("reads the charset from the header or the page, UTF-8 otherwise", () => {
    const cp1250 = new Uint8Array([0x50, 0x65, 0x6b, 0xe1, 0x72, 0x6e, 0x61, 0x20, 0x9e]);
    expect(decodeText(cp1250, "text/html; charset=windows-1250")).toBe("Pekárna ž");
    const meta = new TextEncoder().encode('<meta charset="windows-1250">');
    expect(decodeText(new Uint8Array([...meta, 0x9e]), "text/html")).toContain("ž");
    expect(decodeText(new TextEncoder().encode("Pekárna"), "")).toBe("Pekárna");
  });
});
