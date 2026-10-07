import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, openDatabase } from "./db/index";
import { siteDocuments, users, workspaces } from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import {
  addLanguage,
  createProject,
  primaryLanguage,
  projectLanguages,
  readSite,
  removeLanguage,
  saveSite,
  setLanguagePublished,
} from "./site-documents";

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
  projectId = createProject(db, workspaceId, "Pekárna", demoSite());
});

/** The current document of a language (the primary without one); fails when there is none. */
function documentOf(lang?: string): Doc {
  const site = readSite(db, projectId, lang);
  if (!site) throw new Error(`no ${lang ?? "primary"} document`);
  return site.document as Doc;
}

function edit(lang: string | undefined, change: (doc: Doc) => void) {
  const site = readSite(db, projectId, lang);
  if (!site) throw new Error("no site");
  const doc = structuredClone(site.document) as Doc;
  change(doc);
  const result = saveSite(db, projectId, userId, doc, site.version, lang);
  if (!result.ok) throw new Error(`save failed: ${result.reason}`);
}

describe("project languages", () => {
  it("are Czech, primary and published, for an existing project", () => {
    expect(projectLanguages(db, projectId)).toEqual([
      { lang: "cs", name: "Čeština", primary: true, published: true },
    ]);
  });

  it("add English as a hidden copy of the Czech document", () => {
    edit(undefined, (doc) => {
      doc.nodes.hero_1.heading.content = "Nový chléb";
    });
    expect(addLanguage(db, projectId, "en", userId)).toEqual({ ok: true });
    expect(projectLanguages(db, projectId)).toEqual([
      { lang: "cs", name: "Čeština", primary: true, published: true },
      { lang: "en", name: "English", primary: false, published: false },
    ]);
    const english = readSite(db, projectId, "en");
    const doc = english?.document as Doc;
    expect(doc.nodes.site_1.lang).toBe("en");
    expect(doc.nodes.hero_1.heading.content).toBe("Nový chléb");
    expect(doc.nodes.page_contact.translation_key).toBe("page_contact");
    expect(english?.problems).toEqual([]);
  });

  it("refuse a language twice, or one not offered", () => {
    addLanguage(db, projectId, "en", userId);
    expect(addLanguage(db, projectId, "en", userId)).toMatchObject({
      ok: false,
      reason: "exists",
      message: { key: "server.languages.alreadyHas", params: { language: "English" } },
    });
    expect(addLanguage(db, projectId, "fr", userId)).toMatchObject({
      ok: false,
      reason: "not-offered",
    });
  });

  it("publish and hide a language, but never the primary", () => {
    addLanguage(db, projectId, "en", userId);
    expect(setLanguagePublished(db, projectId, "en", true)).toEqual({ ok: true });
    expect(projectLanguages(db, projectId)[1]?.published).toBe(true);
    expect(setLanguagePublished(db, projectId, "cs", false)).toMatchObject({ reason: "primary" });
    expect(setLanguagePublished(db, projectId, "de", true)).toMatchObject({ reason: "not-found" });
  });

  it("remove a language with its versions, but never the primary", () => {
    addLanguage(db, projectId, "de", userId);
    expect(removeLanguage(db, projectId, "cs")).toMatchObject({ ok: false, reason: "primary" });
    expect(removeLanguage(db, projectId, "de")).toEqual({ ok: true });
    expect(readSite(db, projectId, "de")).toBeUndefined();
    expect(projectLanguages(db, projectId).map((l) => l.lang)).toEqual(["cs"]);
  });
});

describe("reading and saving languages", () => {
  it("gives another language the primary's shared fields, without saving it", () => {
    addLanguage(db, projectId, "en", userId);
    const before = readSite(db, projectId, "en");
    edit(undefined, (doc) => {
      doc.nodes.location_1.phone = "+420321123456";
    });
    const after = readSite(db, projectId, "en");
    expect(documentOf("en").nodes.location_1.phone).toBe("+420321123456");
    expect(after?.version).toBe(before?.version);
  });

  it("keeps each language's own texts", () => {
    addLanguage(db, projectId, "en", userId);
    edit("en", (doc) => {
      doc.nodes.page_contact.title = "Contact";
      doc.nodes.location_1.hours_note = "Closed on holidays";
    });
    expect(documentOf().nodes.page_contact.title).toBe("Kontakt");
    const english = documentOf("en");
    expect(english.nodes.page_contact.title).toBe("Contact");
    expect(english.nodes.location_1.hours_note).toBe("Closed on holidays");
  });

  it("accepts saves of two languages made at once", () => {
    addLanguage(db, projectId, "en", userId);
    const czech = readSite(db, projectId);
    const english = readSite(db, projectId, "en");
    if (!czech || !english) throw new Error("no site");
    expect(saveSite(db, projectId, userId, czech.document, czech.version).ok).toBe(true);
    expect(saveSite(db, projectId, userId, english.document, english.version, "en").ok).toBe(true);
  });

  it("answers nothing for a language the project doesn't have", () => {
    expect(readSite(db, projectId, "pl")).toBeUndefined();
  });
});

describe("documents of other projects", () => {
  it("aren't touched by language changes", () => {
    const other = createProject(db, db.select().from(workspaces).get()?.id as string, "Jiný");
    addLanguage(db, projectId, "en", userId);
    expect(
      db.select().from(siteDocuments).where(eq(siteDocuments.projectId, other)).all(),
    ).toHaveLength(1);
  });
});

describe("a project's primary language", () => {
  it("is Czech by default, and English when created so", () => {
    expect(primaryLanguage(db, projectId)).toBe("cs");
    const workspaceId = newId("w");
    db.insert(workspaces).values({ id: workspaceId, name: "Brokers", createdAt: new Date() }).run();
    const english = createProject(db, workspaceId, "Mortgage Specialist", demoSite(), userId, "en");
    expect(primaryLanguage(db, english)).toBe("en");
    expect(projectLanguages(db, english).map((l) => l.lang)).toEqual(["en"]);
    const site = readSite(db, english);
    if (!site) throw new Error("no English document");
    expect(readSite(db, english, "en")?.version).toBe(site.version);
    expect(saveSite(db, english, userId, site.document, site.version).ok).toBe(true);
  });
});
