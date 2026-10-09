// What Webmio hosting needs from the cloud (own-hosting design.md decisions 1, 2, 7 and 8): a
// bucket, the key-value store the edge routes by, and distribution tenants for custom domains.
// `webmio-aws.ts` implements it over the AWS SDK, `webmio-fake.ts` on a folder for tests.

export interface WebmioHostingConfig {
  bucket: string;
  kvsArn: string;
  distributionId: string;
  connectionGroupId: string;
  /** Free addresses are `<name>.<sitesDomain>`. */
  sitesDomain: string;
  /** Websites' CNAME targets are `<name>.<cnameDomain>`. */
  cnameDomain: string;
  region?: string;
}

/**
 * The server's Webmio hosting, or undefined when it has none (development, tests): then new
 * websites publish to Netlify as before.
 */
export function webmioHostingConfig(
  env: Record<string, string | undefined> = process.env,
): WebmioHostingConfig | undefined {
  const bucket = env.WEBMIO_HOSTING_BUCKET;
  const kvsArn = env.WEBMIO_HOSTING_KVS_ARN;
  const distributionId = env.WEBMIO_HOSTING_DISTRIBUTION_ID;
  const connectionGroupId = env.WEBMIO_HOSTING_CONNECTION_GROUP_ID;
  if (!bucket || !kvsArn || !distributionId || !connectionGroupId) return undefined;
  return {
    bucket,
    kvsArn,
    distributionId,
    connectionGroupId,
    sitesDomain: env.WEBMIO_SITES_DOMAIN || "webmio.site",
    cnameDomain: env.WEBMIO_CNAME_DOMAIN || "sites.webmio.net",
    ...(env.AWS_REGION ? { region: env.AWS_REGION } : {}),
  };
}

export interface ObjectMetadata {
  contentType: string;
  cacheControl: string;
}

/** A custom domain's certificate, as far as the member needs to know. */
export type CertificateState = "pending" | "issued" | "failed";

/**
 * Failures are thrown as `PublishError`: "unreachable" when the cloud can't be reached,
 * "domain-in-use" when another service holds a domain, "failed" otherwise.
 */
export interface HostingBackend {
  readonly sitesDomain: string;
  readonly cnameDomain: string;

  putObject(key: string, body: Uint8Array, metadata: ObjectMetadata): Promise<void>;
  /** Copies an object with its metadata; the bytes don't leave the bucket. */
  copyObject(from: string, to: string): Promise<void>;
  /** An object's bytes; undefined when there is none. */
  getObject(key: string): Promise<Uint8Array | undefined>;
  /** Deletes every object whose key starts with `prefix`. */
  deletePrefix(prefix: string): Promise<void>;
  /** The names of the folders and objects directly under `prefix` (which ends in `/`). */
  listNames(prefix: string): Promise<string[]>;

  /** A key of the edge's key-value store; undefined when it is missing. */
  getKey(key: string): Promise<string | undefined>;
  /** Puts and deletes keys in one write, which reaches the edge within seconds. */
  updateKeys(changes: { put?: Record<string, string>; delete?: string[] }): Promise<void>;

  /**
   * Serves `domain` through a new tenant with a certificate CloudFront requests from ACM. A
   * domain still held by a tenant of ours that is being deleted is taken over. Returns the
   * tenant's id, or undefined while the domain doesn't point at CloudFront yet: CloudFront
   * creates a tenant only for a domain whose DNS already leads to it.
   */
  createTenant(siteId: string, domain: string): Promise<string | undefined>;
  /**
   * The certificate's state. An issued certificate is attached to the tenant first, which makes
   * its domain active; "issued" means the domain is served.
   */
  certificateState(tenantId: string): Promise<CertificateState>;
  /** Requests a new certificate after the last request failed or expired. */
  renewCertificate(tenantId: string): Promise<void>;
  /**
   * Stops serving the tenant's domain and deletes the tenant once CloudFront allows it; until
   * then the disabled tenant holds the domain, and `createTenant` takes it over.
   */
  deleteTenant(tenantId: string): Promise<void>;
}
