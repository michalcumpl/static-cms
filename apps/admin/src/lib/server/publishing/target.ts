// Where published sites go (netlify-publishing design.md decision 1). One adapter so far:
// Netlify; another provider only needs another implementation of `PublishTarget`.

export interface CreatedSite {
  siteId: string;
  siteName: string;
  /** Always works, before and after a custom domain: `https://<name>.netlify.app`. */
  defaultUrl: string;
}

export interface PublishTarget {
  createSite(name: string): Promise<CreatedSite>;
  /** Uploads only the files the provider lacks and waits until the deploy is live. */
  deploy(siteId: string, files: ReadonlyMap<string, Uint8Array>): Promise<{ deployId: string }>;
  /** Makes an earlier deploy live again, without uploading anything. */
  restore(siteId: string, deployId: string): Promise<void>;
  connectDomain(siteId: string, domain: string, aliases: string[]): Promise<void>;
  disconnectDomain(siteId: string): Promise<void>;
  /** Whether the provider has issued the certificate for the site's custom domain. */
  certificateIssued(siteId: string): Promise<boolean>;
}

export type PublishErrorKind = "unauthorized" | "unreachable" | "name-taken" | "failed";

/** A provider failure, with a message an owner can read. */
export class PublishError extends Error {
  constructor(
    readonly kind: PublishErrorKind,
    message: string,
  ) {
    super(message);
  }
}
