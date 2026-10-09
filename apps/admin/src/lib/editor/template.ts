import { STANDARD, type Template, templateById } from "@webmio/templates";

/**
 * The site's template (template-system design decision 9): the one the document names, or
 * Standard while it names none the registry knows. `lookup` is the registry unless a test passes
 * its own templates.
 */
export function siteTemplate(
  document: unknown,
  lookup: (id: string) => Template | undefined = templateById,
): Template {
  const doc = document as { document_id: string; nodes: Record<string, Record<string, unknown>> };
  const id = doc.nodes[doc.document_id]?.template;
  return (typeof id === "string" && lookup(id)) || STANDARD;
}
