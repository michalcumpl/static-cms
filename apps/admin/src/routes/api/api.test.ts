import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as getMedia } from "./media/[name]/+server";
import { GET as getSite, PUT as putSite } from "./site/+server";

type SiteEvent = Parameters<typeof putSite>[0];
type MediaEvent = Parameters<typeof getMedia>[0];

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "site-api-"));
  process.env.SITE_DATA_DIR = dir;
});
afterEach(async () => {
  delete process.env.SITE_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

const read = async () => (await getSite({} as SiteEvent)).json();
const put = (body: unknown) =>
  putSite({
    request: new Request("http://x/api/site", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  } as SiteEvent);

describe("GET /api/site", () => {
  it("returns the document, its version and its problems", async () => {
    const site = await read();
    expect(site).toMatchObject({ document: { document_id: "site_1" }, problems: [] });
    expect(typeof site.version).toBe("string");
  });
});

describe("PUT /api/site", () => {
  it("saves and returns the new version and problems", async () => {
    const { document, version } = await read();
    document.nodes.sub_about.content.content = "";
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.version).not.toBe(version);
    expect(body.problems.map((p: { code: string }) => p.code)).toEqual(["empty-heading"]);
  });

  it("answers 409 for an outdated base version", async () => {
    const { document, version } = await read();
    await put({ document, baseVersion: version });
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/changed elsewhere/);
  });

  it("answers 422 with the structural problems", async () => {
    const { document, version } = await read();
    document.nodes.page_home.blocks.nodes.push("services_9");
    const response = await put({ document, baseVersion: version });
    expect(response.status).toBe(422);
    expect((await response.json()).problems).toEqual([
      expect.objectContaining({ code: "missing-reference", category: "structure" }),
    ]);
  });

  it.each(["not json", { document: {} }, { baseVersion: "v" }, null])(
    "answers 400 for a malformed body %j",
    async (body) => {
      await expect(put(body)).rejects.toMatchObject({ status: 400 });
    },
  );
});

describe("GET /api/media/[name]", () => {
  it("serves known media", async () => {
    const response = await getMedia({ params: { name: "hero.png" } } as MediaEvent);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it.each(["missing.png", "../site.json", "demo-site.json"])("404s for %j", (name) => {
    expect(() => getMedia({ params: { name } } as MediaEvent)).toThrow(
      expect.objectContaining({ status: 404 }),
    );
  });
});
