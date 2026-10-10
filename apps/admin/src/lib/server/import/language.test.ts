import { afterEach, describe, expect, it } from "vitest";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import { languagesOnOffer } from "./language";

let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("the languages on offer", () => {
  it("names a link without hreflang by its page, keeps one address per language, and only offered ones", async () => {
    server = await startFixtureServer("bakery");
    const origin = server.origin;
    const html = `<html lang="cs"><body><header><nav><a href="/">Úvod</a></nav>
      <div class="lang"><a href="/en/contact.html">EN</a><a href="/en/">English</a>
      <a href="/hu/" hreflang="hu">HU</a><a href="/cs/" hreflang="cs">CZ</a></div></header>
      <main><h1>Pekárna</h1></main></body></html>`;
    const { offers, langOf } = await languagesOnOffer({ url: `${origin}/`, html, css: [] }, "cs", {
      allowHosts: new Set([server.host]),
    });
    expect(offers).toEqual([{ lang: "en", url: `${origin}/en/` }]);
    expect(langOf.get(`${origin}/en/`)).toBe("en");
    expect(langOf.get(`${origin}/hu/`)).toBe("hu");
  });
});
