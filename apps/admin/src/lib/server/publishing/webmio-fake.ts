// Webmio hosting on a folder, for tests and the end-to-end runs (own-hosting design.md decision
// 12). Objects are files under `objects/`; the key-value store, tenants and test switches live in
// `state.json`, so the end-to-end site server can serve what the admin publishes. Every operation
// is synchronous on disk, so concurrent calls in one process can't interleave a write.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { resolveMissing } from "@webmio/edge/not-found";
import { route } from "@webmio/edge/router";
import { said } from "$lib/i18n";
import { PublishError } from "./target";
import type { CertificateState, HostingBackend, ObjectMetadata } from "./webmio-backend";

interface FakeTenant {
  siteId: string;
  domain: string;
  enabled: boolean;
  certificate: CertificateState;
}

interface FakeState {
  keys: Record<string, string>;
  metadata: Record<string, ObjectMetadata>;
  tenants: Record<string, FakeTenant>;
  nextTenant: number;
  /** Domains another service holds. */
  heldElsewhere: string[];
  /** Certificates CloudFront would issue once DNS points at it, by domain. */
  certificates: Record<string, CertificateState>;
  /** Domains whose DNS doesn't lead to CloudFront yet: no tenant can be created for them. */
  notPointing: string[];
  /** Whether disabled tenants stay until CloudFront finishes disabling them. */
  slowTenantDeletion: boolean;
  unreachable: boolean;
  /** End-to-end runs: whether the server has Webmio hosting at all, switched per test. */
  disabled: boolean;
  /** The deploy each website was on before its last switch (`s:<siteId>` → deploy). */
  previous: Record<string, string>;
  /** While on, the edge keeps serving each website's previous deploy, as if a switch hung. */
  stale: boolean;
  /** End-to-end runs: the redirect server's address, switched per test like `disabled`. */
  redirectAddress?: string;
}

export interface FakeHosting extends HostingBackend {
  readonly dir: string;
  /** The key-value store as it is now. */
  keys(): Record<string, string>;
  /** Every object key, sorted. */
  objectKeys(prefix?: string): string[];
  tenants(): ({ id: string } & FakeTenant)[];
  setCertificate(domain: string, state: CertificateState): void;
  holdElsewhere(domain: string): void;
  /** Whether the domain's DNS leads to CloudFront, so a tenant can be created (default yes). */
  setPointing(domain: string, pointing: boolean): void;
  setSlowTenantDeletion(slow: boolean): void;
  setUnreachable(unreachable: boolean): void;
  /** Makes uploads of matching keys fail, until called with undefined. */
  failUploads(match: RegExp | undefined): void;
  /** While on, websites keep serving the deploy they had before their last switch. */
  serveStale(stale: boolean): void;
}

const EMPTY: FakeState = {
  keys: {},
  metadata: {},
  tenants: {},
  nextTenant: 1,
  heldElsewhere: [],
  certificates: {},
  notPointing: [],
  slowTenantDeletion: false,
  unreachable: false,
  disabled: false,
  previous: {},
  stale: false,
};

const statePath = (dir: string) => join(dir, "state.json");
const objectPath = (dir: string, key: string) => join(dir, "objects", ...key.split("/"));

function readState(dir: string): FakeState {
  const path = statePath(dir);
  return existsSync(path)
    ? { ...EMPTY, ...(JSON.parse(readFileSync(path, "utf8")) as Partial<FakeState>) }
    : structuredClone(EMPTY);
}

function listFiles(root: string, prefix = ""): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listFiles(join(root, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

/** Whether the fake in `dir` stands for Webmio hosting now (end-to-end runs switch it). */
export function fakeHostingEnabled(dir: string): boolean {
  return !readState(dir).disabled;
}

/**
 * Empties the fake in `dir` and switches Webmio hosting on or off: the end-to-end tests start
 * each test without it, so the Netlify flows run as on a server that has none.
 */
export function resetFakeHosting(
  dir: string,
  enabled: boolean,
  options: { redirectAddress?: string } = {},
): void {
  rmSync(join(dir, "objects"), { recursive: true, force: true });
  mkdirSync(join(dir, "objects"), { recursive: true });
  writeFileSync(
    statePath(dir),
    JSON.stringify({ ...EMPTY, disabled: !enabled, ...options }, null, 2),
  );
}

export function fakeHosting(
  dir: string,
  domains: { sitesDomain?: string; cnameDomain?: string; redirectAddress?: string } = {},
): FakeHosting {
  mkdirSync(join(dir, "objects"), { recursive: true });
  let failing: RegExp | undefined;

  function update<T>(change: (state: FakeState) => T): T {
    const state = readState(dir);
    const result = change(state);
    writeFileSync(statePath(dir), JSON.stringify(state, null, 2));
    return result;
  }

  function reachable(): FakeState {
    const state = readState(dir);
    if (state.unreachable) {
      throw new PublishError("unreachable", said("server.webmio.unreachable"));
    }
    return state;
  }

  const redirectAddress = domains.redirectAddress ?? readState(dir).redirectAddress;

  return {
    dir,
    sitesDomain: domains.sitesDomain ?? "webmio.site",
    cnameDomain: domains.cnameDomain ?? "sites.webmio.net",
    ...(redirectAddress ? { redirectAddress } : {}),

    async putObject(key, body, metadata) {
      reachable();
      if (failing?.test(key)) {
        throw new PublishError(
          "failed",
          said("server.webmio.failed", {
            action: said("server.webmio.actions.upload", { path: key }),
            detail: "fake failure",
          }),
        );
      }
      const path = objectPath(dir, key);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, body);
      update((state) => {
        state.metadata[key] = metadata;
      });
    },

    async copyObject(from, to) {
      reachable();
      const path = objectPath(dir, to);
      mkdirSync(dirname(path), { recursive: true });
      copyFileSync(objectPath(dir, from), path);
      update((state) => {
        const metadata = state.metadata[from];
        if (metadata) state.metadata[to] = metadata;
      });
    },

    async getObject(key) {
      reachable();
      const path = objectPath(dir, key);
      return existsSync(path) ? new Uint8Array(readFileSync(path)) : undefined;
    },

    async deletePrefix(prefix) {
      reachable();
      const keys = listFiles(join(dir, "objects")).filter((key) => key.startsWith(prefix));
      for (const key of keys) rmSync(objectPath(dir, key));
      update((state) => {
        for (const key of keys) delete state.metadata[key];
      });
    },

    async listNames(prefix) {
      reachable();
      const names = new Set<string>();
      for (const key of listFiles(join(dir, "objects"))) {
        if (key.startsWith(prefix)) names.add(key.slice(prefix.length).split("/")[0] as string);
      }
      return [...names].sort();
    },

    async fetchSite(url, init) {
      const address = new URL(url);
      const answer = await serveFake(dir, {
        host: address.host,
        uri: address.pathname,
        querystring: address.search.slice(1),
      });
      const head = (init?.method ?? "GET").toUpperCase() === "HEAD";
      return new Response(head || answer.status === 301 ? null : answer.body.slice(), {
        status: answer.status,
        headers: { ...answer.headers, "content-length": String(answer.body.byteLength) },
      });
    },

    async getKey(key) {
      return reachable().keys[key];
    },

    async updateKeys(changes) {
      reachable();
      update((state) => {
        for (const [key, value] of Object.entries(changes.put ?? {})) {
          const old = state.keys[key];
          if (key.startsWith("s:") && old !== undefined && old !== value) state.previous[key] = old;
          state.keys[key] = value;
        }
        for (const key of changes.delete ?? []) {
          const old = state.keys[key];
          if (key.startsWith("s:") && old !== undefined) state.previous[key] = old;
          delete state.keys[key];
        }
      });
    },

    async createTenant(siteId, domain) {
      const current = reachable();
      if (current.heldElsewhere.includes(domain)) {
        throw new PublishError("domain-in-use", said("server.webmio.domainInUse", { domain }));
      }
      if (current.notPointing.includes(domain)) return undefined;
      return update((state) => {
        const certificate = state.certificates[domain] ?? "pending";
        const held = Object.entries(state.tenants).find(([, tenant]) => tenant.domain === domain);
        if (held) {
          Object.assign(held[1], { siteId, enabled: true, certificate });
          return held[0];
        }
        const id = `dt_${state.nextTenant++}`;
        state.tenants[id] = { siteId, domain, enabled: true, certificate };
        return id;
      });
    },

    async certificateState(tenantId) {
      const state = reachable();
      const tenant = state.tenants[tenantId];
      return tenant ? (state.certificates[tenant.domain] ?? tenant.certificate) : "failed";
    },

    async renewCertificate(tenantId) {
      reachable();
      update((state) => {
        const tenant = state.tenants[tenantId];
        if (tenant) tenant.certificate = state.certificates[tenant.domain] ?? "pending";
      });
    },

    async deleteTenant(tenantId) {
      reachable();
      update((state) => {
        const tenant = state.tenants[tenantId];
        if (!tenant) return;
        if (state.slowTenantDeletion) tenant.enabled = false;
        else delete state.tenants[tenantId];
      });
    },

    keys: () => readState(dir).keys,
    objectKeys: (prefix = "") =>
      listFiles(join(dir, "objects"))
        .filter((key) => key.startsWith(prefix))
        .sort(),
    tenants: () =>
      Object.entries(readState(dir).tenants).map(([id, tenant]) => ({ id, ...tenant })),
    setCertificate: (domain, state) =>
      update((s) => {
        s.certificates[domain] = state;
      }),
    holdElsewhere: (domain) =>
      update((s) => {
        s.heldElsewhere.push(domain);
      }),
    setPointing: (domain, pointing) =>
      update((s) => {
        s.notPointing = s.notPointing.filter((name) => name !== domain);
        if (!pointing) s.notPointing.push(domain);
      }),
    setSlowTenantDeletion: (slow) =>
      update((s) => {
        s.slowTenantDeletion = slow;
      }),
    setUnreachable: (unreachable) =>
      update((s) => {
        s.unreachable = unreachable;
      }),
    failUploads(match) {
      failing = match;
    },
    serveStale: (stale) =>
      update((s) => {
        s.stale = stale;
      }),
  };
}

export interface FakeResponse {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

/**
 * What a visitor gets from the fake hosting, through the same router and not-found handler
 * as the edge: the router picks the file, and a missing file gets the publish's redirect or
 * 404 page.
 */
export async function serveFake(
  dir: string,
  request: { host: string; uri: string; querystring?: string },
): Promise<FakeResponse> {
  const state = readState(dir);
  const routed = await route(
    { host: request.host, uri: request.uri, querystring: request.querystring ?? "" },
    // A stale edge still has each website's deploy from before its last switch.
    async (key) =>
      state.stale && key.startsWith("s:") && key in state.previous
        ? state.previous[key]
        : state.keys[key],
  );
  const text = (body: string | undefined) => new TextEncoder().encode(body ?? "");
  if (routed.kind === "respond") {
    return { status: routed.status, headers: routed.headers, body: text(routed.body) };
  }
  const key = decodeURIComponent(routed.uri.slice(1));
  const path = objectPath(dir, key);
  if (existsSync(path)) {
    const metadata = state.metadata[key];
    return {
      status: 200,
      headers: metadata
        ? { "content-type": metadata.contentType, "cache-control": metadata.cacheControl }
        : {},
      body: new Uint8Array(readFileSync(path)),
    };
  }
  const missing = await resolveMissing({
    uri: routed.uri,
    read: async (objectKey) => {
      const file = objectPath(dir, objectKey);
      return existsSync(file) ? readFileSync(file, "utf8") : undefined;
    },
  });
  return missing
    ? { status: missing.status, headers: missing.headers, body: text(missing.body) }
    : { status: 404, headers: {}, body: text("") };
}
