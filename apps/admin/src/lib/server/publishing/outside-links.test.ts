import { describe, expect, it, vi } from "vitest";
import { answered, checkOutsideLinks, outsideLinkChecksEnabled, USER_AGENT } from "./outside-links";

/** A fetch answering by address; "hang" never answers. */
function sites(answers: Record<string, number | "hang" | { HEAD: number; GET: number }>) {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const answer = answers[url];
    if (answer === undefined) throw new TypeError("fetch failed");
    if (answer === "hang") {
      return new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    }
    const status = typeof answer === "number" ? answer : answer[init?.method as "HEAD" | "GET"];
    return new Response(null, { status });
  });
}

describe("answered", () => {
  it("counts refusals of bots as answers, and missing pages and failing servers as not", () => {
    expect([200, 301, 401, 403, 429].map(answered)).toEqual([true, true, true, true, true]);
    expect([404, 410, 500, 503].map(answered)).toEqual([false, false, false, false]);
  });
});

describe("checkOutsideLinks", () => {
  it("warns about every link to an address that isn't there, with the page", async () => {
    const fetch = sites({
      "https://ok.example/": 200,
      "https://gone.example/": 404,
      "https://bot-wall.example/": 403,
    });
    const warnings = await checkOutsideLinks(
      [
        { page: "/", url: "https://ok.example/" },
        { page: "/", url: "https://gone.example/" },
        { page: "/kontakt/", url: "https://gone.example/" },
        { page: "/", url: "https://bot-wall.example/" },
      ],
      { fetch },
    );
    expect(warnings).toEqual([
      { kind: "outside-link", page: "/", url: "https://gone.example/", status: 404 },
      { kind: "outside-link", page: "/kontakt/", url: "https://gone.example/", status: 404 },
    ]);
    // Each address is asked once, as Webmio.
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: "HEAD",
      headers: { "user-agent": USER_AGENT },
    });
  });

  it("warns about an address that doesn't answer in time or at all", async () => {
    const warnings = await checkOutsideLinks(
      [
        { page: "/", url: "https://slow.example/" },
        { page: "/", url: "https://nowhere.example/" },
      ],
      { fetch: sites({ "https://slow.example/": "hang" }), timeoutMs: 50 },
    );
    expect(warnings).toEqual([
      { kind: "outside-link", page: "/", url: "https://slow.example/" },
      { kind: "outside-link", page: "/", url: "https://nowhere.example/" },
    ]);
  });

  it("asks again with GET when HEAD isn't allowed", async () => {
    const fetch = sites({ "https://get-only.example/": { HEAD: 405, GET: 200 } });
    expect(
      await checkOutsideLinks([{ page: "/", url: "https://get-only.example/" }], { fetch }),
    ).toEqual([]);
    expect(fetch.mock.calls.map(([, init]) => init?.method)).toEqual(["HEAD", "GET"]);
  });

  it("asks at most the given number of addresses and says how many it skipped", async () => {
    const links = Array.from({ length: 5 }, (_, i) => ({
      page: "/",
      url: `https://s${i}.example/`,
    }));
    const fetch = sites(Object.fromEntries(links.map((link) => [link.url, 200])));
    expect(await checkOutsideLinks(links, { fetch, max: 3 })).toEqual([
      { kind: "outside-links-skipped", count: 2 },
    ]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("is on unless the server turns it off", () => {
    expect(outsideLinkChecksEnabled({})).toBe(true);
    expect(outsideLinkChecksEnabled({ PUBLISH_CHECK_OUTSIDE_LINKS: "false" })).toBe(false);
  });
});
