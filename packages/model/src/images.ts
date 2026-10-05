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

/** Sizes of the square icons made from a site's favicon. */
export const ICON_SIZES = [32, 180, 512] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/** The file name of one of a favicon's square PNG icons: `<media key>-icon-<size>.png`. */
export function iconFile(key: string, size: IconSize): string {
  return `${key}-icon-${size}.png`;
}

/** The file name of an image's 1200 × 630 share image: `<media key>-share.jpg`. */
export function shareFile(key: string): string {
  return `${key}-share.jpg`;
}

/** Properties whose images aren't shown on pages, and so get derived files instead of variants. */
const DERIVED: Record<string, Record<string, (key: string) => string[]>> = {
  site: {
    favicon: (key) => ICON_SIZES.map((size) => iconFile(key, size)),
    share_image: (key) => [shareFile(key)],
  },
  page: { share_image: (key) => [shareFile(key)] },
};

/** Whether a node's property holds images that get derived files instead of variants. */
export function isDerivedImageProperty(type: string, property: string): boolean {
  return DERIVED[type]?.[property] !== undefined;
}

type LooseNode = { type?: unknown; [key: string]: unknown };

/**
 * The media files a document's exported site uses, each once, sorted: every variant of every
 * image reachable from the site root through its pages and its logo, the favicon's icons, and
 * the share file of the site's and each page's share image. Works on any document, valid or not, so
 * callers can use it to decide which files to supply.
 */
export function usedMediaFiles(doc: unknown): string[] {
  const files = new Set<string>();
  if (typeof doc !== "object" || doc === null) return [];
  const { document_id: rootId, nodes } = doc as { document_id?: unknown; nodes?: unknown };
  if (typeof rootId !== "string" || typeof nodes !== "object" || nodes === null) return [];
  const all = nodes as Record<string, LooseNode>;
  const seen = new Set<string>();
  const childrenOf = (value: unknown): unknown[] => {
    const children = (value as { nodes?: unknown } | undefined)?.nodes;
    return Array.isArray(children) ? children : [];
  };
  const visit = (id: unknown): void => {
    if (typeof id !== "string" || seen.has(id)) return;
    seen.add(id);
    const node = all[id];
    if (!node || !isNodeType(node.type)) return;
    if (node.type === "image" && typeof node.src === "string" && typeof node.width === "number") {
      for (const w of imageVariants(node.width)) files.add(imageFile(node.src, w));
    }
    const derived = DERIVED[node.type] ?? {};
    const properties: Record<string, PropertyDef> = siteSchema[node.type].properties;
    for (const [name, def] of Object.entries(properties)) {
      const value = node[name];
      const derive = derived[name];
      if (derive) {
        for (const child of childrenOf(value)) {
          const src = typeof child === "string" ? all[child]?.src : undefined;
          if (typeof src === "string") for (const file of derive(src)) files.add(file);
        }
        continue;
      }
      if (def.type === "node") visit(value);
      if (def.type === "node_array") for (const child of childrenOf(value)) visit(child);
    }
  };
  visit(rootId);
  return [...files].sort();
}
