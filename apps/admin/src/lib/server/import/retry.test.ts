import type { ImportReport } from "@webmio/import";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { importRetries, imports, media, pageOrigins, versions } from "../db/schema";
import { readSite, saveSite } from "../site-documents";
import { useTestProject } from "../test-project";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import {
  dismissReview,
  failInterruptedImports,
  importsSettled,
  readImport,
  startImport,
} from "./job";
import { projectRetry, type RetryKind, type RetryOptions, retryOffers, startRetry } from "./retry";

const project = useTestProject();
let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

type Node = { id: string; type: string; [key: string]: unknown };
type Doc = { document_id: string; nodes: Record<string, Node> };
type List = { nodes: string[] };

/** Imports a fixture site with some paths failing, and returns its project. */
async function imported(site: string, failing: string[] = []) {
  server = await startFixtureServer(site);
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

/** Runs a retry to its end and returns its row. */
async function retry(projectId: string, kind: RetryKind, options: RetryOptions = {}) {
  const { db, owner } = project();
  const started = startRetry(db, projectId, owner.id, kind, { ...fetching(), ...options });
  if (!started.ok) throw new Error(started.message.key);
  await importsSettled();
  return projectRetry(db, projectId);
}

const docOf = (projectId: string) => readSite(project().db, projectId)?.document as Doc;
const pagesOf = (doc: Doc) =>
  ((doc.nodes[doc.document_id] as Node).pages as List).nodes.map((id) => doc.nodes[id] as Node);
const pageBySlug = (doc: Doc, slug: string) => pagesOf(doc).find((p) => p.slug === slug);
/** Every node a page owns through its blocks. */
function pageNodes(doc: Doc, page: Node | undefined): Node[] {
  const out: Node[] = [];
  const visit = (id: string) => {
    const node = doc.nodes[id];
    if (!node || out.includes(node)) return;
    out.push(node);
    for (const value of Object.values(node)) {
      const list = value as Partial<List> | undefined;
      if (list && Array.isArray(list.nodes)) for (const child of list.nodes) visit(child);
    }
  };
  for (const id of (page?.blocks as List | undefined)?.nodes ?? []) visit(id);
  return out;
}
const versionCount = () => project().db.select().from(versions).all().length;
const importRow = (importId: string) => {
  const row = project().db.select().from(imports).where(eq(imports.id, importId)).get();
  return row && { ...row, report: row.report as ImportReport | null };
};

describe("starting a retry", () => {
  it("refuses with nothing to retry, a dismissed review, or no retry state", async () => {
    const { db, owner } = project();
    const { projectId, importId } = await imported("bakery");
    // Only /cenik.pdf didn't answer (a 404), and nothing is over the limit.
    expect(retryOffers(importRow(importId)?.retryState)).toEqual({ again: true, next: 0 });
    expect(startRetry(db, projectId, owner.id, "next")).toMatchObject({
      ok: false,
      message: { key: "server.import.retryNothing" },
    });
    db.update(imports).set({ retryState: null }).where(eq(imports.id, importId)).run();
    expect(startRetry(db, projectId, owner.id, "again")).toMatchObject({
      ok: false,
      message: { key: "server.import.retryNothing" },
    });
    dismissReview(db, projectId);
    expect(startRetry(db, projectId, owner.id, "again")).toMatchObject({
      ok: false,
      message: { key: "server.import.retryClosed" },
    });
  });

  it("Retry refused while running, and a running retry fails at start-up", async () => {
    const { db, owner } = project();
    const { projectId } = await imported("bakery");
    const first = startRetry(db, projectId, owner.id, "again", fetching());
    expect(first.ok).toBe(true);
    expect(startRetry(db, projectId, owner.id, "again", fetching())).toMatchObject({
      ok: false,
      message: { key: "server.import.retryRunning" },
    });
    await importsSettled();
    db.update(importRetries).set({ state: "running" }).run();
    failInterruptedImports(db);
    expect(projectRetry(db, projectId)).toMatchObject({
      state: "failed",
      error: "The retry was interrupted. Try again.",
    });
  });
});

describe("trying again", () => {
  it("A page that timed out: added with its old address, at the menu's end", async () => {
    const { projectId, importId } = await imported("bakery", ["/akce/"]);
    expect(pageBySlug(docOf(projectId), "akce")).toBeUndefined();
    expect(importRow(importId)?.report?.leftOut).toContainEqual(
      expect.objectContaining({ reason: "unreachable", page: "/akce/" }),
    );
    server?.failing.clear();
    const row = await retry(projectId, "again");
    expect(row).toMatchObject({ state: "done", added: { pages: 1 } });
    const doc = docOf(projectId);
    const page = pageBySlug(doc, "akce");
    expect(page?.title).toBe("Letošní akce");
    expect(pagesOf(doc).at(-1)?.id).toBe(page?.id);
    const nav = doc.nodes[String(doc.nodes[doc.document_id]?.nav)];
    const last = doc.nodes[((nav as Node).items as List).nodes.at(-1) ?? ""];
    expect(last).toMatchObject({ type: "page_link", page_id: page?.id });
    const origins = project()
      .db.select()
      .from(pageOrigins)
      .where(eq(pageOrigins.projectId, projectId))
      .all();
    expect(origins.find((o) => o.pageId === page?.id)?.path).toBe("/akce/");
    const after = importRow(importId);
    expect(after?.report?.leftOut).not.toContainEqual(
      expect.objectContaining({ reason: "unreachable", page: "/akce/" }),
    );
    expect(after?.report?.pages.map((p) => p.oldPath)).toContain("/akce/");
    expect(after?.retryState?.pages.map((p) => p.pageId)).toContain(page?.id);
    expect(
      readSite(project().db, projectId)?.problems.filter((p) => p.category === "structure"),
    ).toEqual([]);
  });

  it("Still failing: listed again, and the project unchanged", async () => {
    const { projectId, importId } = await imported("bakery", ["/images/rohliky.jpg"]);
    const before = versionCount();
    const doc = docOf(projectId);
    const row = await retry(projectId, "again");
    expect(row).toMatchObject({ state: "done", added: { pages: 0, placed: 0, library: 0 } });
    expect(versionCount()).toBe(before);
    expect(docOf(projectId)).toEqual(doc);
    const state = importRow(importId)?.retryState;
    expect(state?.failedImages.map((i) => i.id)).toEqual([`${server?.origin}/images/rohliky.jpg`]);
    expect(
      importRow(importId)?.report?.leftOut.filter(
        (l) => l.reason === "image" && l.detail?.endsWith("/images/rohliky.jpg"),
      ),
    ).toHaveLength(1);
    // /cenik.pdf still answers 404.
    expect(state?.unreachable).toEqual([`${server?.origin}/cenik.pdf`]);
  });

  it("Image for an untouched page: placed where the old site showed it", async () => {
    const { projectId, importId } = await imported("bakery", ["/images/rohliky.jpg"]);
    const page = pageBySlug(docOf(projectId), "nase-pecivo");
    expect(pageNodes(docOf(projectId), page).some((n) => n.type === "image")).toBe(false);
    const before = versionCount();
    server?.failing.clear();
    const row = await retry(projectId, "again");
    expect(row).toMatchObject({ state: "done", added: { pages: 0, placed: 1, library: 0 } });
    expect(versionCount()).toBe(before + 1);
    const doc = docOf(projectId);
    const images = pageNodes(doc, pageBySlug(doc, "nase-pecivo")).filter((n) => n.type === "image");
    const key = importRow(importId)?.retryState?.media[`${server?.origin}/images/rohliky.jpg`];
    expect(images.map((i) => i.src)).toEqual([key]);
    expect(images[0]?.width).toBeGreaterThan(0);
    expect(importRow(importId)?.retryState?.failedImages).toEqual([]);
    expect(importRow(importId)?.retryState?.importedImages).toEqual(images.map((i) => i.id));
    expect(importRow(importId)?.report?.leftOut.filter((l) => l.reason === "image")).toEqual([]);
  });

  it("Image for an edited page: the page unchanged, the photo in the library", async () => {
    const { db, owner } = project();
    const { projectId } = await imported("bakery", ["/images/rohliky.jpg"]);
    // The owner rewrites the page's first paragraph.
    const snapshot = readSite(db, projectId);
    const doc = structuredClone(snapshot?.document) as Doc;
    const paragraph = pageNodes(doc, pageBySlug(doc, "nase-pecivo")).find(
      (n) => n.type === "paragraph",
    );
    if (!paragraph) throw new Error("no paragraph");
    paragraph.content = { content: "Pečeme každý den.", marks: [], annotations: [] };
    expect(saveSite(db, projectId, owner.id, doc, snapshot?.version ?? "").ok).toBe(true);
    const library = db.select().from(media).where(eq(media.projectId, projectId)).all().length;
    server?.failing.clear();
    const row = await retry(projectId, "again");
    expect(row).toMatchObject({ state: "done", added: { pages: 0, placed: 0, library: 1 } });
    expect(docOf(projectId)).toEqual(doc);
    expect(db.select().from(media).where(eq(media.projectId, projectId)).all()).toHaveLength(
      library + 1,
    );
  });

  it("Slug taken by the owner's page: the retried page gets another", async () => {
    const { db, owner } = project();
    const { projectId } = await imported("bakery", ["/kontakt.html"]);
    const snapshot = readSite(db, projectId);
    const doc = structuredClone(snapshot?.document) as Doc;
    const about = pageBySlug(doc, "o-nas") as Node;
    doc.nodes.page_owner = {
      ...about,
      id: "page_owner",
      title: "Kontakt",
      slug: "kontakt",
      translation_key: "page_owner",
      blocks: { nodes: [], marks: [], annotations: [] },
    };
    ((doc.nodes[doc.document_id] as Node).pages as List).nodes.push("page_owner");
    expect(saveSite(db, projectId, owner.id, doc, snapshot?.version ?? "").ok).toBe(true);
    server?.failing.clear();
    await retry(projectId, "again");
    const after = docOf(projectId);
    expect(pagesOf(after).map((p) => p.slug)).toEqual([
      "uvod",
      "nase-pecivo",
      "o-nas",
      "akce",
      "kontakt",
      "kontakt-2",
    ]);
    expect(pageBySlug(after, "kontakt")?.id).toBe("page_owner");
  });

  it("fails without changing the project when the owner saved meanwhile", async () => {
    const { db, owner } = project();
    const { projectId, importId } = await imported("bakery", ["/akce/"]);
    const before = importRow(importId);
    server?.failing.clear();
    let ownerDoc: Doc | undefined;
    const row = await retry(projectId, "again", {
      beforeSave: () => {
        const snapshot = readSite(db, projectId);
        ownerDoc = structuredClone(snapshot?.document) as Doc;
        (ownerDoc.nodes[ownerDoc.document_id] as Node).description = "Nový popis";
        saveSite(db, projectId, owner.id, ownerDoc, snapshot?.version ?? "");
      },
    });
    expect(row).toMatchObject({
      state: "failed",
      error: "The website was saved while retrying. Try again.",
    });
    expect(docOf(projectId)).toEqual(ownerDoc);
    expect(importRow(importId)?.report).toEqual(before?.report);
    expect(importRow(importId)?.retryState).toEqual(before?.retryState);
  });
});

describe("importing the next pages", () => {
  it("The next pages: 20 more, and the rest still over the limit", async () => {
    const { projectId, importId } = await imported("generated");
    const overLimit = () =>
      importRow(importId)?.report?.leftOut.find((l) => l.reason === "over-limit")?.detail;
    expect(pagesOf(docOf(projectId))).toHaveLength(20);
    expect(overLimit()).toBe("31");
    const row = await retry(projectId, "next");
    expect(row).toMatchObject({ state: "done", added: { pages: 20 } });
    expect(pagesOf(docOf(projectId))).toHaveLength(40);
    expect(overLimit()).toBe("11");
    expect(retryOffers(importRow(importId)?.retryState)).toEqual({ again: false, next: 11 });
    expect(importRow(importId)?.report?.pages).toHaveLength(40);
  });
});
