import { validateSite } from "@webmio/model";
import { TEMPLATE_RELEASES } from "@webmio/templates";
import type { Db } from "./db/index";
import { readSite, type SaveResult, saveSite } from "./site-documents";

// Fixing smaller subheadings that come before a page's first main one (validation's
// "heading-skip"; import-review-actions): the first such subheading on each page becomes a main
// subheading, which nothing is lost by.

type Doc = { nodes: Record<string, { type: string; level?: number }> };

const skipped = (doc: unknown) =>
  validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.filter(
    (p) => p.code === "heading-skip",
  );

/** The document with the fix applied, and the subheadings it made main. */
export function withHeadingLevelsFixed(document: unknown): { document: Doc; promoted: string[] } {
  const doc = structuredClone(document) as Doc;
  const promoted: string[] = [];
  // Each pass promotes the first subheading flagged; that fixes the rest of its page.
  for (let problems = skipped(doc); problems.length > 0; problems = skipped(doc)) {
    const node = doc.nodes[problems[0]?.nodeId ?? ""];
    if (node?.type !== "subheading" || node.level === 2) break;
    node.level = 2;
    promoted.push(problems[0]?.nodeId ?? "");
  }
  return { document: doc, promoted };
}

/** How many subheadings the fix would make main. */
export function headingLevelFixes(db: Db, projectId: string): number {
  const site = readSite(db, projectId);
  if (!site?.problems.some((p) => p.code === "heading-skip")) return 0;
  return withHeadingLevelsFixed(site.document).promoted.length;
}

export type HeadingFixResult = SaveResult | { ok: false; reason: "nothing" };

/** Applies the fix to the primary language's saved document, as one new version. */
export function fixHeadingLevels(db: Db, projectId: string, userId: string): HeadingFixResult {
  const site = readSite(db, projectId);
  if (!site) return { ok: false, reason: "nothing" };
  const { document, promoted } = withHeadingLevelsFixed(site.document);
  if (promoted.length === 0) return { ok: false, reason: "nothing" };
  return saveSite(db, projectId, userId, document, site.version);
}
