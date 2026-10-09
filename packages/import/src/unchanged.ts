// Whether the owner left an imported page as the import (or the last retry) saved it
// (import-review-actions design decision 3): its whole subtree, compared without node IDs.

type Doc = { nodes: Record<string, Record<string, unknown> | undefined> };

/** A node and everything it owns as canonical JSON: keys sorted, owned nodes inlined, no IDs. */
function canonical(doc: Doc, id: string, seen = new Set<string>()): unknown {
  const node = doc.nodes[id];
  if (!node || seen.has(id)) return null;
  seen.add(id);
  const value = (v: unknown, key: string): unknown => {
    if (Array.isArray(v)) {
      // A node list's members are owned nodes.
      return key === "nodes"
        ? v.map((child) => canonical(doc, String(child), seen))
        : v.map((x) => value(x, ""));
    }
    if (v && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        // A mark's or annotation's node is owned too.
        .map(([k, x]) => [k, k === "node_id" ? canonical(doc, String(x), seen) : value(x, k)]);
      return Object.fromEntries(entries);
    }
    return v;
  };
  const { id: _id, translation_key: _key, ...props } = node;
  return value(props, "");
}

/** Whether a page's subtree is the same in both documents, node IDs aside. */
export function pageUnchanged(importDoc: Doc, currentDoc: Doc, pageId: string): boolean {
  if (!importDoc.nodes[pageId] || !currentDoc.nodes[pageId]) return false;
  return (
    JSON.stringify(canonical(importDoc, pageId)) === JSON.stringify(canonical(currentDoc, pageId))
  );
}
