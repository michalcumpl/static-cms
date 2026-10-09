import { afterEach, describe, expect, it } from "vitest";
import { versions } from "../db/schema";
import { readSite, saveSite } from "../site-documents";
import { useTestProject } from "../test-project";
import { markImportedImagesDecorative, undescribedImportedImages } from "./decorative";
import { type FixtureServer, startFixtureServer } from "./fixture-server";
import { importsSettled, readImport, startImport } from "./job";

const project = useTestProject();
let server: FixtureServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

type Node = { id: string; type: string; [key: string]: unknown };
type Doc = { nodes: Record<string, Node> };

async function importedBakery(): Promise<string> {
  server = await startFixtureServer("bakery");
  const { db, workspaceId, owner } = project();
  const started = startImport(
    db,
    { workspaceId, userId: owner.id, address: `${server.origin}/`, confirmed: true, locale: "en" },
    { allowHosts: new Set([server.host]) },
  );
  if (!started.ok) throw new Error(started.message.key);
  await importsSettled();
  return readImport(db, started.importId, owner.id)?.projectId ?? "";
}

const missingAlt = (projectId: string) =>
  (readSite(project().db, projectId)?.problems ?? [])
    .filter((p) => p.code === "missing-alt")
    .map((p) => p.nodeId)
    .sort();

describe("marking imported images decorative", () => {
  it("Two undescribed images: both decorative, their errors gone, one new version", async () => {
    const { db, owner } = project();
    const projectId = await importedBakery();
    const undescribed = undescribedImportedImages(db, projectId).sort();
    expect(undescribed.length).toBeGreaterThanOrEqual(2);
    expect(missingAlt(projectId)).toEqual(undescribed);
    const before = db.select().from(versions).all().length;
    expect(markImportedImagesDecorative(db, projectId, owner.id).ok).toBe(true);
    expect(db.select().from(versions).all()).toHaveLength(before + 1);
    expect(missingAlt(projectId)).toEqual([]);
    const doc = readSite(db, projectId)?.document as Doc;
    for (const id of undescribed) expect(doc.nodes[id]?.decorative).toBe(true);
    expect(undescribedImportedImages(db, projectId)).toEqual([]);
    expect(markImportedImagesDecorative(db, projectId, owner.id)).toEqual({
      ok: false,
      reason: "nothing",
    });
  });

  it("The owner's own image keeps its error", async () => {
    const { db, owner } = project();
    const projectId = await importedBakery();
    // The owner replaces an imported photo with their own, without a description.
    const snapshot = readSite(db, projectId);
    const doc = structuredClone(snapshot?.document) as Doc;
    const [replaced] = undescribedImportedImages(db, projectId);
    const parent = Object.values(doc.nodes).find((n) =>
      Object.values(n).some(
        (v) =>
          Array.isArray((v as { nodes?: unknown })?.nodes) &&
          (v as { nodes: string[] }).nodes.includes(replaced ?? ""),
      ),
    );
    for (const value of Object.values(parent ?? {})) {
      const list = value as { nodes?: string[] };
      if (Array.isArray(list?.nodes))
        list.nodes = list.nodes.map((id) => (id === replaced ? "image_owner" : id));
    }
    doc.nodes.image_owner = { ...(doc.nodes[replaced ?? ""] as Node), id: "image_owner" };
    delete doc.nodes[replaced ?? ""];
    expect(saveSite(db, projectId, owner.id, doc, snapshot?.version ?? "").ok).toBe(true);
    expect(markImportedImagesDecorative(db, projectId, owner.id).ok).toBe(true);
    expect(missingAlt(projectId)).toEqual(["image_owner"]);
  });
});
