// What a request gets when its publish has no file at the address (own-hosting design.md
// decision 4): a redirect from the publish's `_redirects`, else the publish's own 404 page.
// Runs in the Lambda@Edge origin-response function when S3 misses, in the admin's fake hosting,
// and in tests. Bundled into the function as it is, so it imports nothing.

/**
 * Reads an object of the hosting bucket as text; undefined when it doesn't exist.
 * @typedef {(key: string) => Promise<string | undefined>} ReadObject
 */

/**
 * @typedef {object} MissingResponse
 * @property {number} status
 * @property {Record<string, string>} headers
 * @property {string} [body]
 */

/** Like every file of a publish: browsers revalidate, the edge keeps it with the publish. */
const CACHE_CONTROL = "public, max-age=0, must-revalidate";

const PAGE_NOT_FOUND =
  '<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>Stránka nenalezena</title>' +
  '</head><body><h1>Stránka nenalezena</h1><p lang="en">Page not found.</p></body></html>';

/** Parsed `_redirects` of recent deploys; a deploy's files never change. */
const cache = new Map();
const CACHE_SIZE = 200;

/**
 * Netlify-format redirects, `<from> <to> [status]` per line, as a map from address to target.
 * The first line for an address wins, as on Netlify.
 * @param {string} text
 * @returns {Map<string, string>}
 */
export function parseRedirects(text) {
  const redirects = new Map();
  for (const line of text.split("\n")) {
    const fields = line.trim().split(/\s+/);
    const from = fields[0];
    const to = fields[1];
    if (!from || !to || from.startsWith("#")) continue;
    if (!redirects.has(from)) redirects.set(from, to);
  }
  return redirects;
}

/**
 * The publish folder (`sites/<siteId>/<deployId>/`) and the visitor's address (`/kontakt/`) of
 * a rewritten request URI; undefined when the URI isn't one.
 * @param {string} uri
 * @returns {{ folder: string; deployKey: string; path: string } | undefined}
 */
export function splitUri(uri) {
  const match = /^\/sites\/([^/]+)\/([^/]+)(\/.*)$/.exec(uri);
  if (!match) return undefined;
  let path;
  try {
    path = decodeURIComponent(/** @type {string} */ (match[3]));
  } catch (_error) {
    return undefined;
  }
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  return {
    folder: `sites/${match[1]}/${match[2]}/`,
    deployKey: `${match[1]}/${match[2]}`,
    path,
  };
}

/**
 * @param {string} folder
 * @param {string} deployKey
 * @param {ReadObject} read
 * @returns {Promise<Map<string, string>>}
 */
async function redirectsOf(folder, deployKey, read) {
  const cached = cache.get(deployKey);
  if (cached) return cached;
  const text = await read(`${folder}_redirects`);
  const redirects = parseRedirects(text === undefined ? "" : text);
  if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value);
  cache.set(deployKey, redirects);
  return redirects;
}

/**
 * The answer for a request whose file is missing from its publish: a 301 when the publish
 * redirects the address (with or without its trailing slash), otherwise the publish's
 * `404.html` with status 404. Undefined for a URI that isn't a publish's.
 * @param {{ uri: string; read: ReadObject }} input
 * @returns {Promise<MissingResponse | undefined>}
 */
export async function resolveMissing(input) {
  const parts = splitUri(input.uri);
  if (!parts) return undefined;
  const redirects = await redirectsOf(parts.folder, parts.deployKey, input.read);
  const path = parts.path;
  const alternate = path.endsWith("/") ? path.slice(0, -1) : `${path}/`;
  const target = redirects.get(path) || redirects.get(alternate);
  if (target) {
    return { status: 301, headers: { location: target, "cache-control": CACHE_CONTROL } };
  }
  const page = await input.read(`${parts.folder}404.html`);
  return {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": CACHE_CONTROL },
    body: page === undefined ? PAGE_NOT_FOUND : page,
  };
}
