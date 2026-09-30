import { isNodeType, type PropertyDef, siteSchema } from "./schema/schema.js";

/** Widths every image is published in, as far as the image is wide enough. */
export const WIDTH_LADDER = [480, 960, 1600, 2400] as const;

const MAX_WIDTH = WIDTH_LADDER[WIDTH_LADDER.length - 1] as number;
/** The widest variant used as an `<img>`'s plain `src`. */
const SRC_MAX_WIDTH = 1600;

/**
 * The widths an image of `width` pixels is stored and published in: the ladder widths below
 * its width, plus its own width (capped at the widest rung). Empty for an unknown width.
 */
export function imageVariants(width: number): number[] {
  if (!(width > 0)) return [];
  const own = Math.min(Math.round(width), MAX_WIDTH);
  return [...WIDTH_LADDER.filter((w) => w < own), own];
}

/** The file name of one variant of an image: `<media key>-<width>.webp`. */
export function imageFile(key: string, width: number): string {
  return `${key}-${width}.webp`;
}

/** The variant used as an image's `src`: the largest one up to 1600 pixels wide. */
export function srcVariant(width: number): number | undefined {
  const variants = imageVariants(width);
  return variants.filter((w) => w <= SRC_MAX_WIDTH).at(-1) ?? variants[0];
}

type LooseNode = { type?: unknown; [key: string]: unknown };

/**
 * The image files a document's pages use: every variant of every image reachable from the
 * site root, each once, sorted. Works on any document, valid or not, so callers can use it
 * to decide which files to supply.
 */
export function usedImageFiles(doc: unknown): string[] {
  const files = new Set<string>();
  if (typeof doc !== "object" || doc === null) return [];
  const { document_id: rootId, nodes } = doc as { document_id?: unknown; nodes?: unknown };
  if (typeof rootId !== "string" || typeof nodes !== "object" || nodes === null) return [];
  const all = nodes as Record<string, LooseNode>;
  const seen = new Set<string>();
  const visit = (id: unknown): void => {
    if (typeof id !== "string" || seen.has(id)) return;
    seen.add(id);
    const node = all[id];
    if (!node || !isNodeType(node.type)) return;
    if (node.type === "image" && typeof node.src === "string" && typeof node.width === "number") {
      for (const w of imageVariants(node.width)) files.add(imageFile(node.src, w));
    }
    const properties: Record<string, PropertyDef> = siteSchema[node.type].properties;
    for (const [name, def] of Object.entries(properties)) {
      const value = node[name];
      if (def.type === "node") visit(value);
      if (def.type === "node_array") {
        const children = (value as { nodes?: unknown } | undefined)?.nodes;
        if (Array.isArray(children)) for (const child of children) visit(child);
      }
    }
  };
  visit(rootId);
  return [...files].sort();
}
