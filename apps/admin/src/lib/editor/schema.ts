import { siteSchema } from "@static-cms/site";
import type { DocumentSchema } from "svedit";

/**
 * The site schema as Svedit's type. `siteSchema` is declared `as const`, so its arrays are
 * readonly while Svedit's types expect mutable ones; the shape is otherwise identical
 * (checked by `validate_document_schema` in svedit-schema.test.ts).
 */
export const editorSchema = siteSchema as unknown as DocumentSchema;
