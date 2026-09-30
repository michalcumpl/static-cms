import { resolve4, resolveCname } from "node:dns/promises";
import { and, eq, ne } from "drizzle-orm";
import type { Db } from "../db/index";
import { projectHosting, projects } from "../db/schema";
import { type NetlifyEnv, publishTarget } from "./connection";

// Custom domains (netlify-publishing design.md decision 7). Netlify issues the certificate
// once the domain's DNS points at it; we only tell the owner which records to set.

/** Netlify's load balancer for bare domains with external DNS (design.md, Findings). */
export const NETLIFY_APEX_IP = "75.2.60.5";

export type DomainState = "waiting-for-dns" | "issuing-certificate" | "ready";

export interface DnsRecord {
  type: "A" | "CNAME";
  name: string;
  value: string;
}

/** DNS lookups, replaceable in tests. */
export const dns = { resolve4, resolveCname };

const HOSTNAME = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** A domain as typed, lowercased and without a trailing dot; undefined when it isn't one. */
export function normalizeDomain(input: string): string | undefined {
  const domain = input.trim().toLowerCase().replace(/\.$/, "");
  return HOSTNAME.test(domain) ? domain : undefined;
}

/** A bare domain (`anideti.cz`) gets `www.` alongside; a subdomain stands alone. */
export function isBareDomain(domain: string): boolean {
  return domain.split(".").length === 2;
}

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
      reason: "invalid" | "not-published" | "taken" | "not-connected";
      message: string;
    };

function hostingOf(db: Db, projectId: string) {
  return db.select().from(projectHosting).where(eq(projectHosting.projectId, projectId)).get();
}

function workspaceOf(db: Db, projectId: string): string {
  return (
    db.select({ id: projects.workspaceId }).from(projects).where(eq(projects.id, projectId)).get()
      ?.id ?? ""
  );
}

export async function connectDomain(
  db: Db,
  projectId: string,
  input: string,
  options: NetlifyEnv = {},
): Promise<DomainResult> {
  const domain = normalizeDomain(input);
  if (!domain) {
    return {
      ok: false,
      reason: "invalid",
      message: "Enter a domain name only, such as anideti.cz or web.anideti.cz.",
    };
  }
  const hosting = hostingOf(db, projectId);
  if (!hosting) {
    return {
      ok: false,
      reason: "not-published",
      message: "Publish the site once before connecting a domain.",
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
      message: `${domain} is already connected to another site.`,
    };
  const connection = publishTarget(db, workspaceOf(db, projectId), options);
  if (!connection) {
    return {
      ok: false,
      reason: "not-connected",
      message: "This workspace isn't connected to Netlify.",
    };
  }
  await connection.target.connectDomain(
    hosting.siteId,
    domain,
    isBareDomain(domain) ? [`www.${domain}`] : [],
  );
  db.update(projectHosting)
    .set({ domain, domainState: "waiting-for-dns", domainCheckedAt: new Date() })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return { ok: true };
}

export async function disconnectDomain(
  db: Db,
  projectId: string,
  options: NetlifyEnv = {},
): Promise<void> {
  const hosting = hostingOf(db, projectId);
  if (!hosting?.domain) return;
  const connection = publishTarget(db, workspaceOf(db, projectId), options);
  if (connection) await connection.target.disconnectDomain(hosting.siteId);
  db.update(projectHosting)
    .set({ domain: null, domainState: null, domainCheckedAt: null })
    .where(eq(projectHosting.projectId, projectId))
    .run();
}

/** Whether the domain's DNS points at the site, as `dnsRecords` asks. */
async function dnsPointsAtSite(domain: string, siteName: string): Promise<boolean> {
  try {
    if (isBareDomain(domain)) return (await dns.resolve4(domain)).includes(NETLIFY_APEX_IP);
    return (await dns.resolveCname(domain)).some(
      (name) => name.replace(/\.$/, "") === `${siteName}.netlify.app`,
    );
  } catch {
    return false;
  }
}

/** Checks DNS and the certificate, stores and returns the domain's state. */
export async function checkDomain(
  db: Db,
  projectId: string,
  options: NetlifyEnv = {},
): Promise<DomainState | undefined> {
  const hosting = hostingOf(db, projectId);
  if (!hosting?.domain) return undefined;
  let state: DomainState = "waiting-for-dns";
  if (await dnsPointsAtSite(hosting.domain, hosting.siteName)) {
    const connection = publishTarget(db, workspaceOf(db, projectId), options);
    const issued = connection ? await connection.target.certificateIssued(hosting.siteId) : false;
    state = issued ? "ready" : "issuing-certificate";
  }
  db.update(projectHosting)
    .set({ domainState: state, domainCheckedAt: new Date() })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return state;
}
