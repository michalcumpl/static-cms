import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

// Fetching a public website without letting it reach our own network (site-import spec, "Safe
// fetching"; design decision 4). Every connection's address is checked when the host name is
// resolved, and the socket connects to the checked address, so a second answer can't swap it.

export type FetchKind = "page" | "image" | "text";

/** The largest response of each kind, counted after decompression. */
export const MAX_BYTES: Record<FetchKind, number> = {
  page: 5 * 1024 * 1024,
  image: 20 * 1024 * 1024,
  text: 5 * 1024 * 1024,
};
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_REDIRECTS = 5;

const ACCEPT: Record<FetchKind, string> = {
  page: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  image: "image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5",
  text: "text/css,text/plain,application/xml,*/*;q=0.1",
};
/** A current desktop browser: some firewalls refuse anything else (import-mapping.md, "Fetching"). */
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

export type FetchFailure = "blocked" | "timeout" | "too-large" | "redirects" | "network" | "status";

export type FetchResult =
  | { ok: true; url: string; status: number; contentType: string; body: Uint8Array }
  | { ok: false; url: string; reason: FetchFailure; status?: number };

/** Resolves a host name to all its addresses; `dns.lookup` unless a test passes its own. */
export type Resolver = (hostname: string) => Promise<LookupAddress[]>;

export interface SafeFetchOptions {
  /**
   * Origins (`host:port`) fetched without the address checks: the tests' local server. Only ever
   * a function argument, never read from a request or the environment.
   */
  allowHosts?: ReadonlySet<string>;
  resolver?: Resolver;
  /** The whole import's deadline, besides each request's own timeout. */
  signal?: AbortSignal;
}

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

/** Whether an IP address is on the public internet. IPv4 inside IPv6 is judged as IPv4. */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  if (family === 6) {
    const mapped = /^::ffff:(?:0:)?((?:\d{1,3}\.){3}\d{1,3})$/i.exec(address)?.[1];
    if (mapped) return isPublicAddress(mapped);
    const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
    if (hex) {
      const n = (Number.parseInt(hex[1] ?? "0", 16) << 16) | Number.parseInt(hex[2] ?? "0", 16);
      return isPublicAddress([24, 16, 8, 0].map((s) => (n >>> s) & 255).join("."));
    }
    return !blocked.check(address, "ipv6");
  }
  return !blocked.check(address, "ipv4");
}

const systemResolver: Resolver = (hostname) =>
  new Promise((resolve, reject) =>
    dnsLookup(hostname, { all: true }, (error, addresses) =>
      error ? reject(error) : resolve(addresses),
    ),
  );

class BlockedAddress extends Error {}

/** A `lookup` for `http.request` that refuses names resolving to any non-public address. */
function checkedLookup(resolver: Resolver): LookupFunction {
  return (hostname, options, callback) => {
    resolver(hostname).then(
      (addresses) => {
        if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
          callback(new BlockedAddress(hostname), "", 4);
          return;
        }
        const wanted = options.family === 4 || options.family === 6 ? options.family : undefined;
        const usable = addresses.filter((a) => !wanted || a.family === wanted);
        const chosen = usable[0] ?? addresses[0];
        if (options.all) callback(null, usable as never);
        else callback(null, chosen?.address ?? "", chosen?.family ?? 4);
      },
      (error: NodeJS.ErrnoException) => callback(error, "", 4),
    );
  };
}

function decoded(response: IncomingMessage): NodeJS.ReadableStream {
  switch ((response.headers["content-encoding"] ?? "").toLowerCase()) {
    case "gzip":
    case "x-gzip":
      return response.pipe(createGunzip());
    case "br":
      return response.pipe(createBrotliDecompress());
    case "deflate":
      return response.pipe(createInflate());
    default:
      return response;
  }
}

/** One request, no redirects followed: the response, or why there is none. */
function once(
  url: URL,
  kind: FetchKind,
  options: SafeFetchOptions,
): Promise<FetchResult | { redirect: string }> {
  const origin = `${url.hostname}:${url.port || (url.protocol === "https:" ? 443 : 80)}`;
  const allowed = options.allowHosts?.has(origin) ?? false;
  const fail = (reason: FetchFailure, status?: number): FetchResult => ({
    ok: false,
    url: url.href,
    reason,
    status,
  });
  if (url.protocol !== "http:" && url.protocol !== "https:")
    return Promise.resolve(fail("blocked"));
  if (!allowed) {
    if (url.port !== "" && url.port !== "80" && url.port !== "443")
      return Promise.resolve(fail("blocked"));
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && !isPublicAddress(host)) return Promise.resolve(fail("blocked"));
  }
  const signals = [
    AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    ...(options.signal ? [options.signal] : []),
  ];
  const signal = AbortSignal.any(signals);
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve) => {
    const req = request(
      url,
      {
        method: "GET",
        signal,
        lookup: allowed ? undefined : checkedLookup(options.resolver ?? systemResolver),
        headers: {
          "User-Agent": USER_AGENT,
          Accept: ACCEPT[kind],
          "Accept-Language": "*",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          resolve({ redirect: new URL(location, url).href });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          resolve(fail("status", status));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        const stream = decoded(response);
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES[kind]) {
            req.destroy();
            resolve(fail("too-large"));
            return;
          }
          chunks.push(chunk);
        });
        stream.on("end", () =>
          resolve({
            ok: true,
            url: url.href,
            status,
            contentType: String(response.headers["content-type"] ?? "").toLowerCase(),
            body: new Uint8Array(Buffer.concat(chunks)),
          }),
        );
        stream.on("error", () => resolve(fail(signal.aborted ? "timeout" : "network")));
      },
    );
    req.on("error", (error) =>
      resolve(
        fail(
          error instanceof BlockedAddress ||
            (error as { cause?: unknown }).cause instanceof BlockedAddress
            ? "blocked"
            : signal.aborted
              ? "timeout"
              : "network",
        ),
      ),
    );
    req.end();
  });
}

/** Fetches an address safely, following up to five redirects, each checked again. */
export async function safeFetch(
  address: string,
  kind: FetchKind,
  options: SafeFetchOptions = {},
): Promise<FetchResult> {
  let url: URL;
  try {
    url = new URL(address);
  } catch {
    return { ok: false, url: address, reason: "blocked" };
  }
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const result = await once(url, kind, options);
    if (!("redirect" in result)) return result;
    url = new URL(result.redirect);
  }
  return { ok: false, url: url.href, reason: "redirects" };
}
