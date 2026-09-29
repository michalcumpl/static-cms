import { zipSync } from "fflate";
import { escapeHtml } from "../render/html.js";
import { renderSite } from "../render/index.js";
import { type PropertyDef, type SiteDocument, siteSchema } from "../schema/index.js";
import { type Problem, problem } from "../validate/index.js";

export interface ExportOptions {
  /** Where the site will be served from: `/` (default) or a subdirectory like `/web/`. */
  basePath?: string;
}

/** Site files keyed by path relative to the site root, e.g. `kontakt/index.html`. */
export type SiteFiles = Map<string, Uint8Array>;

export type ExportResult =
  | { ok: true; files: SiteFiles; warnings: Problem[] }
  | { ok: false; problems: Problem[] };

/**
 * Renders a site document into its static file tree. `media` maps each image's media key
 * (its `src`) to the file's bytes; only images the site uses are included.
 */
export function exportSite(
  input: unknown,
  media: ReadonlyMap<string, Uint8Array>,
  options: ExportOptions = {},
): ExportResult {
  const rendered = renderSite(input, options);
  if (!rendered.ok) return rendered;

  const doc = input as SiteDocument;
  const warnings = [...rendered.warnings];
  const encoder = new TextEncoder();
  const files: [string, Uint8Array][] = [];

  for (const page of rendered.site.pages) files.push([page.path, encoder.encode(page.html)]);
  files.push(["assets/style.css", encoder.encode(rendered.site.css)]);

  const missing: Problem[] = [];
  for (const image of usedImages(doc)) {
    const bytes = media.get(image.src);
    if (bytes) {
      files.push([`assets/images/${image.src}`, bytes]);
    } else {
      missing.push(
        problem(
          "error",
          "missing-media",
          image.id,
          `No file was supplied for image ${image.id}: ${image.src}.`,
          "src",
        ),
      );
    }
  }
  if (missing.length > 0) return { ok: false, problems: missing };

  const site = doc.nodes[doc.document_id];
  if (site?.type === "site" && site.base_url !== "") {
    const routes = rendered.site.pages.map((p) => p.path.replace(/index\.html$/, ""));
    files.push(["sitemap.xml", encoder.encode(sitemap(site.base_url, routes))]);
  } else {
    warnings.push(
      problem(
        "warning",
        "no-base-url",
        doc.document_id,
        "The site has no base URL, so sitemap.xml was left out.",
        "base_url",
      ),
    );
  }

  files.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { ok: true, files: new Map(files), warnings };
}

/** Image nodes reachable from the site root, in a stable order, each media key once. */
function usedImages(doc: SiteDocument) {
  const seen = new Set<string>();
  const images = new Map<string, { id: string; src: string }>();
  const visit = (id: string): void => {
    const node = doc.nodes[id];
    if (!node || seen.has(id)) return;
    seen.add(id);
    if (node.type === "image" && !images.has(node.src)) images.set(node.src, node);
    const properties: Record<string, PropertyDef> = siteSchema[node.type].properties;
    for (const [name, def] of Object.entries(properties)) {
      const value = (node as unknown as Record<string, unknown>)[name];
      if (def.type === "node") visit(value as string);
      if (def.type === "node_array")
        for (const child of (value as { nodes: string[] }).nodes) visit(child);
    }
  };
  visit(doc.document_id);
  return [...images.values()];
}

function sitemap(baseUrl: string, routes: string[]): string {
  const base = baseUrl.replace(/\/+$/, "");
  const urls = routes.map((route) => `  <url><loc>${escapeHtml(`${base}/${route}`)}</loc></url>\n`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}</urlset>
`;
}

/** Fixed timestamp for every archive entry (the ZIP epoch), so archives are reproducible. */
const ZIP_MTIME = new Date(1980, 0, 1);
/** Regular file, rw-r--r--, recorded as Unix so extracted files get sane permissions. */
const ZIP_ATTRS = { os: 3, attrs: (0o100644 << 16) >>> 0 };

/**
 * Packs site files into a ZIP archive with the files at the archive root. Entries are
 * sorted and carry fixed metadata, so the same files always produce the same bytes.
 */
export function zipFiles(files: ReadonlyMap<string, Uint8Array>): Uint8Array<ArrayBuffer> {
  const entries = [...files.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const zippable: Record<
    string,
    [Uint8Array, { mtime: Date; os: number; attrs: number; level: 6 }]
  > = {};
  for (const [path, bytes] of entries) {
    zippable[path] = [bytes, { mtime: ZIP_MTIME, ...ZIP_ATTRS, level: 6 }];
  }
  return zipSync(zippable);
}
