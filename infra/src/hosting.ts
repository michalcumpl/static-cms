// Webmio hosting's infrastructure (own-hosting design.md decision 13): one private bucket, one
// CloudFront multi-tenant distribution with a router function, its key-value store and a
// not-found function, the free addresses' tenant and certificate, the DNS zones, and the admin's
// access. Custom domains' tenants are created by the admin, not here. Resource names are what
// own-hosting created; changing one replaces the resource.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export const config = new pulumi.Config();
export const sitesDomain = config.require("sitesDomain");
export const netDomain = config.require("netDomain");
export const cnameDomain = `sites.${netDomain}`;
export const stack = pulumi.getStack();
export const name = (resource: string) => `webmio-${stack}-${resource}`;
export const region = aws.getRegionOutput().region;
export const account = aws.getCallerIdentityOutput().accountId;

/** CloudFront's certificates and Lambda@Edge functions live in us-east-1. */
export const usEast1 = new aws.Provider("us-east-1", { region: "us-east-1" });

const edgeBundle = (file: string) =>
  readFileSync(fileURLToPath(import.meta.resolve(`@webmio/edge/bundles/${file}`)), "utf8");

// The bucket: every website's publishes under sites/<siteId>/<deployId>/, read only by CloudFront.
export const bucket = new aws.s3.Bucket(name("sites"), { forceDestroy: stack !== "prod" });
new aws.s3.BucketPublicAccessBlock(name("sites"), {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});
new aws.s3.BucketLifecycleConfiguration(name("sites"), {
  bucket: bucket.id,
  rules: [
    {
      id: "abort-incomplete-uploads",
      status: "Enabled",
      filter: {},
      abortIncompleteMultipartUpload: { daysAfterInitiation: 1 },
    },
  ],
});

// The router: hostname → website → live publish (design.md decisions 2 and 3).
export const store = new aws.cloudfront.KeyValueStore(name("hosts"), {
  comment: "Webmio hosting: hostnames and live publishes",
});
const router = new aws.cloudfront.Function(name("router"), {
  runtime: "cloudfront-js-2.0",
  comment: "Webmio hosting: routes a request to its website's live publish",
  code: edgeBundle("viewer-request.js"),
  keyValueStoreAssociations: store.arn.apply((arn) => [arn]),
  publish: true,
});

// The not-found function: a publish's redirects and 404 page (design.md decision 4).
const notFoundRole = new aws.iam.Role(name("not-found"), {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: ["lambda.amazonaws.com", "edgelambda.amazonaws.com"] },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});
new aws.iam.RolePolicyAttachment(name("not-found-logs"), {
  role: notFoundRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});
new aws.iam.RolePolicy(name("not-found-read"), {
  role: notFoundRole.id,
  policy: bucket.arn.apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: "s3:GetObject", Resource: `${arn}/sites/*` }],
    }),
  ),
});
const notFoundCode = pulumi
  .all([bucket.bucket, region])
  .apply(([bucketName, bucketRegion]) =>
    edgeBundle("origin-response.mjs")
      .replace("__WEBMIO_HOSTING_BUCKET__", bucketName)
      .replace("__WEBMIO_HOSTING_REGION__", bucketRegion),
  );
const notFound = new aws.lambda.Function(
  name("not-found"),
  {
    runtime: "nodejs22.x",
    handler: "index.handler",
    role: notFoundRole.arn,
    code: notFoundCode.apply(
      (code) => new pulumi.asset.AssetArchive({ "index.mjs": new pulumi.asset.StringAsset(code) }),
    ),
    memorySize: 128,
    timeout: 5,
    publish: true,
  },
  { provider: usEast1 },
);

// Every file of a publish is kept at the edge for as long as the publish exists; its address
// includes the publish (design.md decision 6). Browsers get the files' own Cache-Control.
const YEAR = 31_536_000;
const cachePolicy = new aws.cloudfront.CachePolicy(name("publishes"), {
  comment: "Webmio hosting: publishes are immutable",
  minTtl: YEAR,
  defaultTtl: YEAR,
  maxTtl: YEAR,
  parametersInCacheKeyAndForwardedToOrigin: {
    cookiesConfig: { cookieBehavior: "none" },
    headersConfig: { headerBehavior: "none" },
    queryStringsConfig: { queryStringBehavior: "none" },
    enableAcceptEncodingGzip: true,
    enableAcceptEncodingBrotli: true,
  },
});

const originAccess = new aws.cloudfront.OriginAccessControl(name("sites"), {
  originAccessControlOriginType: "s3",
  signingBehavior: "always",
  signingProtocol: "sigv4",
});

// The free addresses' certificate, *.<sitesDomain>, validated through its zone.
export const sitesZone = new aws.route53.Zone(name("sites-zone"), { name: sitesDomain });
export const netZone = new aws.route53.Zone(name("net-zone"), { name: netDomain });
const certificate = new aws.acm.Certificate(
  name("sites"),
  { domainName: `*.${sitesDomain}`, validationMethod: "DNS" },
  { provider: usEast1 },
);
const validationRecord = new aws.route53.Record(name("sites-validation"), {
  zoneId: sitesZone.zoneId,
  name: certificate.domainValidationOptions.apply(
    (options) => options[0]?.resourceRecordName ?? "",
  ),
  type: certificate.domainValidationOptions.apply(
    (options) => options[0]?.resourceRecordType ?? "",
  ),
  records: [
    certificate.domainValidationOptions.apply((options) => options[0]?.resourceRecordValue ?? ""),
  ],
  ttl: 300,
  allowOverwrite: true,
});
const validation = new aws.acm.CertificateValidation(
  name("sites"),
  { certificateArn: certificate.arn, validationRecordFqdns: [validationRecord.fqdn] },
  { provider: usEast1 },
);

const ORIGIN = "sites";
export const distribution = new aws.cloudfront.MultitenantDistribution(name("sites"), {
  comment: `Webmio hosting (${stack})`,
  enabled: true,
  httpVersion: "http2and3",
  origins: [
    {
      id: ORIGIN,
      domainName: bucket.bucketRegionalDomainName,
      originAccessControlId: originAccess.id,
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: ORIGIN,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: { items: ["GET", "HEAD"], cachedMethods: ["GET", "HEAD"] },
    cachePolicyId: cachePolicy.id,
    compress: true,
    functionAssociations: [{ eventType: "viewer-request", functionArn: router.arn }],
    lambdaFunctionAssociations: [
      { eventType: "origin-response", lambdaFunctionArn: notFound.qualifiedArn },
    ],
  },
  tenantConfig: {},
  viewerCertificate: {
    acmCertificateArn: validation.certificateArn,
    sslSupportMethod: "sni-only",
    minimumProtocolVersion: "TLSv1.2_2021",
  },
});

// CloudFront reads the bucket for the distribution and its tenants, nothing else does.
new aws.s3.BucketPolicy(name("sites"), {
  bucket: bucket.id,
  policy: pulumi.all([bucket.arn, distribution.arn, account]).apply(([bucketArn, arn, id]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "cloudfront.amazonaws.com" },
          Action: "s3:GetObject",
          Resource: `${bucketArn}/sites/*`,
          Condition: {
            ArnLike: {
              "AWS:SourceArn": [arn, `arn:aws:cloudfront::${id}:distribution-tenant/*`],
            },
          },
        },
      ],
    }),
  ),
});

export const connectionGroup = new aws.cloudfront.ConnectionGroup(name("sites"), {
  name: name("sites"),
  enabled: true,
  ipv6Enabled: true,
});

// Every free address is served by one tenant with a wildcard alias.
new aws.cloudfront.DistributionTenant(name("free-addresses"), {
  name: name("free-addresses"),
  distributionId: distribution.id,
  connectionGroupId: connectionGroup.id,
  domains: [{ domain: `*.${sitesDomain}` }],
  enabled: true,
});

// Free addresses, and every website's own CNAME target (<name>.sites.<netDomain>), point at the
// connection group. A specific record for one target overrides the wildcard to move a website
// (design.md decision 7).
new aws.route53.Record(name("free-addresses"), {
  zoneId: sitesZone.zoneId,
  name: `*.${sitesDomain}`,
  type: "CNAME",
  records: [connectionGroup.routingEndpoint],
  ttl: 300,
});
new aws.route53.Record(name("cname-targets"), {
  zoneId: netZone.zoneId,
  name: `*.${cnameDomain}`,
  type: "CNAME",
  records: [connectionGroup.routingEndpoint],
  ttl: 300,
});

/**
 * What the admin may do with Webmio hosting: publishing, rollback, domains and deletion, and
 * nothing else. Both the local admin's IAM user and the server's role use it.
 */
export const hostingPolicy = pulumi
  .all([bucket.arn, store.arn, distribution.arn, account])
  .apply(([bucketArn, storeArn, distributionArn, id]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
          Resource: `${bucketArn}/sites/*`,
        },
        {
          Effect: "Allow",
          Action: "s3:ListBucket",
          Resource: bucketArn,
          Condition: { StringLike: { "s3:prefix": "sites/*" } },
        },
        {
          Effect: "Allow",
          Action: [
            "cloudfront-keyvaluestore:DescribeKeyValueStore",
            "cloudfront-keyvaluestore:GetKey",
            "cloudfront-keyvaluestore:ListKeys",
            "cloudfront-keyvaluestore:PutKey",
            "cloudfront-keyvaluestore:DeleteKey",
            "cloudfront-keyvaluestore:UpdateKeys",
          ],
          Resource: storeArn,
        },
        {
          Effect: "Allow",
          Action: [
            "cloudfront:CreateDistributionTenant",
            "cloudfront:GetDistributionTenant",
            "cloudfront:GetDistributionTenantByDomain",
            "cloudfront:UpdateDistributionTenant",
            "cloudfront:DeleteDistributionTenant",
            "cloudfront:GetManagedCertificateDetails",
          ],
          Resource: [distributionArn, `arn:aws:cloudfront::${id}:distribution-tenant/*`],
        },
        {
          // A custom domain's tenant asks ACM for its certificate as the caller; ACM
          // doesn't scope requesting to a resource.
          Effect: "Allow",
          Action: ["acm:RequestCertificate", "acm:DescribeCertificate"],
          Resource: "*",
        },
        {
          Effect: "Allow",
          Action: "cloudfront:GetConnectionGroup",
          Resource: `arn:aws:cloudfront::${id}:connection-group/*`,
        },
      ],
    }),
  );

// The local admin's access, for running the admin on a laptop against this stack (stack setting
// localAdminUser). The admin's server uses its role instead (admin.ts).
function localAdminKey() {
  const admin = new aws.iam.User(name("admin"), { name: name("admin") });
  new aws.iam.UserPolicy(name("admin"), { user: admin.name, policy: hostingPolicy });
  return new aws.iam.AccessKey(name("admin"), { user: admin.name });
}
export const adminKey = config.getBoolean("localAdminUser") ? localAdminKey() : undefined;
