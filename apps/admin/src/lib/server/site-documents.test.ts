import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { validate_document } from "svedit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { editorSchema } from "../editor/schema";
import { type Db, openDatabase } from "./db/index";
import { siteDocuments, users, versions, workspaces } from "./db/schema";
import { demoSite, starterSite } from "./demo";
import { newId } from "./ids";
import { createProject, readSite, saveSite, versionCount } from "./site-documents";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely to build documents.
type Doc = { nodes: Record<string, any> };

function setup(db: Db) {
  const workspaceId = newId("w");
  const userId = newId("u");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  const projectId = createProject(db, workspaceId, "Pekárna U Lípy", demoSite());
  return { workspaceId, userId, projectId };
}

const require = createRequire(import.meta.url);

/** The demo site in the version-1 format (home first, with an empty slug). */
function demoSiteV1(): Doc {
  const file = require.resolve("@webmio/model/fixtures/demo-site-v1.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

/** The document as stored, without the upgrade on read. */
function storedDoc(db: Db, projectId: string): Doc {
  const row = db
    .select({ document: versions.document })
    .from(siteDocuments)
    .innerJoin(versions, eq(versions.id, siteDocuments.currentVersionId))
    .where(eq(siteDocuments.projectId, projectId))
    .get();
  return row?.document as Doc;
}

function currentDoc(db: Db, projectId: string): Doc {
  const site = readSite(db, projectId);
  if (!site) throw new Error(`project ${projectId} has no document`);
  return site.document as Doc;
}

function edited(edit: (nodes: Doc["nodes"]) => void): Doc {
  const doc = demoSite() as Doc;
  edit(doc.nodes);
  return doc;
}

let dir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "site-documents-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("project documents", () => {
  it("reads a project's document with its version and problems", () => {
    const db = openDatabase(":memory:");
    const { projectId } = setup(db);
    expect(readSite(db, projectId)).toMatchObject({ document: demoSite(), problems: [] });
    expect(readSite(db, "p_missing")).toBeUndefined();
  });

  it("keeps saved documents across a restart", () => {
    const path = join(dir, "app.db");
    const first = openDatabase(path);
    const { projectId, userId } = setup(first);
    const { version } = readSite(first, projectId) ?? { version: "" };
    const doc = edited((n) => {
      n.hero_1.heading.content = "Nový nadpis";
    });
    expect(saveSite(first, projectId, userId, doc, version).ok).toBe(true);

    const restarted = openDatabase(path);
    expect(readSite(restarted, projectId)?.document).toEqual(doc);
  });

  it("stores every accepted save as a version", () => {
    const db = openDatabase(":memory:");
    const { projectId, userId } = setup(db);
    let version = readSite(db, projectId)?.version ?? "";
    for (const text of ["A", "B", "C"]) {
      const result = saveSite(
        db,
        projectId,
        userId,
        edited((n) => void Object.assign(n.hero_1.heading, { content: text })),
        version,
      );
      if (!result.ok) throw new Error("save refused");
      version = result.version;
    }
    expect(versionCount(db, projectId)).toBe(4); // the first version plus three saves
    expect(currentDoc(db, projectId).nodes.hero_1.heading.content).toBe("C");
  });

  it("saves unfinished content and returns its problems", () => {
    const db = openDatabase(":memory:");
    const { projectId, userId } = setup(db);
    const { version } = readSite(db, projectId) ?? { version: "" };
    const result = saveSite(
      db,
      projectId,
      userId,
      edited((n) => void Object.assign(n.sub_about.content, { content: "" })),
      version,
    );
    expect(result.ok && result.problems.map((p) => p.code)).toEqual(["empty-heading"]);
  });

  it("refuses a structurally broken document and changes nothing", () => {
    const db = openDatabase(":memory:");
    const { projectId, userId } = setup(db);
    const before = readSite(db, projectId);
    const result = saveSite(
      db,
      projectId,
      userId,
      edited((n) => void n.page_home.blocks.nodes.push("services_9")),
      before?.version ?? "",
    );
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      problems: [expect.objectContaining({ code: "missing-reference", category: "structure" })],
    });
    expect(readSite(db, projectId)).toEqual(before);
    expect(versionCount(db, projectId)).toBe(1);
  });

  it("rejects a save based on an outdated version and keeps the newer one", () => {
    const db = openDatabase(":memory:");
    const { projectId, userId } = setup(db);
    const { version: v5 } = readSite(db, projectId) ?? { version: "" };
    expect(
      saveSite(
        db,
        projectId,
        userId,
        edited((n) => void Object.assign(n.hero_1.heading, { content: "A" })),
        v5,
      ).ok,
    ).toBe(true);
    expect(
      saveSite(
        db,
        projectId,
        userId,
        edited((n) => void Object.assign(n.hero_1.heading, { content: "B" })),
        v5,
      ),
    ).toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(currentDoc(db, projectId).nodes.hero_1.heading.content).toBe("A");
  });

  it("accepts exactly one of two saves on the same version from two connections", () => {
    const path = join(dir, "app.db");
    const a = openDatabase(path);
    const { projectId, userId } = setup(a);
    const b = openDatabase(path);
    const { version } = readSite(a, projectId) ?? { version: "" };
    const results = [
      saveSite(
        a,
        projectId,
        userId,
        edited((n) => void Object.assign(n.hero_1.heading, { content: "A" })),
        version,
      ),
      saveSite(
        b,
        projectId,
        userId,
        edited((n) => void Object.assign(n.hero_1.heading, { content: "B" })),
        version,
      ),
    ];
    expect(results.map((r) => r.ok)).toEqual([true, false]);
    expect(versionCount(b, projectId)).toBe(2);
  });

  it("creates new projects from the starter site, named after the project", () => {
    const db = openDatabase(":memory:");
    const { workspaceId } = setup(db);
    const projectId = createProject(db, workspaceId, "Kadeřnictví Eva");
    const site = readSite(db, projectId);
    if (!site) throw new Error("project has no document");
    // A new site only lacks a description, which the owner adds while editing.
    expect(site.problems.map((p) => p.code)).toEqual(["no-description"]);
    expect((site.document as Doc).nodes.site_1.name).toBe("Kadeřnictví Eva");
    expect(() => validate_document(starterSite("X") as never, editorSchema)).not.toThrow();
  });
});

describe("upgrading stored documents", () => {
  function setupV1(db: Db) {
    const { workspaceId, userId } = setup(db);
    const projectId = createProject(db, workspaceId, "Stará pekárna", demoSiteV1());
    return { userId, projectId };
  }

  it("returns a version-1 document upgraded, with the stored version, and leaves the row alone", () => {
    const db = openDatabase(":memory:");
    const { projectId } = setupV1(db);
    const site = readSite(db, projectId);
    if (!site) throw new Error("project has no document");
    const doc = site.document as Doc;
    expect(doc.nodes.site_1).toMatchObject({ schema_version: 13, home_page_id: "page_home" });
    expect(doc.nodes.page_home.slug).toBe("uvod");
    expect(site.problems).toEqual([]);
    expect(storedDoc(db, projectId)).toEqual(demoSiteV1());
    expect(readSite(db, projectId)?.version).toBe(site.version);
  });

  it("returns a version-2 document upgraded to version 13", () => {
    const db = openDatabase(":memory:");
    const { workspaceId } = setup(db);
    const v2 = JSON.parse(
      readFileSync(require.resolve("@webmio/model/fixtures/demo-site-v2.json"), "utf8"),
    ) as Doc;
    const projectId = createProject(db, workspaceId, "Stará pekárna", v2);
    const site = readSite(db, projectId);
    if (!site) throw new Error("project has no document");
    const doc = site.document as Doc;
    expect(doc.nodes.site_1).toMatchObject({ schema_version: 13, allow_ai_training: true });
    expect(doc.nodes.page_contact.share_image.nodes).toEqual([]);
    expect(doc.nodes.theme_1.font_body).toBe("system-sans");
    expect(site.problems).toEqual([]);
  });

  it("reads a version-12 document as Standard at release 1, with every block shown", () => {
    const db = openDatabase(":memory:");
    const { workspaceId } = setup(db);
    const v12 = JSON.parse(
      readFileSync(require.resolve("@webmio/model/fixtures/demo-site-v12.json"), "utf8"),
    ) as Doc;
    const projectId = createProject(db, workspaceId, "Pekárna", v12);
    const site = readSite(db, projectId);
    if (!site) throw new Error("project has no document");
    const doc = site.document as Doc;
    expect(doc.nodes.site_1).toMatchObject({
      schema_version: 13,
      template: "standard",
      template_release: 1,
    });
    expect(doc.nodes.hero_1.hidden).toBe(false);
    expect(site.problems).toEqual([]);
    expect(storedDoc(db, projectId)).toEqual(v12);
  });

  it("reports a page that shows nothing, and a template the code doesn't know", () => {
    const db = openDatabase(":memory:");
    const { workspaceId } = setup(db);
    const doc = structuredClone(demoSite()) as Doc;
    doc.nodes.rich_text_contact.hidden = true;
    const projectId = createProject(db, workspaceId, "Pekárna", doc);
    expect(readSite(db, projectId)?.problems.map((p) => [p.severity, p.code])).toEqual([
      ["warning", "page-shows-nothing"],
    ]);
    doc.nodes.site_1.template = "bakery";
    const other = createProject(db, workspaceId, "Pekárna 2", doc);
    expect(readSite(db, other)?.problems.map((p) => p.code)).toContain("unknown-template");
  });

  it("stores the upgrade with the next save based on the returned version", () => {
    const db = openDatabase(":memory:");
    const { userId, projectId } = setupV1(db);
    const site = readSite(db, projectId);
    if (!site) throw new Error("project has no document");
    const doc = structuredClone(site.document) as Doc;
    doc.nodes.hero_1.heading.content = "Nový chléb";
    const result = saveSite(db, projectId, userId, doc, site.version);
    expect(result.ok).toBe(true);
    const stored = storedDoc(db, projectId);
    expect(stored.nodes.site_1.schema_version).toBe(13);
    expect(stored.nodes.hero_1.heading.content).toBe("Nový chléb");
  });
});
