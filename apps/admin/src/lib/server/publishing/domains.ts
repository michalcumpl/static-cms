import { resolve4, resolve6, resolveCname } from "node:dns/promises";
import { and, eq, ne } from "drizzle-orm";
import { type Said, said } from "$lib/i18n";
import type { Db } from "../db/index";
import { projectHosting } from "../db/schema";
import { type HostingEnv, type HostingProvider, targetFor, webmioBackend } from "./connection";
import { isBareDomain, normalizeDomain } from "./hostnames";
import { hostedSite, PublishError } from "./target";

// Custom domains (netlify-publishing design.md decision 7, own-hosting design.md decision 7).
// The hosting issues the certificate once the domain's DNS points at it; we tell the member
// which records to set. On Webmio hosting a bare domain is served at `www.`, which points at
// the website's own CNAME target. The bare domain points at the redirect server, which sends it
// on to `www.` (bare-domain-redirect design.md decision 5); without one, it is forwarded at the
// registrar.

/** Netlify's load balancer for bare domains with external DNS (design.md, Findings). */
export const NETLIFY_APEX_IP = "75.2.60.5";

export type DomainState = "waiting-for-dns" | "issuing-certificate" | "ready";
/** A bare domain's own state on Webmio hosting with a redirect server. */
export type ApexState = "waiting-for-dns" | "issuing-certificate" | "redirecting";

export interface DnsRecord {
  type: "A" | "CNAME";
  name: string;
  value: string;
}

/** DNS lookups, replaceable in tests. */
export const dns = { resolve4, resolve6, resolveCname };

/** The request that checks a bare domain's redirect, replaceable in tests. */
export const probe = { fetch: (url: string, init: RequestInit) => fetch(url, init) };

/** How long checking a bare domain waits for the redirect server, which may be issuing. */
const PROBE_TIMEOUT_MS = 15_000;

export { isBareDomain, normalizeDomain };

/** Where websites' CNAME targets live when the server has no Webmio hosting to say. */
const DEFAULT_CNAME_DOMAIN = "sites.webmio.net";

/** A website's own CNAME target on Webmio hosting: `<name>.sites.webmio.net`. */
export function cnameTarget(siteName: string, options: HostingEnv = {}): string {
  return `${siteName}.${webmioBackend(options)?.cnameDomain ?? DEFAULT_CNAME_DOMAIN}`;
}

/** The hostname a domain is served at: Webmio hosting serves a bare domain at `www.`. */
export function servedHost(provider: HostingProvider, domain: string): string {
  return provider === "webmio" && isBareDomain(domain) ? `www.${domain}` : domain;
}

export interface DomainInstructions {
  records: DnsRecord[];
  /** Webmio hosting, bare domain, no redirect server: where the registrar forwards it. */
  forwardTo: string | null;
}

/** The redirect server a bare domain on Webmio hosting points at; undefined when not. */
export function redirectAddressFor(
  provider: HostingProvider,
  domain: string,
  options: HostingEnv = {},
): string | undefined {
  if (provider !== "webmio" || !isBareDomain(domain)) return undefined;
  return webmioBackend(options)?.redirectAddress;
}

/**
 * The DNS records to set for a domain. On Webmio hosting a bare domain also gets an A record for
 * the redirect server, or without one, forwarding at the registrar.
 */
export function domainInstructions(
  provider: HostingProvider,
  domain: string,
  siteName: string,
  options: HostingEnv = {},
): DomainInstructions {
  if (provider === "webmio") {
    const host = servedHost(provider, domain);
    const records: DnsRecord[] = [
      { type: "CNAME", name: host, value: cnameTarget(siteName, options) },
    ];
    const address = redirectAddressFor(provider, domain, options);
    if (address) records.push({ type: "A", name: domain, value: address });
    return {
      records,
      forwardTo: isBareDomain(domain) && !address ? `https://${host}` : null,
    };
  }
  return { records: dnsRecords(domain, siteName), forwardTo: null };
}

/** Netlify's records: an A record for a bare domain, CNAME records to the site. */
export function dnsRecords(domain: string, siteName: string): DnsRecord[] {
  const target = `${siteName}.netlify.app`;
  return isBareDomain(domain)
    ? [
        { type: "A", name: domain, value: NETLIFY_APEX_IP },
        { type: "CNAME", name: `www.${domain}`, value: target },
      ]
    : [{ type: "CNAME", name: domain, value: target }];
}

export type DomainResult =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "not-published" | "taken" | "in-use" | "not-connected";
      message: Said;
    };

function hostingOf(db: Db, projectId: string) {
  return db.select().from(projectHosting).where(eq(projectHosting.projectId, projectId)).get();
}

export async function connectDomain(
  db: Db,
  projectId: string,
  input: string,
  options: HostingEnv = {},
): Promise<DomainResult> {
  const domain = normalizeDomain(input);
  if (!domain) {
    return {
      ok: false,
      reason: "invalid",
      message: said("server.domains.invalid"),
    };
  }
  const hosting = hostingOf(db, projectId);
  if (!hosting) {
    return {
      ok: false,
      reason: "not-published",
      message: said("server.domains.publishFirst"),
    };
  }
  const taken = db
    .select({ id: projectHosting.projectId })
    .from(projectHosting)
    .where(and(eq(projectHosting.domain, domain), ne(projectHosting.projectId, projectId)))
    .get();
  if (taken)
    return {
      ok: false,
      reason: "taken",
      message: said("server.domains.taken", { domain }),
    };
  const chosen = targetFor(db, projectId, options);
  if (!chosen.ok) {
    return {
      ok: false,
      reason: "not-connected",
      message:
        hosting.provider === "netlify" ? said("server.domains.notConnected") : chosen.message,
    };
  }
  if (hosting.domain && hosting.domain !== domain) await disconnectDomain(db, projectId, options);
  let domainTenantId: string | null;
  try {
    domainTenantId =
      (await chosen.value.target.connectDomain(
        hosting.siteId,
        domain,
        isBareDomain(domain) && hosting.provider === "netlify" ? [`www.${domain}`] : [],
      )) ?? null;
  } catch (error) {
    if (error instanceof PublishError && error.kind === "domain-in-use") {
      return { ok: false, reason: "in-use", message: error.said };
    }
    throw error;
  }
  const apexState = redirectAddressFor(hosting.provider, domain, options)
    ? ("waiting-for-dns" as const)
    : null;
  db.update(projectHosting)
    .set({
      domain,
      domainState: "waiting-for-dns",
      apexState,
      domainCheckedAt: new Date(),
      domainTenantId,
    })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return { ok: true };
}

export async function disconnectDomain(
  db: Db,
  projectId: string,
  options: HostingEnv = {},
): Promise<void> {
  const hosting = hostingOf(db, projectId);
  if (!hosting?.domain) return;
  const chosen = targetFor(db, projectId, options);
  if (chosen.ok) {
    const site = hostedSite(hosting);
    await chosen.value.target.disconnectDomain(hosting.siteId, site);
    // The free address serves the website itself again.
    await chosen.value.target.setRedirectHost?.(site, null);
  }
  db.update(projectHosting)
    .set({
      domain: null,
      domainState: null,
      apexState: null,
      domainCheckedAt: null,
      domainTenantId: null,
    })
    .where(eq(projectHosting.projectId, projectId))
    .run();
}

/**
 * Whether a bare domain is connected to a website on Webmio hosting, in any state: what the
 * redirect server asks before it gets the domain's certificate (bare-domain-redirect design.md
 * decision 4).
 */
export function bareDomainConnected(db: Db, input: string): boolean {
  const domain = normalizeDomain(input);
  if (!domain || !isBareDomain(domain)) return false;
  return (
    db
      .select({ id: projectHosting.projectId })
      .from(projectHosting)
      .where(and(eq(projectHosting.domain, domain), eq(projectHosting.provider, "webmio")))
      .get() !== undefined
  );
}

/** Whether the domain's DNS points at the site, as `domainInstructions` asks. */
async function dnsPointsAtSite(
  hosting: typeof projectHosting.$inferSelect & { domain: string },
  options: HostingEnv,
): Promise<boolean> {
  const { domain, siteName } = hosting;
  const names = async (host: string) =>
    (await dns.resolveCname(host)).map((name) => name.replace(/\.$/, "").toLowerCase());
  try {
    if (hosting.provider === "webmio") {
      // Only this website's own target counts, not another website's or CloudFront's own.
      const host = servedHost("webmio", domain);
      return (await names(host)).includes(cnameTarget(siteName, options));
    }
    if (isBareDomain(domain)) return (await dns.resolve4(domain)).includes(NETLIFY_APEX_IP);
    return (await names(domain)).includes(`${siteName}.netlify.app`);
  } catch {
    return false;
  }
}

/**
 * A bare domain's own state (bare-domain-redirect design.md decision 5): pointed only when its
 * addresses are exactly the redirect server's, then redirecting once `https://<domain>/` sends
 * visitors to `www.`. That request is also what makes the redirect server get the certificate.
 */
async function checkApex(domain: string, address: string): Promise<ApexState> {
  const v4 = await dns.resolve4(domain).catch(() => [] as string[]);
  const v6 = await dns.resolve6(domain).catch(() => [] as string[]);
  if (v4.length !== 1 || v4[0] !== address || v6.length > 0) return "waiting-for-dns";
  try {
    const response = await probe.fetch(`https://${domain}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    await response.body?.cancel();
    if (response.status === 301 && response.headers.get("location") === `https://www.${domain}/`)
      return "redirecting";
  } catch {
    // No certificate yet (the handshake fails while it is being issued) or no answer in time.
  }
  return "issuing-certificate";
}

/**
 * Checks DNS and the certificate, stores and returns the domain's state. On Webmio hosting the
 * free address redirects to the domain while it is ready. A bare domain with a redirect server
 * gets its own state too, which the domain's doesn't depend on.
 */
export async function checkDomain(
  db: Db,
  projectId: string,
  options: HostingEnv = {},
): Promise<DomainState | undefined> {
  const hosting = hostingOf(db, projectId);
  if (!hosting?.domain) return undefined;
  const chosen = targetFor(db, projectId, options);
  let site = hostedSite(hosting);
  let state: DomainState = "waiting-for-dns";
  if (await dnsPointsAtSite({ ...hosting, domain: hosting.domain }, options)) {
    // Webmio hosting: CloudFront creates the domain's tenant only once DNS leads to it.
    if (chosen.ok && hosting.provider === "webmio" && !hosting.domainTenantId) {
      const domainTenantId =
        (await chosen.value.target.connectDomain(hosting.siteId, hosting.domain, [])) ?? null;
      db.update(projectHosting)
        .set({ domainTenantId })
        .where(eq(projectHosting.projectId, projectId))
        .run();
      site = { ...site, domainRef: domainTenantId };
    }
    const issued = chosen.ok
      ? await chosen.value.target.certificateIssued(hosting.siteId, site)
      : false;
    state = issued ? "ready" : "issuing-certificate";
  }
  const wasReady = hosting.domainState === "ready";
  if (chosen.ok && wasReady !== (state === "ready")) {
    await chosen.value.target.setRedirectHost?.(
      site,
      state === "ready" ? servedHost(hosting.provider, hosting.domain) : null,
    );
  }
  const address = redirectAddressFor(hosting.provider, hosting.domain, options);
  const apexState = address ? await checkApex(hosting.domain, address) : null;
  db.update(projectHosting)
    .set({ domainState: state, apexState, domainCheckedAt: new Date() })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return state;
}
