import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { siteDocuments, versions } from "$lib/server/db/schema";
import { listLibrary, removeFromLibrary } from "$lib/server/media";
import { readSite, saveSite } from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { GET } from "./[...path]/+server";

type PreviewEvent = Parameters<typeof GET>[0];
// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely to build documents.
type Doc = { nodes: Record<string, any> };

let path = "";
const project = useTestProject(() => ({ path }));

// `null` means not signed in (`undefined` would pick the default, the owner).
const get = (at: string, user: { id: string; email: string } | null = project().owner) => {
  path = at;
  return GET(
    project().event(
      `/p/${project().projectId}/preview/${at}`,
      user ?? undefined,
    ) as unknown as PreviewEvent,
  );
};
const base = () => `/p/${project().projectId}/preview/`;

function save(edit: (doc: Doc) => void) {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId);
  if (!site) throw new Error("no site");
  edit(site.document as Doc);
  saveSite(db, projectId, owner.id, site.document, site.version);
}

describe("/p/[project]/preview/[...path]", () => {
  it("serves the home page with links under the project's preview", async () => {
    const response = await get("");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain("<title>Pekárna U Lípy</title>");
    expect(html).toContain(`<link rel="stylesheet" href="${base()}assets/style.css">`);
    expect(html).toContain(`<li><a href="${base()}kontakt/">Kontakt</a></li>`);
  });

  it.each(["kontakt", "kontakt/", "kontakt/index.html"])(
    "serves the contact page at %j",
    async (at) => {
      const html = await (await get(at)).text();
      expect(html).toContain(`<a href="${base()}kontakt/" aria-current="page">Kontakt</a>`);
    },
  );

  it("serves the stylesheet and the project's images with their types", async () => {
    const css = await get("assets/style.css");
    expect(css.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(await css.text()).toContain("--color-primary");
    const image = await get("assets/images/hero.png-320.webp");
    expect(image.headers.get("content-type")).toBe("image/webp");
  });

  it.each([
    "missing/",
    "assets/images/hero.png",
    "assets/images/nope.png",
    "../package.json",
    "assets",
  ])("404s for %j", async (at) => {
    expect(await thrownBy(() => get(at))).toMatchObject({ status: 404 });
  });

  it("is only for members", async () => {
    expect(await thrownBy(() => get("", null))).toMatchObject({ status: 303 });
    expect(await thrownBy(() => get("", project().outsider))).toMatchObject({ status: 404 });
  });

  it("shows saved edits", async () => {
    save((doc) => {
      doc.nodes.hero_1.heading.content = "Nový nadpis";
    });
    expect(await (await get("")).text()).toContain("<h1>Nový nadpis</h1>");
  });

  it("shows the problems instead of the page while the saved site is invalid", async () => {
    save((doc) => {
      doc.nodes.sub_about.content.content = "";
      doc.nodes.site_1.name = "<script>x</script>";
    });
    const response = await get("");
    expect(response.status).toBe(422);
    const html = await response.text();
    expect(html).toContain("<code>empty-heading</code>");
    expect(html).toContain(`href="/p/${project().projectId}/edit/"`);
    expect(html).not.toContain("<script>");
  });

  it("renders a project stored in the version-1 format from the upgraded document", async () => {
    const { db, projectId } = project();
    const require = createRequire(import.meta.url);
    const v1 = JSON.parse(
      readFileSync(require.resolve("@static-cms/site/fixtures/demo-site-v1.json"), "utf8"),
    );
    const current = db
      .select({ versionId: siteDocuments.currentVersionId })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .get();
    db.update(versions)
      .set({ document: v1 })
      .where(eq(versions.id, current?.versionId ?? ""))
      .run();
    const response = await get("");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Pekárna U Lípy</title>");
    expect(html).not.toContain("unsupported-version");
  });

  it("still shows an image the saved site uses after it is removed from the library", async () => {
    const { db, projectId } = project();
    expect(removeFromLibrary(db, projectId, "hero.png")).toBe(true);
    expect(listLibrary(db, projectId)).toEqual([]);
    const html = await (await get("")).text();
    expect(html).toContain(`src="${base()}assets/images/hero.png-320.webp"`);
    expect((await get("assets/images/hero.png-320.webp")).status).toBe(200);
  });
});
