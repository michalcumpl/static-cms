import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import { isPublicAddress, safeFetch } from "./safe-fetch";

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer("bakery");
});
afterAll(() => server.close());

const allowed = () => ({ allowHosts: new Set([server.host]) });

describe("safe fetching", () => {
  it("fetches a page of the local test site, its own address replaced", async () => {
    const result = await safeFetch(`${server.origin}/`, "page", allowed());
    expect(result).toMatchObject({
      ok: true,
      status: 200,
      contentType: "text/html; charset=utf-8",
    });
    if (result.ok)
      expect(new TextDecoder().decode(result.body)).toContain(`${server.origin}/images/logo.svg`);
  });

  it("refuses the local server without the test's permission", async () => {
    expect(await safeFetch(`${server.origin}/`, "page")).toMatchObject({
      ok: false,
      reason: "blocked",
    });
  });

  it("Redirect to an internal address: not fetched", async () => {
    const result = await safeFetch(`${server.origin}/to-metadata`, "page", allowed());
    expect(result).toEqual({
      ok: false,
      url: "http://169.254.169.254/latest/meta-data/",
      reason: "blocked",
    });
  });

  it("Host name resolving to a private address: refused when it connects", async () => {
    const result = await safeFetch("http://intranet.example.cz/", "page", {
      resolver: async () => [{ address: "10.0.0.5", family: 4 }],
    });
    expect(result).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("refuses a name with any private address among public ones (rebinding)", async () => {
    const result = await safeFetch("http://mixed.example.cz/", "page", {
      resolver: async () => [
        { address: "93.184.216.34", family: 4 },
        { address: "127.0.0.1", family: 4 },
      ],
    });
    expect(result).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("refuses other schemes and ports", async () => {
    for (const url of [
      "ftp://pekarna-ulipy.cz/",
      "file:///etc/passwd",
      "http://pekarna-ulipy.cz:8080/",
    ]) {
      expect(await safeFetch(url, "page"), url).toMatchObject({ ok: false, reason: "blocked" });
    }
  });

  it("stops after five redirects", async () => {
    expect(await safeFetch(`${server.origin}/loop`, "page", allowed())).toMatchObject({
      ok: false,
      reason: "redirects",
    });
  });

  it("abandons a body over the limit, counted after decompression", async () => {
    expect(await safeFetch(`${server.origin}/huge`, "page", allowed())).toMatchObject({
      ok: false,
      reason: "too-large",
    });
  });

  it("gives up on a slow answer when the import's deadline passes", async () => {
    const result = await safeFetch(`${server.origin}/slow`, "page", {
      ...allowed(),
      signal: AbortSignal.timeout(200),
    });
    expect(result).toMatchObject({ ok: false, reason: "timeout" });
  });

  it("reports an error status", async () => {
    expect(await safeFetch(`${server.origin}/broken`, "page", allowed())).toMatchObject({
      ok: false,
      reason: "status",
      status: 500,
    });
  });
});

describe("public addresses", () => {
  it.each([
    ["93.184.216.34", true],
    ["2606:2800:220:1:248:1893:25c8:1946", true],
    ["10.0.0.5", false],
    ["127.0.0.1", false],
    ["169.254.169.254", false],
    ["100.64.1.1", false],
    ["::1", false],
    ["fe80::1", false],
    ["fd00::1", false],
    ["::ffff:127.0.0.1", false],
    ["::ffff:7f00:1", false],
    ["::ffff:93.184.216.34", true],
    ["0.0.0.0", false],
    ["localhost", false],
  ])("%s is public: %s", (address, expected) => {
    expect(isPublicAddress(address)).toBe(expected);
  });
});
