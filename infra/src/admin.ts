// The admin's server (admin-on-aws design.md decisions 1 and 3 to 9): its buckets, image
// repository and configuration, its mail, the instance, and the alarms watching it.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import {
  account,
  bucket,
  cnameDomain,
  config,
  connectionGroup,
  distribution,
  hostingPolicy,
  name,
  netDomain,
  netZone,
  region,
  sitesDomain,
  stack,
  store,
  usEast1,
} from "./hosting.js";

export const adminDomain = config.require("adminDomain");
const adminZone = config.get("adminZone") ?? "";
const alertEmail = config.requireSecret("alertEmail");
const adminSecretKey = config.requireSecret("adminSecretKey");
const mailDomain = `mail.${netDomain}`;
const keep = stack === "prod";

/** Where the server's configuration lives in Parameter Store (design.md decision 1). */
export const parameterPath = `/webmio/${stack}/admin`;
/** The containers' log groups: <logPath>/admin, /litestream and /caddy (design.md decision 8). */
const logPath = `/webmio/${stack}`;
/** The namespace of the server's own metrics: disk use and the replica's lag. */
export const metricNamespace = `Webmio/${stack}`;
const litestreamImage = "litestream/litestream:0.5.17";
const caddyImage = "caddy:2.11.4";

// The media bucket: every project's images under <projectId>/, as the media folder holds them.
export const mediaBucket = new aws.s3.Bucket(name("media"), { forceDestroy: !keep });
new aws.s3.BucketPublicAccessBlock(name("media"), {
  bucket: mediaBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

// The backups bucket: Litestream's replica under admin/, and seed/app.db when moving an
// existing installation in (design.md decisions 3 and 9). Versioned, so a deleted or
// overwritten object stays recoverable for 30 days.
export const backupsBucket = new aws.s3.Bucket(name("backups"), { forceDestroy: !keep });
new aws.s3.BucketPublicAccessBlock(name("backups"), {
  bucket: backupsBucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});
const backupsVersioning = new aws.s3.BucketVersioning(name("backups"), {
  bucket: backupsBucket.id,
  versioningConfiguration: { status: "Enabled" },
});
new aws.s3.BucketLifecycleConfiguration(
  name("backups"),
  {
    bucket: backupsBucket.id,
    rules: [
      {
        id: "keep-30-days",
        status: "Enabled",
        filter: {},
        noncurrentVersionExpiration: { noncurrentDays: 30 },
        abortIncompleteMultipartUpload: { daysAfterInitiation: 1 },
      },
    ],
  },
  { dependsOn: [backupsVersioning] },
);

// The admin's images, tagged with the commit they were built from; the newest 20 are kept.
export const repository = new aws.ecr.Repository(name("admin"), {
  name: name("admin"),
  imageTagMutability: "IMMUTABLE",
  imageScanningConfiguration: { scanOnPush: true },
  forceDelete: !keep,
});
new aws.ecr.LifecyclePolicy(name("admin"), {
  repository: repository.name,
  policy: JSON.stringify({
    rules: [
      {
        rulePriority: 1,
        description: "Keep the newest 20 images",
        selection: { tagStatus: "any", countType: "imageCountMoreThan", countNumber: 20 },
        action: { type: "expire" },
      },
    ],
  }),
});

// The server's configuration (design.md decision 1): each unit renders its file from these
// parameters before it starts, so changing one needs a restart, not a new server.
const parameter = (key: string, value: pulumi.Input<string>, description: string) =>
  new aws.ssm.Parameter(name(`admin-${key}`), {
    name: `${parameterPath}/${key}`,
    type: "String",
    tier: "Standard",
    value,
    description,
  });

/** The admin's environment, apart from SECRET_KEY. */
const environment = pulumi.interpolate`ORIGIN=https://${adminDomain}
ADDRESS_HEADER=X-Forwarded-For
XFF_DEPTH=1
AWS_REGION=${region}
MEDIA_BUCKET=${mediaBucket.bucket}
MAIL_TRANSPORT=ses
MAIL_FROM=Webmio <prihlaseni@${mailDomain}>
WEBMIO_HOSTING_BUCKET=${bucket.bucket}
WEBMIO_HOSTING_KVS_ARN=${store.arn}
WEBMIO_HOSTING_DISTRIBUTION_ID=${distribution.id}
WEBMIO_HOSTING_CONNECTION_GROUP_ID=${connectionGroup.id}
WEBMIO_SITES_DOMAIN=${sitesDomain}
WEBMIO_CNAME_DOMAIN=${cnameDomain}
`;
parameter("env", environment, "The admin's environment, apart from SECRET_KEY");

new aws.ssm.Parameter(name("admin-secret-key"), {
  name: `${parameterPath}/secret-key`,
  type: "SecureString",
  tier: "Standard",
  value: adminSecretKey,
  description: "The admin's SECRET_KEY, which encrypts hosting tokens at rest",
});

// Caddy answers HTTP with a redirect and serves HTTPS with a certificate it obtains itself.
// The admin takes uploads up to its BODY_SIZE_LIMIT (25 MB).
const caddyfile = `${adminDomain} {
\tencode zstd gzip
\trequest_body {
\t\tmax_size 25MB
\t}
\treverse_proxy webmio-admin:3000
}
`;
parameter("caddyfile", caddyfile, "Caddy's configuration");

// Litestream v0.5: one replica, a snapshot a day, 30 days of history to restore from.
const litestream = pulumi.interpolate`dbs:
  - path: /data/app.db
    replica:
      type: s3
      bucket: ${backupsBucket.bucket}
      path: admin
      region: ${region}
snapshot:
  interval: 24h
  retention: 720h
`;
parameter("litestream", litestream, "Litestream's configuration");

// The image tag the server runs. Deploys change it (design.md decision 6); until the first
// deploy, "newest" makes the server start the newest image in the repository.
new aws.ssm.Parameter(
  name("admin-image"),
  {
    name: `${parameterPath}/image`,
    type: "String",
    tier: "Standard",
    value: "newest",
    description: "The admin image tag the server runs, set by deploys",
  },
  { ignoreChanges: ["value"] },
);

// Mail (design.md decision 5): SES sends from mail.<netDomain>, signed with Easy DKIM, with
// bounces to bounce.mail.<netDomain> so SPF aligns. The records live in the netDomain zone.
export const mailIdentity = new aws.sesv2.EmailIdentity(name("mail"), {
  emailIdentity: mailDomain,
  dkimSigningAttributes: { nextSigningKeyLength: "RSA_2048_BIT" },
});
for (const index of [0, 1, 2]) {
  const token = mailIdentity.dkimSigningAttributes.apply((dkim) => dkim.tokens?.[index] ?? "");
  new aws.route53.Record(name(`mail-dkim-${index}`), {
    zoneId: netZone.zoneId,
    name: pulumi.interpolate`${token}._domainkey.${mailDomain}`,
    type: "CNAME",
    records: [pulumi.interpolate`${token}.dkim.amazonses.com`],
    ttl: 1800,
  });
}
const bounceDomain = `bounce.${mailDomain}`;
new aws.sesv2.EmailIdentityMailFromAttributes(name("mail"), {
  emailIdentity: mailIdentity.emailIdentity,
  mailFromDomain: bounceDomain,
  behaviorOnMxFailure: "USE_DEFAULT_VALUE",
});
new aws.route53.Record(name("mail-bounce-mx"), {
  zoneId: netZone.zoneId,
  name: bounceDomain,
  type: "MX",
  records: [pulumi.interpolate`10 feedback-smtp.${region}.amazonses.com`],
  ttl: 1800,
});
new aws.route53.Record(name("mail-bounce-spf"), {
  zoneId: netZone.zoneId,
  name: bounceDomain,
  type: "TXT",
  records: ["v=spf1 include:amazonses.com ~all"],
  ttl: 1800,
});
// Reports only for now; tightened once mail flows cleanly. Receivers send aggregate reports to
// another domain only when that domain authorizes it, so some reports may not arrive.
new aws.route53.Record(name("mail-dmarc"), {
  zoneId: netZone.zoneId,
  name: `_dmarc.${mailDomain}`,
  type: "TXT",
  records: [pulumi.interpolate`v=DMARC1; p=none; rua=mailto:${alertEmail}`],
  ttl: 1800,
});

// The server's role (design.md decision 4): Webmio hosting as the local admin may use it, its
// buckets, mail, configuration, image, logs and metrics, and Session Manager instead of SSH.
const serverRole = new aws.iam.Role(name("server"), {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      { Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" },
    ],
  }),
});
const serverSsm = new aws.iam.RolePolicyAttachment(name("server-ssm"), {
  role: serverRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
});
const serverHosting = new aws.iam.RolePolicy(name("server-hosting"), {
  role: serverRole.id,
  policy: hostingPolicy,
});
const serverPolicy = new aws.iam.RolePolicy(name("server"), {
  role: serverRole.id,
  policy: pulumi
    .all([mediaBucket.arn, backupsBucket.arn, repository.arn, region, account])
    .apply(([mediaArn, backupsArn, repositoryArn, regionName, id]) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            Resource: [`${mediaArn}/*`, `${backupsArn}/*`],
          },
          {
            Effect: "Allow",
            Action: ["s3:ListBucket", "s3:GetBucketLocation"],
            Resource: [mediaArn, backupsArn],
          },
          {
            // In the SES sandbox, sending also needs permission on the recipients' identities,
            // so the sender address is what limits it.
            Effect: "Allow",
            Action: ["ses:SendEmail", "ses:SendRawEmail"],
            Resource: `arn:aws:ses:${regionName}:${id}:identity/*`,
            Condition: { StringLike: { "ses:FromAddress": `*@${mailDomain}` } },
          },
          {
            Effect: "Allow",
            Action: ["ssm:GetParameter", "ssm:GetParameters"],
            Resource: `arn:aws:ssm:${regionName}:${id}:parameter${parameterPath}/*`,
          },
          {
            // webmio-deploy records the image it runs.
            Effect: "Allow",
            Action: "ssm:PutParameter",
            Resource: `arn:aws:ssm:${regionName}:${id}:parameter${parameterPath}/image`,
          },
          {
            Effect: "Allow",
            Action: "kms:Decrypt",
            Resource: "*",
            Condition: { StringEquals: { "kms:ViaService": `ssm.${regionName}.amazonaws.com` } },
          },
          { Effect: "Allow", Action: "ecr:GetAuthorizationToken", Resource: "*" },
          {
            Effect: "Allow",
            Action: [
              "ecr:BatchCheckLayerAvailability",
              "ecr:BatchGetImage",
              "ecr:GetDownloadUrlForLayer",
              "ecr:DescribeImages",
            ],
            Resource: repositoryArn,
          },
          {
            Effect: "Allow",
            Action: ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
            Resource: `arn:aws:logs:${regionName}:${id}:log-group:${logPath}/*`,
          },
          {
            Effect: "Allow",
            Action: "cloudwatch:PutMetricData",
            Resource: "*",
            Condition: { StringEquals: { "cloudwatch:namespace": metricNamespace } },
          },
        ],
      }),
    ),
});
const serverProfile = new aws.iam.InstanceProfile(name("server"), { role: serverRole.name });

// Only HTTP and HTTPS come in; Session Manager needs no inbound port.
const defaultVpc = aws.ec2.getVpcOutput({ default: true });
const serverGroup = new aws.ec2.SecurityGroup(name("server"), {
  description: "Webmio admin: HTTP and HTTPS",
  vpcId: defaultVpc.id,
  ingress: [
    {
      protocol: "tcp",
      fromPort: 80,
      toPort: 80,
      cidrBlocks: ["0.0.0.0/0"],
      ipv6CidrBlocks: ["::/0"],
    },
    {
      protocol: "tcp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ["0.0.0.0/0"],
      ipv6CidrBlocks: ["::/0"],
    },
    {
      protocol: "udp",
      fromPort: 443,
      toPort: 443,
      cidrBlocks: ["0.0.0.0/0"],
      ipv6CidrBlocks: ["::/0"],
    },
  ],
  egress: [
    { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"], ipv6CidrBlocks: ["::/0"] },
  ],
});
const subnet = aws.ec2.getSubnetOutput({
  vpcId: defaultVpc.id,
  availabilityZone: pulumi.interpolate`${region}a`,
  defaultForAz: true,
});

// The containers' logs, kept for 30 days (design.md decision 8). Docker's awslogs driver needs
// them to exist before the containers start.
const logGroups = ["admin", "litestream", "caddy"].map(
  (container) =>
    new aws.cloudwatch.LogGroup(name(`logs-${container}`), {
      name: `${logPath}/${container}`,
      retentionInDays: 30,
    }),
);

// The server's files (infra/server/), written by its user data before bootstrap.sh runs.
const serverFile = (file: string) =>
  readFileSync(new URL(`../server/${file}`, import.meta.url), "utf8");
const cloudwatchAgent = JSON.stringify({
  agent: { omit_hostname: true },
  metrics: {
    namespace: metricNamespace,
    metrics_collected: {
      disk: { measurement: ["used_percent"], resources: ["/"], drop_device: true },
    },
  },
});
const serverEnv = pulumi.interpolate`WEBMIO_STACK=${stack}
WEBMIO_REGION=${region}
WEBMIO_PARAMETERS=${parameterPath}
WEBMIO_REPOSITORY=${repository.repositoryUrl}
WEBMIO_BACKUPS=${backupsBucket.bucket}
WEBMIO_LOGS=${logPath}
WEBMIO_LITESTREAM_IMAGE=${litestreamImage}
WEBMIO_CADDY_IMAGE=${caddyImage}
`;
const programs = ["webmio-render", "webmio-restore", "webmio-deploy", "webmio-replica-lag"];
const units = [
  "webmio-restore.service",
  "webmio-admin.service",
  "webmio-litestream.service",
  "webmio-caddy.service",
  "webmio-replica-lag.service",
  "webmio-replica-lag.timer",
];
const writeFile = (path: string, content: string, mode: string) =>
  `cat >${path} <<'WEBMIO_FILE'\n${content}WEBMIO_FILE\nchmod ${mode} ${path}\n`;
const userData = serverEnv.apply((env) =>
  gzipSync(
    [
      "#!/bin/sh\nset -eu\nmkdir -p /etc/webmio\n",
      writeFile("/etc/webmio/server.env", env, "644"),
      writeFile("/etc/webmio/cloudwatch-agent.json", `${cloudwatchAgent}\n`, "644"),
      ...programs.map((file) => writeFile(`/usr/local/bin/${file}`, serverFile(file), "755")),
      ...units.map((file) => writeFile(`/etc/systemd/system/${file}`, serverFile(file), "644")),
      serverFile("bootstrap.sh"),
    ].join(""),
  ).toString("base64"),
);

// The server (design.md decision 1). A change to its files replaces it: it restores itself.
// Newer Amazon Linux images are picked up when it is replaced for another reason.
const image = aws.ssm.getParameterOutput({
  name: "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64",
});
export const server = new aws.ec2.Instance(
  name("server"),
  {
    ami: image.value,
    instanceType: "t4g.small",
    subnetId: subnet.id,
    vpcSecurityGroupIds: [serverGroup.id],
    iamInstanceProfile: serverProfile.name,
    userDataBase64: userData,
    userDataReplaceOnChange: true,
    rootBlockDevice: { volumeType: "gp3", volumeSize: 20, encrypted: true },
    // IMDSv2 only; two hops so the containers reach the role's credentials.
    metadataOptions: { httpTokens: "required", httpPutResponseHopLimit: 2 },
    tags: { Name: name("server"), "webmio-admin": stack },
  },
  { ignoreChanges: ["ami"], dependsOn: [...logGroups, serverSsm, serverHosting, serverPolicy] },
);
export const serverAddress = new aws.ec2.Eip(name("server"), {
  domain: "vpc",
  instance: server.id,
  tags: { Name: name("server") },
});

// The admin's address points at the server, when its zone is in Route 53 (design.md decision 9).
if (adminZone) {
  new aws.route53.Record(name("admin"), {
    zoneId:
      adminZone === netDomain
        ? netZone.zoneId
        : aws.route53.getZoneOutput({ name: adminZone }).zoneId,
    name: adminDomain,
    type: "A",
    records: [serverAddress.publicIp],
    ttl: 300,
  });
}

// Alerts by email (design.md decision 8), from both regions: Route 53's health check metrics
// exist only in us-east-1. The operator confirms each subscription once.
const alertTopic = (provider?: aws.Provider) => {
  const suffix = provider ? "-us-east-1" : "";
  const topic = new aws.sns.Topic(name(`alerts${suffix}`), { name: name("alerts") }, { provider });
  new aws.sns.TopicSubscription(
    name(`alerts${suffix}`),
    { topic: topic.arn, protocol: "email", endpoint: alertEmail },
    { provider },
  );
  return topic.arn;
};
const alerts = alertTopic();
const alertsUsEast1 = alertTopic(usEast1);

const healthCheck = new aws.route53.HealthCheck(name("admin"), {
  type: "HTTPS",
  fqdn: adminDomain,
  port: 443,
  resourcePath: "/healthz",
  requestInterval: 30,
  failureThreshold: 3,
  regions: ["us-east-1", "eu-west-1", "ap-southeast-1"],
  tags: { Name: name("admin") },
});
new aws.cloudwatch.MetricAlarm(
  name("admin-down"),
  {
    alarmDescription: `${adminDomain}/healthz hasn't answered for 3 minutes`,
    namespace: "AWS/Route53",
    metricName: "HealthCheckStatus",
    dimensions: { HealthCheckId: healthCheck.id },
    statistic: "Minimum",
    period: 60,
    evaluationPeriods: 3,
    comparisonOperator: "LessThanThreshold",
    threshold: 1,
    treatMissingData: "breaching",
    alarmActions: [alertsUsEast1],
    okActions: [alertsUsEast1],
  },
  { provider: usEast1 },
);

const serverAlarm = (
  key: string,
  description: string,
  metric: Pick<
    aws.cloudwatch.MetricAlarmArgs,
    "namespace" | "metricName" | "dimensions" | "statistic" | "threshold" | "comparisonOperator"
  >,
  options: {
    treatMissingData?: string;
    evaluationPeriods?: number;
    actions?: pulumi.Input<string>[];
  } = {},
) =>
  new aws.cloudwatch.MetricAlarm(name(key), {
    alarmDescription: description,
    period: 60,
    evaluationPeriods: options.evaluationPeriods ?? 2,
    treatMissingData: options.treatMissingData ?? "notBreaching",
    alarmActions: [alerts, ...(options.actions ?? [])],
    okActions: [alerts],
    ...metric,
  });

serverAlarm(
  "server-system-check",
  "The server's hardware failed its status check; EC2 recovers it onto other hardware",
  {
    namespace: "AWS/EC2",
    metricName: "StatusCheckFailed_System",
    dimensions: { InstanceId: server.id },
    statistic: "Maximum",
    comparisonOperator: "GreaterThanOrEqualToThreshold",
    threshold: 1,
  },
  { actions: [pulumi.interpolate`arn:aws:automate:${region}:ec2:recover`] },
);
serverAlarm("server-instance-check", "The server failed its instance status check", {
  namespace: "AWS/EC2",
  metricName: "StatusCheckFailed_Instance",
  dimensions: { InstanceId: server.id },
  statistic: "Maximum",
  comparisonOperator: "GreaterThanOrEqualToThreshold",
  threshold: 1,
});
serverAlarm("server-disk", "The server's disk is more than 80 % full", {
  namespace: metricNamespace,
  metricName: "disk_used_percent",
  dimensions: { path: "/", fstype: "xfs" },
  statistic: "Maximum",
  comparisonOperator: "GreaterThanThreshold",
  threshold: 80,
});
serverAlarm(
  "replica-lag",
  "The database's replica is more than 5 minutes behind, or its lag isn't being reported",
  {
    namespace: metricNamespace,
    metricName: "ReplicaLagSeconds",
    statistic: "Maximum",
    comparisonOperator: "GreaterThanThreshold",
    threshold: 300,
  },
  { treatMissingData: "breaching", evaluationPeriods: 3 },
);
