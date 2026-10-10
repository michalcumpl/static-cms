import type { Problem } from "@webmio/model";
import {
  listFieldId,
  listTarget,
  locateMark,
  locateNode,
  settingsFieldId,
  settingsTarget,
} from "$lib/editor/locate";
import type { ProjectPaths } from "$lib/project-paths";

// Where a problem of the saved site is fixed, as a link (control-panel design decision 4): a
// section's field for the site's and the business's settings, an item's field in What you offer
// or About you (offer-and-about decision 7), otherwise the editor, which opens at the problem
// (its problems panel's own "show").

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
  const item = listTarget(doc, problem.nodeId, problem.property);
  if (item) {
    return withQuery(item.section === "offer" ? paths.offer : paths.about, {
      focus: listFieldId(item.section, item.itemId, item.field),
    });
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

/** A problem with where it is fixed. */
export type LinkedProblem = Problem & { href: string };

/** Problems of one code: one alone, or several shown as one item with each under it. */
export interface ProblemGroup {
  severity: Problem["severity"];
  code: Problem["code"];
  /** Where the whole group is fixed at once, when one place does (a site's description). */
  href: string;
  problems: LinkedProblem[];
  /** The language's name, when the problems are listed for several (import-languages). */
  language?: string;
}

/**
 * The problems with the same code together, in the order their first one came. Pages without a
 * description are fixed at once by the site's description, so their group leads there.
 */
export function groupProblems(
  paths: ProjectPaths,
  doc: Doc,
  problems: readonly LinkedProblem[],
): ProblemGroup[] {
  const groups = new Map<string, ProblemGroup>();
  for (const problem of problems) {
    const key = `${problem.severity}:${problem.code}`;
    const group = groups.get(key);
    if (group) group.problems.push(problem);
    else {
      groups.set(key, {
        severity: problem.severity,
        code: problem.code,
        href: problem.href,
        problems: [problem],
      });
    }
  }
  for (const group of groups.values()) {
    if (group.code === "no-description" && group.problems.length > 1) {
      group.href = problemHref(paths, doc, {
        ...(group.problems[0] as Problem),
        nodeId: doc.document_id,
        property: "description",
      });
    }
  }
  return [...groups.values()];
}
