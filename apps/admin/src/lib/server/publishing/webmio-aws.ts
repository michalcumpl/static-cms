// Webmio hosting over the AWS SDK (own-hosting design.md decisions 2, 7 and 8). Credentials come
// from the SDK's default chain and never pass through this code.
import {
  CloudFrontClient,
  CreateDistributionTenantCommand,
  DeleteDistributionTenantCommand,
  GetDistributionTenantByDomainCommand,
  GetDistributionTenantCommand,
  GetManagedCertificateDetailsCommand,
  UpdateDistributionTenantCommand,
} from "@aws-sdk/client-cloudfront";
import {
  CloudFrontKeyValueStoreClient,
  DescribeKeyValueStoreCommand,
  GetKeyCommand,
  UpdateKeysCommand,
} from "@aws-sdk/client-cloudfront-keyvaluestore";
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
// Registers the SigV4a signer the key-value store's API requires.
import "@aws-sdk/signature-v4a";
import { type MessageKey, said } from "$lib/i18n";
import { PublishError } from "./target";
import type {
  CertificateState,
  HostingBackend,
  ObjectMetadata,
  WebmioHostingConfig,
} from "./webmio-backend";

type Action = keyof typeof import("../../i18n/en").en.server.webmio.actions;

interface AwsError {
  name?: string;
  message?: string;
  $metadata?: { httpStatusCode?: number };
}

const statusOf = (error: unknown) => (error as AwsError).$metadata?.httpStatusCode;
const nameOf = (error: unknown) => (error as AwsError).name ?? "";
const messageOf = (error: unknown) => (error as AwsError).message ?? "";

/**
 * An SDK failure as a `PublishError`: no answer or a server error means the hosting service
 * couldn't be reached; any other refusal names what couldn't be done.
 */
export function hostingError(
  error: unknown,
  action: Action,
  params: Record<string, string> = {},
): PublishError {
  if (error instanceof PublishError) return error;
  const status = statusOf(error);
  if (status === undefined || status >= 500) {
    return new PublishError("unreachable", said("server.webmio.unreachable"));
  }
  const { name = "Error", message = "" } = error as AwsError;
  return new PublishError(
    "failed",
    said("server.webmio.failed", {
      action: said(`server.webmio.actions.${action}` as MessageKey, params),
      detail: `${status} ${name}${message ? `: ${message.slice(0, 200)}` : ""}`,
    }),
  );
}

/** An object key as `CopySource` wants it: `<bucket>/<key>`, each segment URL-encoded. */
export function copySource(bucket: string, key: string): string {
  return `${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** A CloudFront tenant name for a website's domain: letters, digits, dashes and dots. */
export function tenantName(siteId: string, domain: string): string {
  return `${siteId}-${domain}`
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
    .slice(0, 128);
}

const CERTIFICATE_STATES: Record<string, CertificateState> = {
  issued: "issued",
  "pending-validation": "pending",
};

export function awsHosting(config: WebmioHostingConfig): HostingBackend {
  const region = config.region ? { region: config.region } : {};
  const s3 = new S3Client(region);
  // CloudFront and its key-value store are global; their API lives in us-east-1.
  const cloudfront = new CloudFrontClient({ region: "us-east-1" });
  const kvs = new CloudFrontKeyValueStoreClient({ region: "us-east-1" });
  const Bucket = config.bucket;

  async function tenant(id: string) {
    const result = await cloudfront.send(new GetDistributionTenantCommand({ Identifier: id }));
    const found = result.DistributionTenant;
    if (!found || !result.ETag) throw new Error(`Tenant ${id} has no details`);
    return { tenant: found, etag: result.ETag };
  }

  const certificateRequest = (domain: string) => ({
    ValidationTokenHost: "cloudfront" as const,
    PrimaryDomainName: domain,
  });

  /** Takes over a disabled tenant of ours that still holds the domain. */
  async function takeOver(domain: string): Promise<string | undefined> {
    const held = await cloudfront.send(
      new GetDistributionTenantByDomainCommand({ Domain: domain }),
    );
    const id = held.DistributionTenant?.Id;
    if (!id || held.DistributionTenant?.DistributionId !== config.distributionId) return undefined;
    const { etag } = await tenant(id);
    await cloudfront.send(
      new UpdateDistributionTenantCommand({
        Id: id,
        IfMatch: etag,
        Enabled: true,
        Domains: [{ Domain: domain }],
        ManagedCertificateRequest: certificateRequest(domain),
      }),
    );
    return id;
  }

  return {
    sitesDomain: config.sitesDomain,
    cnameDomain: config.cnameDomain,
    ...(config.redirectAddress ? { redirectAddress: config.redirectAddress } : {}),

    async putObject(key, body: Uint8Array, metadata: ObjectMetadata) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket,
            Key: key,
            Body: body,
            ContentType: metadata.contentType,
            CacheControl: metadata.cacheControl,
          }),
        );
      } catch (error) {
        throw hostingError(error, "upload", { path: key });
      }
    },

    async copyObject(from, to) {
      try {
        await s3.send(
          new CopyObjectCommand({
            Bucket,
            Key: to,
            CopySource: copySource(Bucket, from),
            MetadataDirective: "COPY",
          }),
        );
      } catch (error) {
        throw hostingError(error, "upload", { path: to });
      }
    },

    async getObject(key) {
      try {
        const object = await s3.send(new GetObjectCommand({ Bucket, Key: key }));
        return object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
      } catch (error) {
        if (nameOf(error) === "NoSuchKey" || statusOf(error) === 404) return undefined;
        throw hostingError(error, "readFile", { path: key });
      }
    },

    async deletePrefix(prefix) {
      try {
        let token: string | undefined;
        do {
          const page = await s3.send(
            new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken: token }),
          );
          const keys = (page.Contents ?? []).flatMap((object) =>
            object.Key ? [{ Key: object.Key }] : [],
          );
          if (keys.length > 0) {
            await s3.send(
              new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys, Quiet: true } }),
            );
          }
          token = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (token);
      } catch (error) {
        throw hostingError(error, "deleteFiles");
      }
    },

    async listNames(prefix) {
      try {
        const names: string[] = [];
        let token: string | undefined;
        do {
          const page = await s3.send(
            new ListObjectsV2Command({
              Bucket,
              Prefix: prefix,
              Delimiter: "/",
              ContinuationToken: token,
            }),
          );
          for (const folder of page.CommonPrefixes ?? []) {
            if (folder.Prefix) names.push(folder.Prefix.slice(prefix.length, -1));
          }
          for (const object of page.Contents ?? []) {
            if (object.Key) names.push(object.Key.slice(prefix.length));
          }
          token = page.IsTruncated ? page.NextContinuationToken : undefined;
        } while (token);
        return names;
      } catch (error) {
        throw hostingError(error, "listFiles");
      }
    },

    fetchSite: (url, init) => fetch(url, init),

    async getKey(key) {
      try {
        const result = await kvs.send(new GetKeyCommand({ KvsARN: config.kvsArn, Key: key }));
        return result.Value;
      } catch (error) {
        if (nameOf(error) === "ResourceNotFoundException") return undefined;
        throw hostingError(error, "readKey");
      }
    },

    async updateKeys(changes) {
      const Puts = Object.entries(changes.put ?? {}).map(([Key, Value]) => ({ Key, Value }));
      const Deletes = (changes.delete ?? []).map((Key) => ({ Key }));
      if (Puts.length === 0 && Deletes.length === 0) return;
      // Writes need the store's current ETag; another write in between means one more try.
      for (let attempt = 1; ; attempt++) {
        try {
          const store = await kvs.send(new DescribeKeyValueStoreCommand({ KvsARN: config.kvsArn }));
          await kvs.send(
            new UpdateKeysCommand({
              KvsARN: config.kvsArn,
              IfMatch: store.ETag,
              ...(Puts.length > 0 ? { Puts } : {}),
              ...(Deletes.length > 0 ? { Deletes } : {}),
            }),
          );
          return;
        } catch (error) {
          if (nameOf(error) === "ConflictException" && attempt < 3) continue;
          throw hostingError(error, "writeKeys");
        }
      }
    },

    async createTenant(siteId, domain) {
      try {
        const created = await cloudfront.send(
          new CreateDistributionTenantCommand({
            DistributionId: config.distributionId,
            ConnectionGroupId: config.connectionGroupId,
            Name: tenantName(siteId, domain),
            Domains: [{ Domain: domain }],
            Enabled: true,
            ManagedCertificateRequest: certificateRequest(domain),
          }),
        );
        const id = created.DistributionTenant?.Id;
        if (!id) throw new Error("CloudFront returned no tenant id");
        return id;
      } catch (error) {
        if (nameOf(error) === "CNAMEAlreadyExists" || nameOf(error) === "EntityAlreadyExists") {
          const id = await takeOver(domain).catch((cause: unknown) => {
            throw hostingError(cause, "connectDomain");
          });
          if (id) return id;
          throw new PublishError("domain-in-use", said("server.webmio.domainInUse", { domain }));
        }
        // "Could not verify Domain Name ownership": the domain doesn't lead to CloudFront yet.
        if (nameOf(error) === "InvalidArgument" && /ownership/i.test(messageOf(error))) {
          return undefined;
        }
        throw hostingError(error, "connectDomain");
      }
    },

    async certificateState(tenantId) {
      try {
        const result = await cloudfront.send(
          new GetManagedCertificateDetailsCommand({ Identifier: tenantId }),
        );
        const details = result.ManagedCertificateDetails;
        const state = CERTIFICATE_STATES[details?.CertificateStatus ?? "pending-validation"];
        if (state !== "issued" || !details?.CertificateArn) return state ?? "failed";
        // An issued certificate serves nothing until the tenant uses it, as the console's last
        // step does; then CloudFront makes the domain active.
        const { tenant: found, etag } = await tenant(tenantId);
        if (found.Customizations?.Certificate?.Arn !== details.CertificateArn) {
          await cloudfront.send(
            new UpdateDistributionTenantCommand({
              Id: tenantId,
              IfMatch: etag,
              Domains: (found.Domains ?? []).map(({ Domain }) => ({ Domain })),
              Customizations: {
                ...found.Customizations,
                Certificate: { Arn: details.CertificateArn },
              },
            }),
          );
        }
        return "issued";
      } catch (error) {
        throw hostingError(error, "checkCertificate");
      }
    },

    async renewCertificate(tenantId) {
      try {
        const { tenant: found, etag } = await tenant(tenantId);
        const domain = found.Domains?.[0]?.Domain;
        if (!domain) throw new Error(`Tenant ${tenantId} has no domain`);
        await cloudfront.send(
          new UpdateDistributionTenantCommand({
            Id: tenantId,
            IfMatch: etag,
            Domains: [{ Domain: domain }],
            ManagedCertificateRequest: certificateRequest(domain),
          }),
        );
      } catch (error) {
        throw hostingError(error, "requestCertificate");
      }
    },

    async deleteTenant(tenantId) {
      try {
        let { tenant: found, etag } = await tenant(tenantId);
        if (found.Enabled) {
          const updated = await cloudfront.send(
            new UpdateDistributionTenantCommand({ Id: tenantId, IfMatch: etag, Enabled: false }),
          );
          etag = updated.ETag ?? etag;
          found = updated.DistributionTenant ?? found;
        }
        try {
          await cloudfront.send(
            new DeleteDistributionTenantCommand({ Id: tenantId, IfMatch: etag }),
          );
        } catch (error) {
          // Disabling takes a few minutes to reach every edge; until then the disabled tenant
          // holds the domain, and connecting it again takes the tenant over.
          if (nameOf(error) === "ResourceNotDisabled" || nameOf(error) === "PreconditionFailed") {
            return;
          }
          throw error;
        }
      } catch (error) {
        if (nameOf(error) === "EntityNotFound") return;
        throw hostingError(error, "disconnectDomain");
      }
    },
  };
}
