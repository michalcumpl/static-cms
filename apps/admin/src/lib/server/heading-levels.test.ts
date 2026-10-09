import { describe, expect, it } from "vitest";
import { versions } from "./db/schema";
import { fixHeadingLevels, headingLevelFixes } from "./heading-levels";
import { readSite, saveSite } from "./site-documents";
import { useTestProject } from "./test-project";

const project = useTestProject();

type Node = { id: string; type: string; [key: string]: unknown };
type Doc = { document_id: string; nodes: Record<string, Node> };
const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/** The demo with a page that starts with two smaller subheadings, as an import could leave it. */
function withSkippedHeadings(): Doc {
  const { db, projectId, owner } = project();
  const site = readSite(db, projectId);
  const doc = structuredClone(site?.document) as Doc;
  const pageId = ((doc.nodes[doc.document_id] as Node).pages as { nodes: string[] }).nodes[1] ?? "";
  const page = doc.nodes[pageId] as Node;
  doc.nodes.sub_vienna = { id: "sub_vienna", type: "subheading", content: text("Vídeň"), level: 3 };
  doc.nodes.sub_graz = { id: "sub_graz", type: "subheading", content: text("Graz"), level: 3 };
  doc.nodes.para_vienna = { id: "para_vienna", type: "paragraph", content: text("Scéna.") };
  doc.nodes.text_austria = {
    id: "text_austria",
    type: "rich_text",
    body: list(["sub_vienna", "para_vienna", "sub_graz"]),
    hidden: false,
  };
  page.blocks = list(["text_austria", ...(page.blocks as { nodes: string[] }).nodes]);
  expect(saveSite(db, projectId, owner.id, doc, site?.version ?? "").ok).toBe(true);
  return doc;
}

const skips = () =>
  (readSite(project().db, project().projectId)?.problems ?? []).filter(
    (p) => p.code === "heading-skip",
  );

describe("fixing subheading levels", () => {
  it("makes each page's first smaller subheading a main one, as one version", () => {
    const { db, projectId, owner } = project();
    withSkippedHeadings();
    expect(skips().map((p) => p.nodeId)).toEqual(["sub_vienna", "sub_graz"]);
    expect(headingLevelFixes(db, projectId)).toBe(1);
    const before = db.select().from(versions).all().length;
    expect(fixHeadingLevels(db, projectId, owner.id).ok).toBe(true);
    expect(db.select().from(versions).all()).toHaveLength(before + 1);
    expect(skips()).toEqual([]);
    const doc = readSite(db, projectId)?.document as Doc;
    expect(doc.nodes.sub_vienna?.level).toBe(2);
    // Graz stays below Vienna.
    expect(doc.nodes.sub_graz?.level).toBe(3);
  });

  it("does nothing when no page needs it", () => {
    const { db, projectId, owner } = project();
    expect(headingLevelFixes(db, projectId)).toBe(0);
    expect(fixHeadingLevels(db, projectId, owner.id)).toEqual({ ok: false, reason: "nothing" });
  });
});
