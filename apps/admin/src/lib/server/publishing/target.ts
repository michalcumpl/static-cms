import { type Said, sayIn } from "$lib/i18n";

// Where published sites go (netlify-publishing design.md decision 1, own-hosting design.md
// decision 9). Two adapters: Webmio hosting (`webmio.ts`) and Netlify (`netlify.ts`). The
// optional parts are Webmio hosting's; Netlify keeps every deploy and redirects nothing itself.

export interface CreatedSite {
  siteId: string;
  siteName: string;
  /** Always works, before and after a custom domain: `https://<name>.webmio.site`. */
  defaultUrl: string;
}

/** What `project_hosting` records of a site, for the adapters that need more than its id. */
export interface HostedSite {
  siteId: string;
  siteName: string;
  domain: string | null;
  /** The provider's reference for the custom domain (Webmio hosting: its CloudFront tenant). */
  domainRef: string | null;
}

/** A `project_hosting` row as the adapters see it. */
export function hostedSite(row: {
  siteId: string;
  siteName: string;
  domain: string | null;
  domainTenantId: string | null;
}): HostedSite {
  return {
    siteId: row.siteId,
    siteName: row.siteName,
    domain: row.domain,
    domainRef: row.domainTenantId,
  };
}

export interface PublishTarget {
  createSite(name: string): Promise<CreatedSite>;
  /** Uploads only the files the provider lacks and waits until the deploy is live. */
  deploy(siteId: string, files: ReadonlyMap<string, Uint8Array>): Promise<{ deployId: string }>;
  /** Makes an earlier deploy live again, without uploading anything. */
  restore(siteId: string, deployId: string): Promise<void>;
  /** Connects a domain; returns the provider's reference for it, if it has one. */
  connectDomain(siteId: string, domain: string, aliases: string[]): Promise<string | undefined>;
  disconnectDomain(siteId: string, site?: HostedSite): Promise<void>;
  /** Deletes the site with its deploys and domain (project-deletion decision 3). */
  deleteSite(siteId: string, site?: HostedSite): Promise<void>;
  /** Whether the provider has issued the certificate for the site's custom domain. */
  certificateIssued(siteId: string, site?: HostedSite): Promise<boolean>;
  /** The hostname a domain is served at: Webmio hosting serves a bare domain at `www.`. */
  servedHost?(domain: string): string;
  /** Points the free address at the custom domain (or, with null, back at the site). */
  setRedirectHost?(site: HostedSite, host: string | null): Promise<void>;
  /** Deletes the files of every deploy but `keep`; the live deploy is always kept. */
  prune?(siteId: string, keep: readonly string[]): Promise<void>;
  /**
   * Fetches from the live website, to verify a publish (safe-publishing design.md decision 4);
   * the global `fetch` when the target has no fake to answer instead.
   */
  fetchLive?(url: string, init?: RequestInit): Promise<Response>;
  /**
   * Takes a website whose first publish failed offline again (design.md decision 5): its
   * address answers as before the publish. Returns whether the site itself is gone, so its
   * hosting record goes too.
   */
  takeOffline?(siteId: string, site: HostedSite): Promise<{ siteDeleted: boolean }>;
}

export type PublishErrorKind =
  | "unauthorized"
  | "unreachable"
  | "name-taken"
  | "domain-in-use"
  | "failed";

/** A provider failure, with a message an owner can read in their language (`said`). */
export class PublishError extends Error {
  constructor(
    readonly kind: PublishErrorKind,
    readonly said: Said,
  ) {
    super(sayIn("en", said));
  }
}
