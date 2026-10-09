import { STANDARD } from "./standard.js";
import type { Template } from "./types.js";

/** Every template, each at its current release. A new template is a module added here. */
export const TEMPLATES: readonly Template[] = [STANDARD];

/** The template with this ID, or undefined. */
export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** Each template's ID with its current release, for `validateSite(doc, { templates })`. */
export const TEMPLATE_RELEASES: ReadonlyMap<string, number> = new Map(
  TEMPLATES.map((t) => [t.id, t.release]),
);
