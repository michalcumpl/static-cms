// The one-time project upgrade to document format 7 (business-collections design decision 8).
// Each language's document is upgraded on its own by `migrateSite`; this adds what only the
// whole project can do: items that exist only in a non-primary language move into the primary,
// because which items exist is now shared from the primary.
import { randomUUID } from "node:crypto";
import { COLLECTION_BLOCK_TYPES, COLLECTIONS, migrateSite, validateSite } from "@static-cms/site";
import { eq } from "drizzle-orm";
import type { Db } from "./db/index";
import { projects, siteDocuments, versions } from "./db/schema";
import { newId } from "./ids";

const TARGET_VERSION = 7;

type Node = { id: string; type: string; [key: string]: unknown };
type Doc = { document_id: string; nodes: Record<string, Node> };
type List = { nodes: string[]; marks: unknown[]; annotations: unknown[] };

const list = (nodes: string[]): List => ({ nodes, marks: [], annotations: [] });
const idsOf = (value: unknown): string[] => {
  const nodes = (value as { nodes?: unknown } | undefined)?.nodes;
  return Array.isArray(nodes) ? nodes.filter((id): id is string => typeof id === "string") : [];
};

function schemaVersion(document: unknown): number {
  const doc = document as Partial<Doc> | null;
  const site = doc?.document_id ? doc.nodes?.[doc.document_id] : undefined;
  return typeof site?.schema_version === "number" ? site.schema_version : 0;
}

/** A node and the nodes it owns: list children and the nodes its marks point at. */
function ownedIds(nodes: Record<string, Node>, id: string): string[] {
  const node = nodes[id];
  if (!node) return [];
  const ids = [id];
  for (const value of Object.values(node)) {
    if (typeof value !== "object" || value === null) continue;
    for (const child of idsOf(value)) ids.push(...ownedIds(nodes, child));
    const marks = (value as { marks?: unknown }).marks;
    for (const range of Array.isArray(marks) ? marks : []) {
      const markId = (range as { node_id?: unknown })?.node_id;
      if (typeof markId === "string") ids.push(...ownedIds(nodes, markId));
    }
  }
  return ids;
}

/**
 * Upgrades a project's documents (primary first) to version 7 and merges their collections:
 * items only a non-primary language has are appended to the primary's collection, with that
 * language's texts. Wherever a block showing all items would then show something else, it shows
 * its former items as chosen instead, so no page changes. Returns the new documents, in order.
 * Throws when an appended item's node IDs are already taken in the primary.
 */
export function upgradeProjectDocuments(documents: readonly unknown[]): Doc[] {
  const docs = documents.map((doc) => structuredClone(migrateSite(doc)) as Doc);
  const [primary, ...others] = docs;
  if (!primary) return docs;
  const site = (doc: Doc) => doc.nodes[doc.document_id] as Node;
  // Each document's own collections, as its blocks showed them before.
  const own = docs.map(
    (doc) =>
      Object.fromEntries(
        Object.values(COLLECTIONS).map(({ collection }) => [
          collection,
          idsOf(site(doc)[collection]),
        ]),
      ) as Record<string, string[]>,
  );

  for (const other of others) {
    for (const { collection } of Object.values(COLLECTIONS)) {
      const members = idsOf(site(primary)[collection]);
      for (const itemId of idsOf(site(other)[collection])) {
        if (members.includes(itemId)) continue;
        for (const id of ownedIds(other.nodes, itemId)) {
          if (primary.nodes[id]) {
            throw new Error(`node ${id} of an item in another language already exists`);
          }
          primary.nodes[id] = structuredClone(other.nodes[id] as Node);
        }
        members.push(itemId);
      }
      site(primary)[collection] = list(members);
    }
  }

  docs.forEach((doc, i) => {
    for (const block of Object.values(doc.nodes)) {
      if (!COLLECTION_BLOCK_TYPES.includes(block.type as never) || block.show !== "all") continue;
      const { collection } = COLLECTIONS[block.type as keyof typeof COLLECTIONS];
      const shown = own[i]?.[collection] ?? [];
      const shared = idsOf(site(primary)[collection]);
      const same = shown.length === shared.length && shown.every((id, n) => shared[n] === id);
      if (same) continue;
      block.show = "chosen";
      block.chosen = list(
        shown.map((itemId) => {
          let refId = `${block.id}_ref`;
          for (let n = 2; doc.nodes[refId]; n++) refId = `${block.id}_ref_${n}`;
          doc.nodes[refId] = { id: refId, type: "item_ref", item_id: itemId };
          return refId;
        }),
      );
    }
  });
  return docs;
}

/**
 * Upgrades every project with a current document below version 7, one transaction per project,
 * saving each language as a new version made by the system. A failure leaves that project's
 * documents unchanged and is thrown with the project named.
 */
export function upgradeProjects(db: Db): number {
  const rows = db
    .select({
      projectId: siteDocuments.projectId,
      primaryLang: projects.primaryLang,
      docId: siteDocuments.id,
      lang: siteDocuments.lang,
      document: versions.document,
    })
    .from(siteDocuments)
    .innerJoin(projects, eq(projects.id, siteDocuments.projectId))
    .innerJoin(versions, eq(versions.id, siteDocuments.currentVersionId))
    .all();
  const byProject = new Map<string, typeof rows>();
  for (const row of rows)
    byProject.set(row.projectId, [...(byProject.get(row.projectId) ?? []), row]);

  let upgraded = 0;
  for (const [projectId, docs] of byProject) {
    if (docs.every((row) => schemaVersion(row.document) >= TARGET_VERSION)) continue;
    const ordered = [...docs].sort(
      (a, b) => Number(b.lang === b.primaryLang) - Number(a.lang === a.primaryLang),
    );
    try {
      const results = upgradeProjectDocuments(ordered.map((row) => row.document));
      db.transaction((tx) => {
        ordered.forEach((row, i) => {
          const document = results[i];
          if (JSON.stringify(document) === JSON.stringify(row.document)) return;
          const broken = validateSite(document).problems.filter(
            (p) => p.category === "structure" && p.severity === "error",
          );
          if (broken.length > 0) {
            throw new Error(`the ${row.lang} document is broken: ${broken[0]?.message}`);
          }
          const version = randomUUID();
          const versionId = newId("v");
          tx.insert(versions)
            .values({
              id: versionId,
              documentId: row.docId,
              version,
              document,
              createdAt: new Date(),
              createdBy: null,
              system: true,
            })
            .run();
          tx.update(siteDocuments)
            .set({ version, currentVersionId: versionId })
            .where(eq(siteDocuments.id, row.docId))
            .run();
        });
      });
    } catch (err) {
      throw new Error(
        `Could not upgrade project ${projectId} to document format ${TARGET_VERSION}: ${(err as Error).message}`,
      );
    }
    upgraded++;
  }
  return upgraded;
}
