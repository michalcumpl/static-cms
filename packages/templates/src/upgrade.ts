import { migrateSite } from "@webmio/model";
import { templateById } from "./registry.js";
import type { SiteDocumentJson, Template } from "./types.js";

/**
 * Upgrades a stored site document to the current schema (`migrateSite`), then to its template's
 * current release (templates spec, "Template releases"; design decision 6): the template's upgrade
 * steps for each later release run in order, and the recorded release becomes the current one.
 * A document of an unknown template, or recording a release newer than the code's, is returned
 * as the schema upgrade left it, for validation to report. The input is not modified.
 *
 * `templates` looks templates up; the registry by default, a test's own templates otherwise.
 */
export function upgradeSite(
  doc: unknown,
  templates: (id: string) => Template | undefined = templateById,
): unknown {
  const current = migrateSite(doc);
  if (!isDocument(current)) return current;
  const site = current.nodes[current.document_id];
  const template = typeof site?.template === "string" ? templates(site.template) : undefined;
  const recorded = site?.template_release;
  if (!template || !Number.isInteger(recorded) || recorded >= template.release) return current;
  // The steps change the document in place, so they get a copy.
  const upgraded = structuredClone(current);
  for (let release = recorded + 1; release <= template.release; release++) {
    template.upgrades[release]?.(upgraded);
  }
  const upgradedSite = upgraded.nodes[upgraded.document_id];
  if (upgradedSite) upgradedSite.template_release = template.release;
  return upgraded;
}

function isDocument(value: unknown): value is SiteDocumentJson {
  const doc = value as SiteDocumentJson | null;
  return (
    typeof doc === "object" &&
    doc !== null &&
    typeof doc.document_id === "string" &&
    typeof doc.nodes === "object" &&
    doc.nodes !== null
  );
}
