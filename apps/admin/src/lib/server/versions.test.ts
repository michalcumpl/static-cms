import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import {
  projectHosting,
  publishDocuments,
  publishes,
  siteDocuments,
  users,
  versions,
  workspaces,
} from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import { addLanguage, createProject, readSite, saveSite } from "./site-documents";
import { listVersions, readVersion, restoreVersion } from "./versions";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };

let db: Db;
let projectId = "";
let userId = "";

beforeEach(() => {
  db = openDatabase(":memory:");
  const workspaceId = newId("w");
  userId = newId("u");
  db.insert(workspaces).values({ id: workspaceId, name: "Pekárna", createdAt: new Date() }).run();
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  projectId = createProject(db, workspaceId, "Pekárna", demoSite(), userId);
});

/** Saves the language's document with the hero heading set to `heading`. */
function saveHeading(heading: string, lang?: string) {
  const site = readSite(db, projectId, lang);
  if (!site) throw new Error("no site");
  const doc = structuredClone(site.document) as Doc;
  doc.nodes.hero_1.heading.content = heading;
  const result = saveSite(db, projectId, userId, doc, site.version, lang);
  if (!result.ok) throw new Error("save failed");
}
/** The document a site or version holds; fails when there is none. */
function docOf(holder: { document: unknown } | undefined): Doc {
  if (!holder) throw new Error("no document");
  return holder.document as Doc;
}
const heading = (lang?: string) =>
  docOf(readSite(db, projectId, lang)).nodes.hero_1.heading.content;
const listed = (lang = "cs", options = {}) => {
  const result = listVersions(db, projectId, lang, options);
  if (!result) throw new Error("no history");
  return result;
};

/** Records a successful publish of the current Czech version, optionally the live one. */
function publishCurrent(live: boolean) {
  const versionId = readSite(db, projectId)?.versionId as string;
  const publishId = newId("pb");
  db.insert(publishes)
    .values({ id: publishId, projectId, versionId, state: "ready", startedAt: new Date() })
    .run();
  db.insert(publishDocuments).values({ publishId, lang: "cs", versionId }).run();
  if (live) {
    db.insert(projectHosting)
      .values({
        projectId,
        provider: "netlify",
        accountSlug: "anideti",
        siteId: "s1",
        siteName: "sc-x",
        defaultUrl: "https://sc-x.netlify.app",
        livePublishId: publishId,
      })
      .run();
  }
  return versionId;
}

describe("listVersions", () => {
  it("lists saves newest first, the newest current", () => {
    saveHeading("A");
    saveHeading("B");
    saveHeading("C");
    const { versions: list, more } = listed();
    expect(list).toHaveLength(4);
    expect(more).toBe(false);
    expect(list[0]).toMatchObject({ current: true, savedBy: "jana@example.cz" });
    expect(list.slice(1).every((v) => !v.current)).toBe(true);
  });

  it("pages through older versions", () => {
    for (let i = 0; i < 6; i++) saveHeading(`v${i}`);
    const first = listed("cs", { limit: 3 });
    expect(first.more).toBe(true);
    const second = listed("cs", { limit: 3, before: first.versions.at(-1)?.id });
    expect(second.versions).toHaveLength(3);
    const third = listed("cs", { limit: 3, before: second.versions.at(-1)?.id });
    expect(third.versions).toHaveLength(1);
    expect(third.more).toBe(false);
    const ids = [...first.versions, ...second.versions, ...third.versions].map((v) => v.id);
    expect(new Set(ids).size).toBe(7);
  });

  it("marks the live and other published versions", () => {
    const earlier = publishCurrent(false);
    saveHeading("A");
    const live = publishCurrent(true);
    saveHeading("B");
    const byId = new Map(listed().versions.map((v) => [v.id, v]));
    expect(byId.get(live)).toMatchObject({ live: true, published: false, current: false });
    expect(byId.get(earlier)).toMatchObject({ live: false, published: true });
  });

  it("says who saved a version, or nobody for a removed account", () => {
    saveHeading("A");
    db.delete(users).where(eq(users.id, userId)).run();
    expect(listed().versions[0]?.savedBy).toBeNull();
    expect(listed().versions[0]?.system).toBe(false);
  });

  it("marks versions the system saved, such as a format upgrade", () => {
    saveHeading("A");
    const [newest] = listed().versions;
    if (!newest) throw new Error("no versions");
    db.update(versions)
      .set({ system: true, createdBy: null })
      .where(eq(versions.id, newest.id))
      .run();
    expect(listed().versions[0]).toMatchObject({ system: true, savedBy: null });
    expect(listed().versions[1]?.system).toBe(false);
  });

  it("is undefined for a language the project doesn't have", () => {
    expect(listVersions(db, projectId, "en")).toBeUndefined();
  });
});

describe("restoreVersion", () => {
  it("restores as a new version, and a restore can be undone", () => {
    saveHeading("A");
    const versionA = readSite(db, projectId)?.versionId as string;
    saveHeading("B");
    const versionB = readSite(db, projectId)?.versionId as string;

    expect(restoreVersion(db, projectId, versionA, userId)).toMatchObject({ ok: true, lang: "cs" });
    expect(heading()).toBe("A");
    expect(restoreVersion(db, projectId, versionB, userId)).toMatchObject({ ok: true });
    expect(heading()).toBe("B");

    const list = listed().versions;
    expect(list[0]?.restoredFrom?.id).toBe(versionB);
    expect(list[1]?.restoredFrom?.id).toBe(versionA);
    expect(list).toHaveLength(5);
  });

  it("restoring Czech gives English the restored shared fields, without saving English", () => {
    const old = readSite(db, projectId)?.versionId as string;
    addLanguage(db, projectId, "en", userId);
    const site = readSite(db, projectId);
    const doc = structuredClone(site?.document) as Doc;
    doc.nodes.business_1.phone = "+420321123456";
    saveSite(db, projectId, userId, doc, site?.version ?? "");
    const englishVersion = readSite(db, projectId, "en")?.version;

    restoreVersion(db, projectId, old, userId);
    const english = readSite(db, projectId, "en");
    expect(docOf(english).nodes.business_1.phone).toBe("");
    expect(english?.version).toBe(englishVersion);
  });

  it("is a conflict when the language changed since the restore was asked for", () => {
    saveHeading("A");
    const versionA = readSite(db, projectId)?.versionId as string;
    const stale = readSite(db, projectId)?.version;
    saveHeading("B");
    expect(restoreVersion(db, projectId, versionA, userId, stale)).toEqual({
      ok: false,
      reason: "conflict",
    });
    expect(heading()).toBe("B");
  });

  it("refuses a structurally broken document", () => {
    const docId = db
      .select({ id: siteDocuments.id })
      .from(siteDocuments)
      .where(eq(siteDocuments.projectId, projectId))
      .get()?.id as string;
    const brokenId = newId("v");
    db.insert(versions)
      .values({
        id: brokenId,
        documentId: docId,
        version: "x",
        document: { document_id: "site_1", nodes: { site_1: { id: "site_1", type: "site" } } },
        createdAt: new Date(0),
      })
      .run();
    expect(restoreVersion(db, projectId, brokenId, userId)).toMatchObject({
      ok: false,
      reason: "invalid",
    });
  });

  it("finds no version of another project", () => {
    const otherProject = createProject(
      db,
      db.select().from(workspaces).get()?.id as string,
      "Jiný",
    );
    const otherVersion = readSite(db, otherProject)?.versionId as string;
    expect(restoreVersion(db, projectId, otherVersion, userId)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(readVersion(db, projectId, otherVersion)).toBeUndefined();
  });
});

describe("readVersion", () => {
  it("gives an English version the current Czech shared fields", () => {
    addLanguage(db, projectId, "en", userId);
    const englishVersion = readSite(db, projectId, "en")?.versionId as string;
    const site = readSite(db, projectId);
    const doc = structuredClone(site?.document) as Doc;
    doc.nodes.business_1.phone = "+420321123456";
    saveSite(db, projectId, userId, doc, site?.version ?? "");
    const version = readVersion(db, projectId, englishVersion);
    expect(version?.lang).toBe("en");
    expect(docOf(version).nodes.business_1.phone).toBe("+420321123456");
  });
});
