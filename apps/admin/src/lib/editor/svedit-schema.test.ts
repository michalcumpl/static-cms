import { validate_document, validate_document_schema } from "svedit";
import { describe, expect, it } from "vitest";
import { demoSite } from "$lib/server/demo";
import { editorSchema } from "./schema";

describe("Svedit compatibility", () => {
  it("accepts the site schema", () => {
    expect(() => validate_document_schema(editorSchema)).not.toThrow();
  });

  it("accepts the demo site document", () => {
    expect(() => validate_document(demoSite() as never, editorSchema)).not.toThrow();
  });

  it("rejects a broken document, so the checks above are meaningful", () => {
    const doc = demoSite() as { nodes: Record<string, { blocks?: { nodes: string[] } }> };
    doc.nodes.page_home?.blocks?.nodes.push("missing_block");
    expect(() => validate_document(doc as never, editorSchema)).toThrow(/missing_block/);
  });
});
