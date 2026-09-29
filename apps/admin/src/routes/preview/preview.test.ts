import { describe, expect, it } from "vitest";
import { GET } from "./[...path]/+server";

type PreviewEvent = Parameters<typeof GET>[0];

const get = (path: string) => GET({ params: { path } } as PreviewEvent);

describe("/preview/[...path]", () => {
  it("serves the home page with preview links", async () => {
    const response = await get("");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain("<title>Pekárna U Lípy</title>");
    expect(html).toContain('<link rel="stylesheet" href="/preview/assets/style.css">');
    expect(html).toContain('<li><a href="/preview/kontakt/">Kontakt</a></li>');
  });

  it.each(["kontakt", "kontakt/", "kontakt/index.html"])(
    "serves the contact page at %j",
    async (path) => {
      const html = await (await get(path)).text();
      expect(html).toContain('<a href="/preview/kontakt/" aria-current="page">Kontakt</a>');
    },
  );

  it("serves the stylesheet and images with their types", async () => {
    const css = await get("assets/style.css");
    expect(css.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(await css.text()).toContain("--color-primary");
    const image = await get("assets/images/hero.png");
    expect(image.headers.get("content-type")).toBe("image/png");
  });

  it.each(["missing/", "assets/images/nope.png", "../package.json", "assets"])(
    "404s for %j",
    (path) => {
      expect(() => get(path)).toThrow(expect.objectContaining({ status: 404 }));
    },
  );
});
