// Content types and browser caching of published files (own-hosting design.md decision 6).
// Files are uploaded with both; the edge keeps every file of a publish for as long as the
// publish exists, because its address includes the publish.

/** @type {Record<string, string>} */
const TYPES = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  webmanifest: "application/manifest+json; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
};

/** Kept by browsers for a day: they change rarely and are the heaviest. */
const DAY = new Set([
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "avif",
  "ico",
  "woff",
  "woff2",
  "ttf",
  "otf",
]);

/**
 * A file's extension, lowercased, without the dot; "" when it has none.
 * @param {string} path
 * @returns {string}
 */
export function extensionOf(path) {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/**
 * The `Content-Type` a file is served with.
 * @param {string} path
 * @returns {string}
 */
export function contentTypeOf(path) {
  return TYPES[extensionOf(path)] ?? "application/octet-stream";
}

/**
 * The `Cache-Control` browsers get. Pages, stylesheets and scripts are revalidated on every
 * load, since their names don't change between publishes; images and fonts are kept for a day.
 * @param {string} path
 * @returns {string}
 */
export function cacheControlOf(path) {
  return DAY.has(extensionOf(path))
    ? "public, max-age=86400"
    : "public, max-age=0, must-revalidate";
}
