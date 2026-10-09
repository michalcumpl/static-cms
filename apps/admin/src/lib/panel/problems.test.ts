import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { validateSite } from "@webmio/model";
import { TEMPLATE_RELEASES, upgradeSite } from "@webmio/templates";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { groupProblems, problemHref } from "./problems";

const require = createRequire(import.meta.url);
// biome-ignore lint/suspicious/noExplicitAny: the demo document, edited freely.
type Doc = { document_id: string; nodes: Record<string, any> };

function demoWithoutDescriptions(): Doc {
  const raw = readFileSync(require.resolve("@webmio/model/fixtures/demo-site.json"), "utf8");
  const doc = upgradeSite(JSON.parse(raw)) as Doc;
  doc.nodes[doc.document_id].description = "";
  for (const node of Object.values(doc.nodes)) if (node.type === "page") node.seo_description = "";
  return doc;
}

describe("grouping problems", () => {
  it("Pages without a description: one item, leading to the site's description", () => {
    const doc = demoWithoutDescriptions();
    const paths = projectPaths("p_1");
    const problems = validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.map((p) => ({
      ...p,
      href: problemHref(paths, doc, p),
    }));
    const pages = Object.values(doc.nodes).filter((n) => n.type === "page").length;
    expect(problems.filter((p) => p.code === "no-description")).toHaveLength(pages);
    const groups = groupProblems(paths, doc, problems);
    const group = groups.find((g) => g.code === "no-description");
    expect(group?.problems).toHaveLength(pages);
    expect(group?.href).toMatch(new RegExp(`^${paths.website}\\?focus=`));
    expect(groups.filter((g) => g.code === "no-description")).toHaveLength(1);
  });

  it("keeps a problem alone with its own link", () => {
    const doc = demoWithoutDescriptions();
    const paths = projectPaths("p_1");
    const [page] = Object.values(doc.nodes).filter((n) => n.type === "page");
    const problem = validateSite(doc, { templates: TEMPLATE_RELEASES }).problems.find(
      (p) => p.nodeId === page.id,
    );
    if (!problem) throw new Error("no problem");
    const linked = { ...problem, href: problemHref(paths, doc, problem) };
    expect(groupProblems(paths, doc, [linked])).toEqual([
      { severity: linked.severity, code: linked.code, href: linked.href, problems: [linked] },
    ]);
  });
});
