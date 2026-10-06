import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { siteDocuments, versions, workspaces } from "$lib/server/db/schema";
import { newId } from "$lib/server/ids";
import { addLanguage, createProject, readSite, saveSite } from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { GET } from "./[version]/[...path]/+server";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };

let version = "";
let path = "";
const project = useTestProject(() => ({ version, path }));

function saveHeading(heading: string, lang?: string) {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId, lang);
  const doc = structuredClone(site?.document) as Doc;
  doc.nodes.hero_1.heading.content = heading;
  saveSite(db, projectId, owner.id, doc, site?.version ?? "", lang);
  return readSite(db, projectId, lang)?.versionId as string;
}

function get(versionId: string, at = "") {
  version = versionId;
  path = at;
  return GET(
    project().event(
      `/p/${project().projectId}/history/${versionId}/${at}`,
      project().owner,
    ) as never,
  );
}
const base = (versionId: string) => `/p/${project().projectId}/history/${versionId}/`;

describe("version preview", () => {
  it("shows an older version, with its own links, stylesheet and banner", async () => {
    const older = saveHeading("Čerstvý chléb");
    saveHeading("Nový nadpis");
    const html = await (await get(older)).text();
    expect(html).toContain("<h1>Čerstvý chléb</h1>");
    expect(html).toContain(`<a href="${base(older)}kontakt/">Kontakt</a>`);
    expect(html).toContain(`<link rel="stylesheet" href="${base(older)}assets/style.css">`);
    expect(html).toMatch(
      /<body>\n<p class="version-banner"[^>]*>Version of .* · read-only · <a href="\/p\/[^"]+\/history"/,
    );
    const css = await get(older, "assets/style.css");
    expect(css.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect((await css.text()).includes("version-banner")).toBe(false);
    const image = await get(older, "assets/images/hero.png-320.webp");
    expect(image.headers.get("content-type")).toBe("image/webp");
    const contact = await (await get(older, "kontakt/")).text();
    expect(contact).toContain("Kontakt");
  });

  it("upgrades an older stored format", async () => {
    const { db, projectId } = project();
    const require = createRequire(import.meta.url);
    const v1 = JSON.parse(
      readFileSync(require.resolve("@webmio/model/fixtures/demo-site-v1.json"), "utf8"),
    );
    const docId = db
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .get()?.id as string;
    const old = newId("v");
    db.insert(versions)
      .values({ id: old, documentId: docId, version: "x", document: v1, createdAt: new Date(0) })
      .run();
    const response = await get(old);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("<title>Pekárna U Lípy</title>");
  });

  it("gives an English version the current Czech shared fields, and links back to its history", async () => {
    const { db, projectId, owner } = project();
    addLanguage(db, projectId, "en", owner.id);
    const englishVersion = readSite(db, projectId, "en")?.versionId as string;
    const site = readSite(db, projectId);
    const doc = structuredClone(site?.document) as Doc;
    doc.nodes.location_1.phone = "+420321123456";
    saveSite(db, projectId, owner.id, doc, site?.version ?? "");
    const html = await (await get(englishVersion)).text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('href="tel:+420321123456"');
    expect(html).toContain(`/p/${projectId}/history?lang=en`);
  });

  it("answers 404 for a version of another project", async () => {
    const { db } = project();
    const other = createProject(db, db.select().from(workspaces).get()?.id as string, "Jiný");
    const otherVersion = readSite(db, other)?.versionId as string;
    expect(await thrownBy(() => get(otherVersion))).toMatchObject({ status: 404 });
  });
});
