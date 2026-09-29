import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate_document } from "svedit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { editorSchema } from "../editor/schema";
import { type Db, openDatabase } from "./db/index";
import { users, workspaces } from "./db/schema";
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
    expect(site.problems).toEqual([]);
    expect((site.document as Doc).nodes.site_1.name).toBe("Kadeřnictví Eva");
    expect(() => validate_document(starterSite("X") as never, editorSchema)).not.toThrow();
  });
});
