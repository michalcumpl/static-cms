import { describe, expect, it } from "vitest";
import { load } from "./+page.server";
import { GET } from "./demo/[...file]/+server";

type LoadEvent = Parameters<typeof load>[0];
type DemoEvent = Parameters<typeof GET>[0];

describe("/ load", () => {
  it("validates the demo site and lists its preview pages", async () => {
    const data = await load({} as LoadEvent);
    expect(data).toMatchObject({ valid: true, problems: [], mediaNames: ["hero.png"] });
    expect(data?.pages).toEqual([
      { id: "page_home", path: "index.html", url: "/preview/" },
      { id: "page_contact", path: "kontakt/index.html", url: "/preview/kontakt/" },
    ]);
  });
});

describe("/demo/[...file]", () => {
  const get = (file: string) => GET({ params: { file } } as DemoEvent);

  it("serves the fixture document", async () => {
    const response = await get("demo-site.json");
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect((await response.json()).document_id).toBe("site_1");
  });

  it("serves fixture media", async () => {
    const response = await get("media/hero.png");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it.each(["media/../demo-site.json", "media/missing.png", "package.json", "media/"])(
    "404s for %j",
    (file) => {
      expect(() => get(file)).toThrow(expect.objectContaining({ status: 404 }));
    },
  );
});
