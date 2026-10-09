// Which file of which publish a request gets (own-hosting design.md decision 3). Runs in the
// CloudFront Function on every request, in the admin's fake hosting, and in tests. It is bundled
// into the function as it is, so it imports nothing and keeps to what CloudFront Functions'
// JavaScript runtime 2.0 supports: no optional chaining, no nullish coalescing, no classes.

/**
 * @typedef {object} EdgeRequest
 * @property {string} host The `Host` header, as sent.
 * @property {string} uri The path, percent-encoded as sent.
 * @property {string} querystring The query string without `?`; "" when there is none.
 */

/**
 * A key-value store lookup: the value, or undefined when the key is missing.
 * @typedef {(key: string) => Promise<string | undefined>} Lookup
 */

/**
 * @typedef {{ kind: "respond"; status: number; headers: Record<string, string>; body?: string }
 *   | { kind: "fetch"; uri: string }} Routed
 */

/** The rewritten address of a file no publish has: the origin misses, the website's 404 follows. */
export const MISSING_FILE = "/.missing";

const NO_WEBSITE_BODY =
  '<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" ' +
  'content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">' +
  '<title>Tady žádný web není</title></head><body style="font-family:system-ui,sans-serif;' +
  'max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>Tady žádný web není</h1>' +
  '<p lang="en">No website here.</p></body></html>';

/**
 * The "No website here" page: for hostnames that belong to no website, websites with nothing
 * live, and addresses that try to leave their publish.
 * @returns {Routed}
 */
export function noWebsite() {
  return {
    kind: "respond",
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    body: NO_WEBSITE_BODY,
  };
}

/**
 * @param {string} location
 * @returns {Routed}
 */
function permanentRedirect(location) {
  return {
    kind: "respond",
    status: 301,
    headers: { location: location, "cache-control": "public, max-age=3600" },
  };
}

/**
 * A hostname as a key: lowercase, without a port or a trailing dot.
 * @param {string} host
 * @returns {string}
 */
export function normalizeHost(host) {
  let name = host.trim().toLowerCase();
  const colon = name.lastIndexOf(":");
  if (colon !== -1 && name.indexOf("]") === -1) name = name.slice(0, colon);
  if (name.endsWith(".")) name = name.slice(0, -1);
  return name;
}

/**
 * The decoded path of a request, or undefined when it could reach outside its publish: `.` or
 * `..` segments, backslashes, NUL bytes, encoded slashes, or broken percent-encoding.
 * @param {string} uri
 * @returns {string | undefined}
 */
export function safePath(uri) {
  if (uri.charAt(0) !== "/") return undefined;
  if (/%(2f|5c|00)/i.test(uri)) return undefined;
  let decoded;
  try {
    decoded = decodeURIComponent(uri);
  } catch (_error) {
    return undefined;
  }
  if (decoded.indexOf("\\") !== -1 || decoded.indexOf("\u0000") !== -1) return undefined;
  const segments = decoded.split("/");
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === "." || segments[i] === "..") return undefined;
  }
  return decoded;
}

/**
 * A decoded path as an object key under a publish, each segment encoded again.
 * @param {string} path
 * @returns {string}
 */
function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Routes a request: a response to send now, or the address of the file to fetch from the
 * bucket, `/sites/<siteId>/<deployId>/<path>`.
 *
 * Keys: `h:<hostname>` holds `<siteId>`, or `<siteId> <redirectHost>` when the hostname
 * redirects to the website's custom domain; `s:<siteId>` holds the live deploy.
 * @param {EdgeRequest} request
 * @param {Lookup} lookup
 * @returns {Promise<Routed>}
 */
export async function route(request, lookup) {
  const query = request.querystring ? `?${request.querystring}` : "";
  const entry = await lookup(`h:${normalizeHost(request.host)}`);
  if (!entry) return noWebsite();
  const parts = entry.split(" ");
  const siteId = parts[0];
  const redirectHost = parts[1];
  if (redirectHost) return permanentRedirect(`https://${redirectHost}${request.uri}${query}`);
  const deployId = await lookup(`s:${siteId}`);
  if (!deployId) return noWebsite();

  let path = safePath(request.uri);
  if (path === undefined) return noWebsite();
  const prefix = `/sites/${siteId}/${deployId}`;
  if (path === "/_redirects") return { kind: "fetch", uri: prefix + MISSING_FILE };
  if (path.endsWith("/")) {
    path += "index.html";
  } else {
    const name = path.slice(path.lastIndexOf("/") + 1);
    if (name.indexOf(".") === -1) return permanentRedirect(`${request.uri}/${query}`);
  }
  return { kind: "fetch", uri: prefix + encodePath(path) };
}
