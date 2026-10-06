import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { renderSite } from "@webmio/render";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { siteDocuments, versions, workspaces } from "./db/schema";
import { newId } from "./ids";
import { createProject, readSite, versionCount } from "./site-documents";
import { upgradeProjects } from "./upgrade-projects";
import { listVersions } from "./versions";

// biome-ignore lint/suspicious/noExplicitAny: tests reshape raw stored documents.
type Doc = { document_id: string; nodes: Record<string, any> };
const require = createRequire(import.meta.url);
const text = (content: string) => ({ content, marks: [], annotations: [] });

function demoV6(): Doc {
  const file = require.resolve("@webmio/model/fixtures/demo-site-v6.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

/** A project with a stored Czech and English document, both as given (bypassing upgrades). */
function project(db: Db, cs: Doc, en?: Doc): string {
  const workspaceId = newId("w");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  const projectId = createProject(db, workspaceId, "Pekárna U Lípy", cs);
  if (en) {
    const documentId = newId("d");
    const versionId = newId("v");
    const version = randomUUID();
    db.insert(siteDocuments)
      .values({ id: documentId, projectId, lang: "en", version, currentVersionId: versionId })
      .run();
    db.insert(versions)
      .values({ id: versionId, documentId, version, document: en, createdAt: new Date() })
      .run();
  }
  return projectId;
}

function stored(db: Db, projectId: string, lang: string): Doc {
  const row = db
    .select({ document: versions.document })
    .from(siteDocuments)
    .innerJoin(versions, eq(versions.id, siteDocuments.currentVersionId))
    .where(and(eq(siteDocuments.projectId, projectId), eq(siteDocuments.lang, lang)))
    .get();
  return row?.document as Doc;
}

function pagesOf(db: Db, projectId: string, lang: string): string[] {
  const site = readSite(db, projectId, lang);
  const result = renderSite(site?.document);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages.map((page) => page.html);
}

const serviceNames = (html: string) =>
  [...html.matchAll(/<p class="service-name">([^<]*)<\/p>/g)].map((m) => m[1]);

describe("upgradeProjects", () => {
  it("Czech and English project", () => {
    const db = openDatabase(":memory:");
    const en = demoV6();
    en.nodes.site_1.lang = "en";
    en.nodes.service_bread.name = text("Bread");
    const projectId = project(db, demoV6(), en);

    expect(upgradeProjects(db)).toBe(1);
    for (const lang of ["cs", "en"]) {
      const doc = stored(db, projectId, lang);
      // Upgraded through to the current format (8 since business-locations).
      expect(doc.nodes.site_1.schema_version).toBe(8);
      expect(doc.nodes.site_1.services.nodes).toEqual([
        "service_bread",
        "service_rolls",
        "service_cakes",
      ]);
      expect(doc.nodes.services_1.show).toBe("all");
    }
    expect(serviceNames(pagesOf(db, projectId, "en")[0] ?? "")).toEqual([
      "Bread",
      "Rohlíky a housky",
      "Dorty na objednávku",
    ]);
    const history = listVersions(db, projectId, "cs")?.versions ?? [];
    expect(history[0]).toMatchObject({ system: true, savedBy: null, current: true });
    // One new version per language (versionCount counts all of the project's languages).
    expect(versionCount(db, projectId)).toBe(4);
  });

  it("A service only in English", () => {
    const db = openDatabase(":memory:");
    const en = demoV6();
    en.nodes.site_1.lang = "en";
    en.nodes.service_gf = {
      id: "service_gf",
      type: "service_item",
      name: text("Gluten-free bread"),
      description: text(""),
      price: text(""),
    };
    en.nodes.services_1.items.nodes.push("service_gf");
    const projectId = project(db, demoV6(), en);
    upgradeProjects(db);

    const cs = stored(db, projectId, "cs");
    expect(cs.nodes.site_1.services.nodes).toEqual([
      "service_bread",
      "service_rolls",
      "service_cakes",
      "service_gf",
    ]);
    expect(cs.nodes.service_gf.name.content).toBe("Gluten-free bread");
    expect(cs.nodes.services_1.show).toBe("chosen");
    expect(serviceNames(pagesOf(db, projectId, "cs")[0] ?? "")).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
    ]);
    expect(serviceNames(pagesOf(db, projectId, "en")[0] ?? "")).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
      "Gluten-free bread",
    ]);
    expect(readSite(db, projectId, "en")?.problems).toEqual([]);
    expect(readSite(db, projectId, "cs")?.problems).toEqual([]);
  });

  it("Already upgraded", () => {
    const db = openDatabase(":memory:");
    const projectId = project(db, demoV6());
    upgradeProjects(db);
    const count = versionCount(db, projectId);
    expect(upgradeProjects(db)).toBe(0);
    expect(versionCount(db, projectId)).toBe(count);
  });

  it("leaves the project unchanged and names it when the upgrade fails", () => {
    const db = openDatabase(":memory:");
    const en = demoV6();
    en.nodes.site_1.lang = "en";
    en.nodes.service_gf = { ...en.nodes.service_bread, id: "service_gf" };
    en.nodes.services_1.items.nodes.push("service_gf");
    const cs = demoV6();
    // The English-only item's ID is taken by another node in Czech.
    cs.nodes.service_gf = { id: "service_gf", type: "strong" };
    cs.nodes.hero_1.text.marks.push({ start_offset: 0, end_offset: 1, node_id: "service_gf" });
    const projectId = project(db, cs, en);
    expect(() => upgradeProjects(db)).toThrow(`Could not upgrade project ${projectId}`);
    expect(stored(db, projectId, "cs").nodes.site_1.schema_version).toBe(6);
    expect(stored(db, projectId, "en").nodes.site_1.schema_version).toBe(6);
    expect(versionCount(db, projectId)).toBe(2);
  });
});
