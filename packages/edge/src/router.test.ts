import { describe, expect, it } from "vitest";
import { MISSING_FILE, normalizeHost, route } from "./router.js";

const store = new Map([
  ["h:pekarna-u-lipy.webmio.site", "ws_pekarna"],
  ["h:www.pekarna.cz", "ws_pekarna"],
  ["s:ws_pekarna", "dp_2"],
  ["h:anideti.webmio.site", "ws_anideti www.anideti.cz"],
  ["h:www.anideti.cz", "ws_anideti"],
  ["s:ws_anideti", "dp_9"],
  ["h:nepublikovano.webmio.site", "ws_new"],
]);

const lookup = async (key: string) => store.get(key);

function get(uri: string, host = "pekarna-u-lipy.webmio.site", querystring = "") {
  return route({ host, uri, querystring }, lookup);
}

describe("route", () => {
  it("serves the home page of the live publish at the free address", async () => {
    expect(await get("/")).toEqual({ kind: "fetch", uri: "/sites/ws_pekarna/dp_2/index.html" });
  });

  it("serves the same website at its custom domain", async () => {
    expect(await get("/", "www.pekarna.cz")).toEqual({
      kind: "fetch",
      uri: "/sites/ws_pekarna/dp_2/index.html",
    });
  });

  it("serves a folder's index.html for an address ending in a slash", async () => {
    expect(await get("/kontakt/")).toEqual({
      kind: "fetch",
      uri: "/sites/ws_pekarna/dp_2/kontakt/index.html",
    });
  });

  it("serves files as they are", async () => {
    expect(await get("/assets/style.css")).toEqual({
      kind: "fetch",
      uri: "/sites/ws_pekarna/dp_2/assets/style.css",
    });
  });

  it("redirects an address without a slash or an extension, keeping the query", async () => {
    expect(await get("/kontakt", undefined, "a=1")).toMatchObject({
      kind: "respond",
      status: 301,
      headers: { location: "/kontakt/?a=1", "cache-control": "public, max-age=3600" },
    });
  });

  it("ignores the query string when choosing the file", async () => {
    expect(await get("/kontakt/", undefined, "utm_source=x")).toEqual(await get("/kontakt/"));
  });

  it("matches hostnames in any case, with a port or a trailing dot", async () => {
    expect(await get("/", "Pekarna-U-Lipy.webmio.site.")).toMatchObject({ kind: "fetch" });
    expect(await get("/", "pekarna-u-lipy.webmio.site:443")).toMatchObject({ kind: "fetch" });
    expect(normalizeHost("WWW.Pekarna.CZ:8080")).toBe("www.pekarna.cz");
  });

  it("answers an unknown hostname with No website here", async () => {
    const routed = await get("/", "nic-tu-neni.webmio.site");
    expect(routed).toMatchObject({ kind: "respond", status: 404 });
    expect(routed.kind === "respond" && routed.body).toContain("No website here");
  });

  it("answers a website without a live publish with No website here", async () => {
    expect(await get("/", "nepublikovano.webmio.site")).toMatchObject({ status: 404 });
  });

  it("redirects the free address to the ready custom domain, path and query kept", async () => {
    expect(await get("/menu/", "anideti.webmio.site", "x=1")).toMatchObject({
      kind: "respond",
      status: 301,
      headers: { location: "https://www.anideti.cz/menu/?x=1" },
    });
  });

  it("doesn't let browsers keep the redirect to the domain, which ends with the domain", async () => {
    expect(await get("/", "anideti.webmio.site")).toMatchObject({
      headers: { "cache-control": "no-store" },
    });
  });

  it.each([
    "/../other-site/index.html",
    "/kontakt/../../ws_other/dp_1/index.html",
    "/%2e%2e/ws_other/index.html",
    "/%2E%2E%2Fws_other%2Findex.html",
    "/kontakt%2f..%2f..%2findex.html",
    "/..%5c..%5cindex.html",
    "/a\\..\\b",
    "/./index.html",
    "/%00",
    "/%E0%A4%A",
    "index.html",
  ])("never leaves the live publish: %s", async (uri) => {
    expect(await get(uri)).toMatchObject({ kind: "respond", status: 404 });
  });

  it("never serves the publish's _redirects", async () => {
    expect(await get("/_redirects")).toEqual({
      kind: "fetch",
      uri: `/sites/ws_pekarna/dp_2${MISSING_FILE}`,
    });
  });

  it("encodes non-ASCII paths as object keys", async () => {
    expect(await get("/m%C3%ADsto/")).toEqual({
      kind: "fetch",
      uri: "/sites/ws_pekarna/dp_2/m%C3%ADsto/index.html",
    });
  });

  it("follows the live publish after a switch", async () => {
    store.set("s:ws_pekarna", "dp_3");
    try {
      expect(await get("/")).toEqual({ kind: "fetch", uri: "/sites/ws_pekarna/dp_3/index.html" });
    } finally {
      store.set("s:ws_pekarna", "dp_2");
    }
  });
});
