import type { Problem } from "@webmio/model";
import { locateMark, locateNode, settingsFieldId, settingsTarget } from "$lib/editor/locate";
import type { ProjectPaths } from "$lib/project-paths";

// Where a problem of the saved site is fixed, as a link (control-panel design decision 4): a
// section's field for the site's and the business's settings, otherwise the editor, which opens
// at the problem (its problems panel's own "show").

// biome-ignore lint/suspicious/noExplicitAny: problems are located in the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };

export function problemHref(paths: ProjectPaths, doc: Doc, problem: Problem): string {
  const target = settingsTarget(doc, problem.nodeId, problem.property);
  const field = settingsFieldId(target);
  const withQuery = (base: string, params: Record<string, string>) => {
    const query = new URLSearchParams(params).toString();
    return `${base}${base.includes("?") ? "&" : "?"}${query}`;
  };
  if (field) {
    return withQuery(target?.tab === "site" ? paths.website : paths.business, { focus: field });
  }
  const pageId =
    (target?.tab === "page" ? target.pageId : undefined) ??
    locateMark(doc, problem.nodeId)?.pageId ??
    locateNode(doc, problem.nodeId)?.pageId;
  return withQuery(paths.edit(pageId), {
    problem: problem.nodeId,
    ...(problem.property ? { property: problem.property } : {}),
  });
}
