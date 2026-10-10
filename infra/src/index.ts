// Webmio's infrastructure (admin-on-aws design.md decision 10): Webmio hosting (hosting.ts), the
// admin's server (admin.ts) and the deploys from GitHub (github.ts). This file holds the outputs.
import * as pulumi from "@pulumi/pulumi";
import {
  adminDomain,
  backupsBucket,
  mediaBucket,
  parameterPath,
  repository,
  server,
  serverAddress,
} from "./admin.js";
import { deployRole } from "./github.js";
import {
  adminKey,
  bucket,
  cnameDomain,
  connectionGroup,
  distribution,
  netZone,
  region,
  sitesDomain,
  sitesZone,
  store,
} from "./hosting.js";
import { redirect } from "./redirect.js";

/** The admin's environment (README, "Webmio hosting"). */
export const WEBMIO_HOSTING_BUCKET = bucket.bucket;
export const WEBMIO_HOSTING_KVS_ARN = store.arn;
export const WEBMIO_HOSTING_DISTRIBUTION_ID = distribution.id;
export const WEBMIO_HOSTING_CONNECTION_GROUP_ID = connectionGroup.id;
export const WEBMIO_SITES_DOMAIN = sitesDomain;
export const WEBMIO_CNAME_DOMAIN = cnameDomain;
export const AWS_REGION = region;
export const AWS_ACCESS_KEY_ID = adminKey?.id;
export const AWS_SECRET_ACCESS_KEY = adminKey && pulumi.secret(adminKey.secret);

/** The admin's server (infra/README.md, "The admin's server"). */
export const adminMediaBucket = mediaBucket.bucket;
export const adminBackupsBucket = backupsBucket.bucket;
export const adminRepository = repository.repositoryUrl;
export const adminParameters = parameterPath;
export const adminUrl = `https://${adminDomain}`;
/** The address adminDomain's A record points at; added by hand where DNS isn't in Route 53. */
export const adminAddress = serverAddress.publicIp;
export const adminServer = server.id;
/** The GitHub environment's variables for the deploy workflow (infra/README.md). */
export const AWS_DEPLOY_ROLE_ARN = deployRole.arn;
export const ECR_REPOSITORY = repository.repositoryUrl;

/** Where customers' bare domains point (infra/README.md, "The redirect server"). */
export const redirectAddress = redirect?.address.publicIp;
export const redirectServer = redirect?.server.id;

/** Where to delegate the two domains (infra/README.md). */
export const sitesNameServers = sitesZone.nameServers;
export const netNameServers = netZone.nameServers;
