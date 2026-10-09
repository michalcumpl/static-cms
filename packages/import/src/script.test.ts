import { describe, expect, it } from "vitest";
import { looksBuiltByScript } from "./script.js";
import { fixtureText } from "./testing.js";

describe("pages built by a script", () => {
  it("Built in the browser: an empty app and a script", () => {
    expect(looksBuiltByScript(fixtureText("spa", "/"))).toBe(true);
  });

  it("reads the bakery's pages as plain HTML, its short page included", () => {
    for (const path of ["/", "/nase-pecivo/", "/o-nas/", "/kontakt.html", "/akce/"]) {
      expect(looksBuiltByScript(fixtureText("bakery", path)), path).toBe(false);
    }
    expect(looksBuiltByScript(fixtureText("studio", "/"))).toBe(false);
  });

  it("reads a photo gallery with little text as content", () => {
    const html = `<body><main><h1>Kia Road Show</h1><img src="/a.jpg" alt=""><img src="/b.jpg" alt=""></main><script src="/gallery.js"></script></body>`;
    expect(looksBuiltByScript(html)).toBe(false);
  });

  it("doesn't count a noscript message as content", () => {
    const html = `<body><div id="root"></div><noscript>${"Zapněte JavaScript. ".repeat(20)}</noscript><script src="/a.js"></script></body>`;
    expect(looksBuiltByScript(html)).toBe(true);
  });
});
