import { describe, expect, it } from "vitest";
import { readSite, saveSite } from "$lib/server/site-store";
import { useTempDataDir } from "$lib/server/test-data-dir";
import { GET } from "./[...path]/+server";

type PreviewEvent = Parameters<typeof GET>[0];
// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely to build documents.
type Doc = { nodes: Record<string, any> };

useTempDataDir();

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
    async (path) => {
      await expect(get(path)).rejects.toMatchObject({ status: 404 });
    },
  );

  it("shows saved edits", async () => {
    const { document, version } = await readSite();
    (document as Doc).nodes.hero_1.heading.content = "Nový nadpis";
    await saveSite(document, version);
    expect(await (await get("")).text()).toContain("<h1>Nový nadpis</h1>");
  });

  it("shows the problems instead of the page while the saved site is invalid", async () => {
    const { document, version } = await readSite();
    (document as Doc).nodes.sub_about.content.content = "";
    (document as Doc).nodes.site_1.name = "<script>x</script>";
    await saveSite(document, version);
    const response = await get("");
    expect(response.status).toBe(422);
    const html = await response.text();
    expect(html).toContain("<code>empty-heading</code>");
    expect(html).not.toContain("<script>");
  });
});
