import {
  ICON_SIZES,
  type IconSize,
  iconFile,
  imageFile,
  imageVariants,
  isDerivedImageProperty,
  type NodeOfType,
  type Problem,
  type PropertyDef,
  problem,
  type SiteDocument,
  shareFile,
  siteSchema,
  usedFontFiles,
} from "@webmio/model";
import { escapeHtml, renderSite, type SiteLanguage } from "@webmio/render";
import { zipSync } from "fflate";
import { pngToIco } from "./ico.js";
import { robotsTxt } from "./robots.js";

export interface ExportOptions {
  /** Where the site will be served from: `/` (default) or a subdirectory like `/web/`. */
  basePath?: string;
  /** The site's address (canonical links and the sitemap); defaults to the document's base URL. */
  siteUrl?: string;
  /** Redirects written to `_redirects` (Netlify's format), in this order. */
  redirects?: readonly Redirect[];
  /** Where shared files are linked from, when not at `basePath` (see `exportSiteLanguages`). */
  assetBasePath?: string;
  /** The site's languages, for alternates and the language switcher (see `exportSiteLanguages`). */
  languages?: readonly SiteLanguage[];
  /**
   * Font files and licences keyed by name (see `usedFontFiles`). Needed when the theme uses a
   * webfont; only the files it uses are included.
   */
  fonts?: ReadonlyMap<string, Uint8Array>;
}

/** A permanent redirect from one address path to another, both starting with `/`. */
export interface Redirect {
  from: string;
  to: string;
}

const REDIRECT_PATH = /^\/\S*$/;

/** Site files keyed by path relative to the site root, e.g. `kontakt/index.html`. */
export type SiteFiles = Map<string, Uint8Array>;

export type ExportResult =
  | { ok: true; files: SiteFiles; warnings: Problem[] }
  | { ok: false; problems: Problem[] };

/**
 * Renders a site document into its static file tree. `media` maps image file names
 * (`<media key>-<width>.webp`, see `usedMediaFiles`) to their bytes; only files the site
 * uses are included.
 */
export function exportSite(
  input: unknown,
  media: ReadonlyMap<string, Uint8Array>,
  options: ExportOptions = {},
): ExportResult {
  const badRedirect = (options.redirects ?? []).find(
    (r) => !REDIRECT_PATH.test(r.from) || !REDIRECT_PATH.test(r.to),
  );
  if (badRedirect) {
    return {
      ok: false,
      problems: [
        problem(
          "error",
          "invalid-redirect",
          "",
          `Redirect "${badRedirect.from}" -> "${badRedirect.to}" needs paths that start with "/" and contain no spaces.`,
        ),
      ],
    };
  }
  const rendered = renderSite(input, options);
  if (!rendered.ok) return rendered;

  const doc = input as SiteDocument;
  const warnings = [...rendered.warnings];
  const encoder = new TextEncoder();
  const files: [string, Uint8Array][] = [];

  for (const page of rendered.site.pages) files.push([page.path, encoder.encode(page.html)]);
  files.push(["404.html", encoder.encode(rendered.site.notFound)]);
  files.push(["assets/style.css", encoder.encode(rendered.site.css)]);
  // The video script, only when a page shows a video (video design decision 3).
  if (rendered.site.script) files.push(["assets/video.js", encoder.encode(rendered.site.script)]);

  // The same files as usedMediaFiles(doc), walked per image to name the image when one is missing.
  const missing: Problem[] = [];
  const added = new Set<string>();
  const place = (
    image: NodeOfType<"image">,
    name: string,
    path: string,
    wrap = (b: Uint8Array) => b,
  ) => {
    if (added.has(path)) return;
    added.add(path);
    const bytes = media.get(name);
    if (bytes) {
      files.push([path, wrap(bytes)]);
    } else {
      missing.push(
        problem("error", "missing-media", image.id, `No file was supplied for ${name}.`, "src"),
      );
    }
  };
  for (const image of usedImages(doc)) {
    for (const width of imageVariants(image.width)) {
      const name = imageFile(image.src, width);
      place(image, name, `assets/images/${name}`);
    }
  }
  const site = doc.nodes[doc.document_id] as NodeOfType<"site">;
  const favicon = imageOf(doc, site.favicon.nodes[0]);
  if (favicon) {
    const icons: Record<IconSize, string> = {
      32: "favicon.ico",
      180: "apple-touch-icon.png",
      512: "icon-512.png",
    };
    for (const size of ICON_SIZES) {
      const wrap = size === 32 ? (png: Uint8Array) => pngToIco(png, 32) : undefined;
      place(favicon, iconFile(favicon.src, size), icons[size], wrap);
    }
  }
  const shareImages = [
    site.share_image.nodes[0],
    ...site.pages.nodes.map((id) => (doc.nodes[id] as NodeOfType<"page">).share_image.nodes[0]),
    // A project's cover is its page's share image (collection-pages).
    ...(site.projects_page_id === ""
      ? []
      : site.projects.nodes.map((id) => (doc.nodes[id] as NodeOfType<"project">).cover.nodes[0])),
  ];
  for (const id of shareImages) {
    const image = imageOf(doc, id);
    if (image) place(image, shareFile(image.src), `assets/images/${shareFile(image.src)}`);
  }
  for (const name of usedFontFiles(doc)) {
    const bytes = options.fonts?.get(name);
    if (bytes) {
      files.push([`assets/fonts/${name}`, bytes]);
    } else {
      missing.push(
        problem("error", "missing-media", site.theme, `No file was supplied for ${name}.`),
      );
    }
  }
  if (missing.length > 0) return { ok: false, problems: missing };

  const baseUrl = options.siteUrl ?? site.base_url;
  if (baseUrl !== "") {
    const routes = rendered.site.pages.map((p) => p.path.replace(/index\.html$/, ""));
    files.push(["sitemap.xml", encoder.encode(sitemap(baseUrl, routes))]);
  } else {
    warnings.push(
      problem(
        "warning",
        "no-base-url",
        doc.document_id,
        "The site has no address yet, so the sitemap, page addresses in link previews, share images and structured data were left out.",
        "base_url",
      ),
    );
  }

  const sitemapUrl = baseUrl === "" ? undefined : `${baseUrl.replace(/\/+$/, "")}/sitemap.xml`;
  files.push([
    "robots.txt",
    encoder.encode(
      robotsTxt({
        allowAiSearch: site.allow_ai_search,
        allowAiTraining: site.allow_ai_training,
        sitemapUrl,
      }),
    ),
  ]);

  if (options.redirects && options.redirects.length > 0) {
    const lines = options.redirects.map((r) => `${r.from} ${r.to} 301\n`).join("");
    files.push(["_redirects", encoder.encode(lines)]);
  }

  files.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { ok: true, files: new Map(files), warnings };
}

function imageOf(doc: SiteDocument, id: string | undefined): NodeOfType<"image"> | undefined {
  const node = id === undefined ? undefined : doc.nodes[id];
  return node?.type === "image" ? node : undefined;
}

/**
 * Image nodes shown on the site's pages, in a stable order, each media key once. Favicons and
 * share images aren't shown, so they're left out: they get derived files instead of variants.
 */
function usedImages(doc: SiteDocument) {
  const seen = new Set<string>();
  const images = new Map<string, NodeOfType<"image">>();
  const visit = (id: string): void => {
    const node = doc.nodes[id];
    if (!node || seen.has(id)) return;
    seen.add(id);
    if (node.type === "image" && !images.has(node.src)) images.set(node.src, node);
    const properties: Record<string, PropertyDef> = siteSchema[node.type].properties;
    for (const [name, def] of Object.entries(properties)) {
      if (isDerivedImageProperty(node.type, name)) continue;
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
