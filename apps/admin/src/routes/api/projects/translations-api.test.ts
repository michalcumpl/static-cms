import { describe, expect, it } from "vitest";
import {
  addLanguage,
  copyPageOnto,
  readSite,
  saveSite,
  versionCount,
} from "$lib/server/site-documents";
import { thrownBy, useTestProject } from "$lib/server/test-project";
import { POST as copy } from "./[project]/languages/[lang]/pages/+server";
import { GET as translations } from "./[project]/translations/+server";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = { nodes: Record<string, any> };
type User = { id: string; email: string };

let lang = "";
const project = useTestProject(() => ({ lang }));
const base = () => `/api/projects/${project().projectId}`;

/** English as a copy, then "Ceník" added to Czech only. */
function setup() {
  const { db, projectId, owner } = project();
  addLanguage(db, projectId, "en", owner.id);
  const site = readSite(db, projectId);
  if (!site) throw new Error("no site");
  const doc = structuredClone(site.document) as Doc;
  doc.nodes.page_cenik = {
    ...doc.nodes.page_contact,
    id: "page_cenik",
    title: "Ceník",
    slug: "cenik",
    translation_key: "page_cenik",
    blocks: { nodes: [], marks: [], annotations: [] },
  };
  doc.nodes.site_1.pages.nodes.push("page_cenik");
  const saved = saveSite(db, projectId, owner.id, doc, site.version);
  if (!saved.ok) throw new Error("save failed");
}

const getTranslations = (user: User | null = project().owner) =>
  translations(project().event(`${base()}/translations`, user ?? undefined) as never);
function copyTo(target: string, body: unknown, user: User | null = project().owner) {
  lang = target;
  return copy(
    project().event(`${base()}/languages/${target}/pages`, user ?? undefined, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
  );
}

describe("GET translations", () => {
  it("lists each language's pages and what English still needs", async () => {
    setup();
    const result = await (await getTranslations()).json();
    expect(result.map((l: { lang: string }) => l.lang)).toEqual(["cs", "en"]);
    const english = result[1];
    expect(english.untranslated.map((p: { pageId: string }) => p.pageId)).toEqual([
      "page_home",
      "page_contact",
    ]);
    expect(english.missing.map((p: { title: string }) => p.title)).toEqual(["Ceník"]);
    expect(result[0]).toMatchObject({ primary: true, untranslated: [], missing: [] });
  });

  it("is only for members", async () => {
    expect(await thrownBy(() => getTranslations(null))).toMatchObject({ status: 401 });
    expect(await thrownBy(() => getTranslations(project().outsider))).toMatchObject({
      status: 404,
    });
  });
});

describe("POST copy a page into a language", () => {
  it("copies Ceník into English as one new English version", async () => {
    setup();
    const { db, projectId } = project();
    const before = versionCount(db, projectId);
    const czechVersion = readSite(db, projectId)?.version;
    const response = await copyTo("en", { from: "cs", pageId: "page_cenik" });
    expect(response.status).toBe(201);
    const { pageId, title } = await response.json();
    expect(title).toBe("Ceník");
    const english = readSite(db, projectId, "en")?.document as Doc;
    expect(english.nodes[pageId]).toMatchObject({ slug: "cenik", translation_key: "page_cenik" });
    expect(versionCount(db, projectId)).toBe(before + 1);
    expect(readSite(db, projectId)?.version).toBe(czechVersion);
  });

  it("answers 409 when English has the page already", async () => {
    setup();
    const response = await copyTo("en", { from: "cs", pageId: "page_contact" });
    expect(response.status).toBe(409);
    expect((await response.json()).message).toContain("already has the page");
  });

  it("answers 404 for an unknown language or page", async () => {
    setup();
    expect((await copyTo("de", { from: "cs", pageId: "page_cenik" })).status).toBe(404);
    expect((await copyTo("en", { from: "cs", pageId: "page_gone" })).status).toBe(404);
  });

  it("is only for members", async () => {
    setup();
    expect(
      await thrownBy(() => copyTo("en", { from: "cs", pageId: "page_cenik" }, project().outsider)),
    ).toMatchObject({ status: 404 });
  });
});

describe("copying onto a changed language", () => {
  it("is a conflict, and writes nothing", () => {
    setup();
    const { db, projectId, owner } = project();
    const stale = readSite(db, projectId, "en");
    const source = readSite(db, projectId)?.document;
    if (!stale) throw new Error("no English");
    // English is saved meanwhile.
    saveSite(db, projectId, owner.id, stale.document, stale.version, "en");
    const before = versionCount(db, projectId);
    const result = copyPageOnto(db, projectId, source, "page_cenik", "en", stale, owner.id);
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    expect(versionCount(db, projectId)).toBe(before);
  });
});
