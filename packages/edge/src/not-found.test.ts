import { describe, expect, it, vi } from "vitest";
import { parseRedirects, resolveMissing, splitUri } from "./not-found.js";

function bucket(objects: Record<string, string>) {
  return vi.fn(async (key: string) => objects[key]);
}

describe("parseRedirects", () => {
  it("reads Netlify's format, skipping blanks and comments, the first line winning", () => {
    const redirects = parseRedirects(
      "# earlier\n/kontakt/ /napiste-nam/ 301\n\n/kontakt/ /jinam/ 301\n/en/contact/ /en/write/\n",
    );
    expect([...redirects]).toEqual([
      ["/kontakt/", "/napiste-nam/"],
      ["/en/contact/", "/en/write/"],
    ]);
  });
});

describe("splitUri", () => {
  it("finds the publish folder and the visitor's address", () => {
    expect(splitUri("/sites/ws_a/dp_1/kontakt/index.html")).toEqual({
      folder: "sites/ws_a/dp_1/",
      deployKey: "ws_a/dp_1",
      path: "/kontakt/",
    });
    expect(splitUri("/sites/ws_a/dp_1/m%C3%ADsto/a.css")?.path).toBe("/místo/a.css");
  });

  it("refuses other URIs", () => {
    expect(splitUri("/index.html")).toBeUndefined();
    expect(splitUri("/sites/ws_a")).toBeUndefined();
  });
});

describe("resolveMissing", () => {
  const objects = {
    "sites/ws_a/dp_1/_redirects": "/kontakt/ /napiste-nam/ 301\n/stary.html /novy/ 301\n",
    "sites/ws_a/dp_1/404.html": "<h1>Tady nic není</h1>",
    "sites/ws_a/dp_2/404.html": "<h1>Druhý</h1>",
  };

  it("redirects an earlier address of the publish", async () => {
    const result = await resolveMissing({
      uri: "/sites/ws_a/dp_1/kontakt/index.html",
      read: bucket(objects),
    });
    expect(result).toMatchObject({ status: 301, headers: { location: "/napiste-nam/" } });
  });

  it("redirects whether or not the address has its trailing slash", async () => {
    const read = bucket(objects);
    expect(await resolveMissing({ uri: "/sites/ws_a/dp_1/kontakt", read })).toMatchObject({
      status: 301,
      headers: { location: "/napiste-nam/" },
    });
    expect(await resolveMissing({ uri: "/sites/ws_a/dp_1/stary.html", read })).toMatchObject({
      headers: { location: "/novy/" },
    });
  });

  it("answers anything else with the publish's own 404 page", async () => {
    const result = await resolveMissing({
      uri: "/sites/ws_a/dp_1/stara-stranka/index.html",
      read: bucket(objects),
    });
    expect(result).toEqual({
      status: 404,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
      },
      body: "<h1>Tady nic není</h1>",
    });
  });

  it("falls back to a plain page when the publish has no 404.html", async () => {
    const result = await resolveMissing({ uri: "/sites/ws_b/dp_1/x/index.html", read: bucket({}) });
    expect(result).toMatchObject({ status: 404 });
    expect(result?.body).toContain("Page not found");
  });

  it("follows the publish the request was routed to (redirects follow rollback)", async () => {
    const read = bucket(objects);
    expect(
      await resolveMissing({ uri: "/sites/ws_a/dp_1/kontakt/index.html", read }),
    ).toMatchObject({ status: 301 });
    const other = await resolveMissing({ uri: "/sites/ws_a/dp_2/kontakt/index.html", read });
    expect(other).toMatchObject({ status: 404, body: "<h1>Druhý</h1>" });
  });

  it("reads a deploy's _redirects once", async () => {
    const read = bucket(objects);
    await resolveMissing({ uri: "/sites/ws_c/dp_7/a/index.html", read });
    await resolveMissing({ uri: "/sites/ws_c/dp_7/b/index.html", read });
    expect(read.mock.calls.filter(([key]) => key.endsWith("_redirects"))).toHaveLength(1);
  });

  it("leaves URIs that aren't a publish's alone", async () => {
    expect(await resolveMissing({ uri: "/favicon.ico", read: bucket({}) })).toBeUndefined();
  });
});
