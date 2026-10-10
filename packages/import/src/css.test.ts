import { describe, expect, it } from "vitest";
import { absoluteCssUrls, backgroundRules } from "./css.js";

describe("a stylesheet's addresses", () => {
  it("are relative to the stylesheet, whichever page uses it", () => {
    const css = `.panel { background: url(img/dusni.jpg) center / cover; }
      .logo { background-image: url("../logo.png"); }
      .icon { background: url('data:image/png;base64,AAAA'); }
      .far { background: url(https://cdn.example/a.jpg); }`;
    const absolute = absoluteCssUrls(css, "https://www.marespartners.cz/css/site.css");
    expect(backgroundRules(absolute).map((r) => r.url)).toEqual([
      "https://www.marespartners.cz/css/img/dusni.jpg",
      "https://www.marespartners.cz/logo.png",
      "data:image/png;base64,AAAA",
      "https://cdn.example/a.jpg",
    ]);
  });
});
