import type { ImportReport, SourcePage } from "@webmio/import";
import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { imports, media, pageOrigins } from "../db/schema";
import { earlierAddresses } from "../publishing/redirects";
import { addLanguage, projectLanguages, readSite, saveSite, versionCount } from "../site-documents";
import { useTestProject } from "../test-project";
import { markImportedImagesDecorative, undescribedImportedByLanguage } from "./decorative";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import { importsSettled, readImport, startImport } from "./job";
import { pairPages } from "./language";
import { projectRetry, type RetryOptions, startRetry } from "./retry";

// Importing another language version from the review (import-languages), on the bakery, whose
// English version is under /en/.

const project = useTestProject();
let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

type Node = { id: string; type: string; [key: string]: unknown };
type Doc = { document_id: string; nodes: Record<string, Node> };
type List = { nodes: string[] };

async function imported(failing: string[] = []) {
  server = await startFixtureServer("bakery");
  for (const path of failing) server.failing.add(path);
  const { db, workspaceId, owner } = project();
  const started = startImport(
    db,
    { workspaceId, userId: owner.id, address: `${server.origin}/`, confirmed: true, locale: "en" },
    { allowHosts: new Set([server.host]) },
  );
  if (!started.ok) throw new Error(started.message.key);
  await importsSettled();
  const row = readImport(db, started.importId, owner.id);
  if (row?.state !== "done" || !row.projectId) throw new Error(row?.error ?? "not imported");
  return { importId: row.id, projectId: row.projectId };
}

const fetching = (): RetryOptions => ({ allowHosts: new Set([server?.host ?? ""]) });

/** Imports the English version to its end and returns the retry's row. */
async function importEnglish(projectId: string, options: RetryOptions = {}) {
  const { db, owner } = project();
  const started = startRetry(
    db,
    projectId,
    owner.id,
    "language",
    { ...fetching(), ...options },
    "en",
  );
  if (!started.ok) throw new Error(started.message.key);
  await importsSettled();
  return projectRetry(db, projectId);
}

const docOf = (projectId: string, lang?: string) =>
  readSite(project().db, projectId, lang)?.document as Doc;
const siteOf = (doc: Doc) => doc.nodes[doc.document_id] as Node;
const pagesOf = (doc: Doc) => (siteOf(doc).pages as List).nodes.map((id) => doc.nodes[id] as Node);
const page = (doc: Doc, title: string) => pagesOf(doc).find((p) => p.title === title);
const content = (value: unknown) => (value as { content?: string } | undefined)?.content ?? "";
/** A page's blocks of a type. */
const blocksOf = (doc: Doc, p: Node | undefined, type: string) =>
  ((p?.blocks as List | undefined)?.nodes ?? [])
    .map((id) => doc.nodes[id] as Node)
    .filter((b) => b.type === type);
const importRow = (importId: string) => {
  const row = project().db.select().from(imports).where(eq(imports.id, importId)).get();
  return row && { ...row, report: row.report as ImportReport | null };
};

describe("pairing a version's pages", () => {
  const source = (path: string, html: string): SourcePage => ({
    url: `https://pekarna-ulipy.cz${path}`,
    html,
    css: [],
  });
  const czech = [
    { url: "https://pekarna-ulipy.cz/", pageId: "page_home" },
    {
      url: "https://pekarna-ulipy.cz/nase-pecivo/",
      pageId: "page_bread",
      alternates: ["https://pekarna-ulipy.cz/en/our-bread/"],
    },
    { url: "https://pekarna-ulipy.cz/kontakt.html", pageId: "page_contact", alternates: [] },
  ];

  it("pairs the homes, and pages linking each other either way; a link to the home pairs nothing", () => {
    const pairs = pairPages(
      [
        source("/en/", "<main><h1>Home</h1></main>"),
        source("/en/our-bread/", "<main><h1>Our bread</h1></main>"),
        source(
          "/en/contact.html",
          '<head><link rel="alternate" hreflang="cs" href="/kontakt.html"></head><main><h1>Contact</h1></main>',
        ),
        source(
          "/en/wholesale/",
          '<header><div class="lang-switch"><a href="/" hreflang="cs">CZ</a></div></header><main></main>',
        ),
      ],
      czech,
    );
    expect(Object.fromEntries(pairs)).toEqual({
      "pekarna-ulipy.cz/en": "page_home",
      "pekarna-ulipy.cz/en/our-bread": "page_bread",
      "pekarna-ulipy.cz/en/contact.html": "page_contact",
    });
  });

  it("pairs each primary page once, the first claim winning", () => {
    const linking = '<head><link rel="alternate" hreflang="cs" href="/kontakt.html"></head>';
    const pairs = pairPages(
      [source("/en/", ""), source("/en/contact.html", linking), source("/en/write-us/", linking)],
      czech,
    );
    expect([...pairs.values()]).toEqual(["page_home", "page_contact"]);
  });
});

describe("importing another language", () => {
  it("Import the English version: hidden, its pages in its menu's order, paired with the Czech", async () => {
    const { db } = project();
    const { projectId, importId } = await imported();
    const row = await importEnglish(projectId);
    expect(row).toMatchObject({ state: "done", kind: "language", lang: "en" });
    expect(row?.added).toEqual({ pages: 4, placed: 1, library: 0 });
    expect(projectLanguages(db, projectId).map((l) => [l.lang, l.published])).toEqual([
      ["cs", true],
      ["en", false],
    ]);

    const cs = docOf(projectId);
    const en = docOf(projectId, "en");
    expect(pagesOf(en).map((p) => [p.title, p.slug])).toEqual([
      ["Home", "home"],
      ["Our bread", "our-bread"],
      ["Wholesale", "wholesale"],
      ["Contact", "contact"],
    ]);
    expect(siteOf(en).home_page_id).toBe(page(en, "Home")?.id);
    const keyOf = (doc: Doc, title: string) => page(doc, title)?.translation_key;
    expect(keyOf(en, "Home")).toBe(keyOf(cs, "Úvod"));
    expect(keyOf(en, "Our bread")).toBe(keyOf(cs, "Naše pečivo"));
    expect(keyOf(en, "Contact")).toBe(keyOf(cs, "Kontakt"));
    // The menu is the version's own.
    const nav = en.nodes[String(siteOf(en).nav)] as Node;
    expect((nav.items as List).nodes.map((id) => content(en.nodes[id]?.label))).toEqual([
      "Home",
      "Our bread",
      "Wholesale",
      "Contact",
    ]);
    // The home page starts with a hero, as the import's does.
    const hero = blocksOf(en, page(en, "Home"), "hero")[0];
    expect(content(hero?.heading)).toBe("U Lípy Bakery");
    // The Czech site is unchanged.
    expect(pagesOf(cs).map((p) => p.title)).toEqual([
      "Úvod",
      "Naše pečivo",
      "Náš příběh",
      "Letošní akce",
      "Kontakt",
    ]);

    // The report: the English pages, and English no longer left out or offered.
    const after = importRow(importId);
    expect(after?.report?.pages.filter((p) => p.lang === "en")).toEqual([
      { title: "Home", oldPath: "/en/", slug: "", lang: "en" },
      { title: "Our bread", oldPath: "/en/our-bread/", slug: "our-bread", lang: "en" },
      { title: "Wholesale", oldPath: "/en/wholesale/", slug: "wholesale", lang: "en" },
      { title: "Contact", oldPath: "/en/contact.html", slug: "contact", lang: "en" },
    ]);
    expect(after?.report?.leftOut.filter((l) => l.reason === "language")).toEqual([]);
    expect(after?.retryState?.languages).toEqual([]);
    const origins = db
      .select({ path: pageOrigins.path })
      .from(pageOrigins)
      .where(and(eq(pageOrigins.projectId, projectId), eq(pageOrigins.lang, "en")))
      .all()
      .map((o) => o.path);
    expect(origins.sort()).toEqual([
      "/en/",
      "/en/contact.html",
      "/en/our-bread/",
      "/en/wholesale/",
    ]);
  });

  it("A page only in English, and pages only in Czech", async () => {
    const { projectId } = await imported();
    await importEnglish(projectId);
    const cs = docOf(projectId);
    const en = docOf(projectId, "en");
    const czechKeys = new Set(pagesOf(cs).map((p) => p.translation_key));
    const wholesale = page(en, "Wholesale");
    expect(wholesale?.translation_key).toBe(wholesale?.id);
    expect(czechKeys.has(wholesale?.translation_key)).toBe(false);
    const englishKeys = new Set(pagesOf(en).map((p) => p.translation_key));
    expect(englishKeys.has(page(cs, "Náš příběh")?.translation_key)).toBe(false);
    expect(englishKeys.has(page(cs, "Letošní akce")?.translation_key)).toBe(false);
  });

  it("Shared details stay the primary's; the names are the version's", async () => {
    const { projectId } = await imported();
    await importEnglish(projectId);
    const en = docOf(projectId, "en");
    const cs = docOf(projectId);
    expect(siteOf(en).name).toBe("U Lípy Bakery");
    expect(siteOf(en).description).toBe(
      "A family bakery in Kutná Hora: sourdough bread, rolls and cakes to order.",
    );
    expect(en.nodes[String(siteOf(en).business)]?.name).toBe("U Lípy Bakery");
    const phone = (doc: Doc) => {
      const business = doc.nodes[String(siteOf(doc).business)];
      return doc.nodes[(business?.locations as List | undefined)?.nodes[0] ?? ""]?.phone;
    };
    expect(phone(en)).toBe(phone(cs));
    expect(phone(en)).not.toContain("777");
  });

  it("Translated questions, and questions that don't match become text", async () => {
    const { projectId } = await imported();
    await importEnglish(projectId);
    const cs = docOf(projectId);
    const en = docOf(projectId, "en");
    const items = (doc: Doc, p: Node | undefined) =>
      ((blocksOf(doc, p, "faq")[0]?.chosen as List | undefined)?.nodes ?? []).map(
        (id) => doc.nodes[id]?.item_id,
      );
    expect(items(en, page(en, "Home"))).toEqual(items(cs, page(cs, "Úvod")));
    const question = (doc: Doc, id: unknown) => content(doc.nodes[String(id)]?.question);
    const first = items(cs, page(cs, "Úvod"))[0];
    expect(question(en, first)).toBe("Do you bake at the weekend?");
    expect(question(cs, first)).toBe("Pečete i o víkendu?");
    expect((siteOf(en).faqs as List).nodes).toEqual((siteOf(cs).faqs as List).nodes);

    // "Kontakt" has no questions, so the English "Contact"'s are text.
    const contact = page(en, "Contact");
    expect(blocksOf(en, contact, "faq")).toEqual([]);
    const texts = blocksOf(en, contact, "rich_text").flatMap((b) =>
      (b.body as List).nodes.map((id) => content(en.nodes[id]?.content)),
    );
    expect(texts).toContain("Can I pay by card?");
  });

  it("reuses the images the import brought, and fetches the others", async () => {
    const { db } = project();
    const { projectId, importId } = await imported();
    const before = db.select().from(media).where(eq(media.projectId, projectId)).all().length;
    const imagesBefore = importRow(importId)?.report?.images ?? 0;
    await importEnglish(projectId);
    expect(db.select().from(media).where(eq(media.projectId, projectId)).all()).toHaveLength(
      before + 1,
    );
    expect(importRow(importId)?.report?.images).toBe(imagesBefore + 1);
    expect(server?.hits.get("/images/velkoobchod.jpg")).toBe(1);
    const en = docOf(projectId, "en");
    const wholesale = page(en, "Wholesale");
    const image = Object.values(en.nodes).find(
      (n) => n.type === "image" && n.alt === "Crates of bread ready for delivery",
    );
    expect(image?.width).toBeGreaterThan(0);
    expect(wholesale).toBeDefined();
  });
});

describe("imported images of another language", () => {
  it("Images of an imported language: marked decorative with the primary's, one version each", async () => {
    const { db, owner } = project();
    const { projectId } = await imported();
    await importEnglish(projectId);
    // The English home photo, without a description.
    const english = readSite(db, projectId, "en");
    const doc = structuredClone(english?.document) as Doc;
    const photo = Object.values(doc.nodes).find(
      (n) => n.type === "image" && n.alt === "A loaf of bread on the counter",
    );
    if (!photo || !english) throw new Error("no English photo");
    photo.alt = "";
    expect(saveSite(db, projectId, owner.id, doc, english.version, "en").ok).toBe(true);

    const undescribed = undescribedImportedByLanguage(db, projectId);
    expect(undescribed.map((l) => l.lang)).toEqual(["cs", "en"]);
    // The home photo, and the Czech photo "Wholesale" shows without a description.
    expect(undescribed.find((l) => l.lang === "en")?.ids).toHaveLength(2);
    expect(undescribed.find((l) => l.lang === "en")?.ids).toContain(photo.id);
    const before = versionCount(db, projectId);
    expect(markImportedImagesDecorative(db, projectId, owner.id).ok).toBe(true);
    expect(versionCount(db, projectId)).toBe(before + 2);
    expect(docOf(projectId, "en").nodes[photo.id]?.decorative).toBe(true);
    expect(undescribedImportedByLanguage(db, projectId)).toEqual([]);
  });
});

describe("publishing an imported language", () => {
  it("Old English address redirected to the English page", async () => {
    const { db } = project();
    const { projectId } = await imported();
    await importEnglish(projectId);
    const redirects = earlierAddresses(db, projectId, "en", docOf(projectId, "en"), "/en/");
    expect(redirects).toContainEqual({ from: "/en/contact.html", to: "/en/contact/" });
    // Old addresses that are the pages' own aren't redirected to themselves.
    expect(redirects).toEqual([{ from: "/en/contact.html", to: "/en/contact/" }]);
  });
});

describe("starting a language import", () => {
  it("Language added by hand meanwhile: refused, and no longer offered", async () => {
    const { db, owner } = project();
    const { projectId } = await imported();
    addLanguage(db, projectId, "en", owner.id);
    expect(startRetry(db, projectId, owner.id, "language", fetching(), "en")).toMatchObject({
      ok: false,
      message: { key: "server.languages.alreadyHas" },
    });
    expect(startRetry(db, projectId, owner.id, "language", fetching(), "de")).toMatchObject({
      ok: false,
      message: { key: "server.import.retryNothing" },
    });
  });

  it("Refused while a retry runs, and a retry refused while it runs", async () => {
    const { db, owner } = project();
    const { projectId } = await imported();
    expect(startRetry(db, projectId, owner.id, "again", fetching()).ok).toBe(true);
    expect(startRetry(db, projectId, owner.id, "language", fetching(), "en")).toMatchObject({
      ok: false,
      message: { key: "server.import.retryRunning" },
    });
    await importsSettled();
    expect(startRetry(db, projectId, owner.id, "language", fetching(), "en").ok).toBe(true);
    expect(startRetry(db, projectId, owner.id, "again", fetching())).toMatchObject({
      ok: false,
      message: { key: "server.import.retryRunning" },
    });
    await importsSettled();
  });

  it("fails without changing anything when English is added during the run", async () => {
    const { db, owner } = project();
    const { projectId, importId } = await imported();
    const before = importRow(importId);
    const row = await importEnglish(projectId, {
      beforeSave: () => addLanguage(db, projectId, "en", owner.id),
    });
    expect(row).toMatchObject({ state: "failed", error: "The project already has English." });
    const after = importRow(importId);
    expect(after?.report).toEqual(before?.report);
    expect(after?.retryState?.languages).toEqual([{ lang: "en", url: `${server?.origin}/en/` }]);
    // The English document is the one added by hand: a copy of the Czech.
    expect(pagesOf(docOf(projectId, "en")).map((p) => p.title)).toContain("Úvod");
    const origins = db.select().from(pageOrigins).where(eq(pageOrigins.lang, "en")).all();
    expect(origins).toEqual([]);
  });

  it("leaves the primary's retries working: a Czech page that failed arrives afterwards", async () => {
    const { db, owner } = project();
    const { projectId } = await imported(["/akce/"]);
    await importEnglish(projectId);
    server?.failing.clear();
    expect(startRetry(db, projectId, owner.id, "again", fetching()).ok).toBe(true);
    await importsSettled();
    expect(projectRetry(db, projectId)).toMatchObject({ state: "done", kind: "again" });
    expect(pagesOf(docOf(projectId)).map((p) => p.title)).toContain("Letošní akce");
    expect(pagesOf(docOf(projectId, "en")).map((p) => p.title)).not.toContain("Letošní akce");
  });
});
