// The redirect server (bare-domain-redirect design.md): a tiny server whose address customers'
// bare domains point at, redirecting them to their www. over HTTPS. Turned off with the stack
// setting redirectServer.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { noWebsite } from "@webmio/edge/router";
import { alerts, alertsUsEast1 } from "./alerts.js";
import { config, name, region, stack, usEast1 } from "./hosting.js";

const enabled = config.getBoolean("redirectServer") ?? true;
const adminDomain = config.require("adminDomain");
/** Its container's log group (design.md decision 3). */
const logPath = `/webmio/${stack}/redirect`;
const caddyImage = "caddy:2.11.4";

const serverFile = (file: string) =>
  readFileSync(new URL(`../server/redirect/${file}`, import.meta.url), "utf8");

/** The edge's "No website here" page, so both say the same. */
const noWebsitePage = (() => {
  const page = noWebsite();
  if (page.kind !== "respond" || !page.body) throw new Error("The edge's page has no body");
  return page.body;
})();

function redirectServer() {
  // The address customers' A records name (design.md decision 2): its own resource, attached to
  // whichever instance is current, and never released by Pulumi.
  const address = new aws.ec2.Eip(
    name("redirect"),
    { domain: "vpc", tags: { Name: name("redirect") } },
    { protect: true, retainOnDelete: true },
  );

  // Session Manager instead of SSH, and its container's logs.
  const role = new aws.iam.Role(name("redirect"), {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        { Effect: "Allow", Principal: { Service: "ec2.amazonaws.com" }, Action: "sts:AssumeRole" },
      ],
    }),
  });
  const ssm = new aws.iam.RolePolicyAttachment(name("redirect-ssm"), {
    role: role.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  });
  const logGroup = new aws.cloudwatch.LogGroup(name("logs-redirect"), {
    name: `${logPath}/caddy`,
    retentionInDays: 30,
  });
  const logs = new aws.iam.RolePolicy(name("redirect-logs"), {
    role: role.id,
    policy: logGroup.arn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogStreams"],
            Resource: `${arn}:*`,
          },
        ],
      }),
    ),
  });
  const profile = new aws.iam.InstanceProfile(name("redirect"), { role: role.name });

  const defaultVpc = aws.ec2.getVpcOutput({ default: true });
  const open = (protocol: string, port: number) => ({
    protocol,
    fromPort: port,
    toPort: port,
    cidrBlocks: ["0.0.0.0/0"],
    ipv6CidrBlocks: ["::/0"],
  });
  const group = new aws.ec2.SecurityGroup(name("redirect"), {
    description: "Webmio redirect server: HTTP and HTTPS",
    vpcId: defaultVpc.id,
    ingress: [open("tcp", 80), open("tcp", 443), open("udp", 443)],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
        ipv6CidrBlocks: ["::/0"],
      },
    ],
  });
  const subnet = aws.ec2.getSubnetOutput({
    vpcId: defaultVpc.id,
    availabilityZone: pulumi.interpolate`${region}a`,
    defaultForAz: true,
  });

  // Its configuration travels in its user data (design.md decision 3): a change replaces it.
  const caddyfile = serverFile("Caddyfile")
    .replace("__ADMIN_DOMAIN__", adminDomain)
    .replace("__NO_WEBSITE__", noWebsitePage);
  const writeFile = (path: string, content: string, mode: string) =>
    `cat >${path} <<'WEBMIO_FILE'\n${content}WEBMIO_FILE\nchmod ${mode} ${path}\n`;
  const userData = region.apply((regionName) =>
    gzipSync(
      [
        "#!/bin/sh\nset -eu\nmkdir -p /etc/webmio\n",
        writeFile(
          "/etc/webmio/server.env",
          `WEBMIO_REGION=${regionName}\nWEBMIO_LOGS=${logPath}\nWEBMIO_CADDY_IMAGE=${caddyImage}\n`,
          "644",
        ),
        writeFile("/etc/webmio/Caddyfile", caddyfile, "644"),
        writeFile(
          "/etc/systemd/system/webmio-redirect.service",
          serverFile("webmio-redirect.service"),
          "644",
        ),
        serverFile("bootstrap.sh"),
      ].join(""),
    ).toString("base64"),
  );

  const image = aws.ssm.getParameterOutput({
    name: "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64",
  });
  const server = new aws.ec2.Instance(
    name("redirect"),
    {
      ami: image.value,
      instanceType: "t4g.nano",
      subnetId: subnet.id,
      vpcSecurityGroupIds: [group.id],
      iamInstanceProfile: profile.name,
      userDataBase64: userData,
      userDataReplaceOnChange: true,
      rootBlockDevice: { volumeType: "gp3", volumeSize: 8, encrypted: true },
      metadataOptions: { httpTokens: "required", httpPutResponseHopLimit: 2 },
      tags: { Name: name("redirect") },
    },
    { ignoreChanges: ["ami"], dependsOn: [ssm, logs, logGroup] },
  );
  new aws.ec2.EipAssociation(name("redirect"), {
    allocationId: address.allocationId,
    instanceId: server.id,
  });

  // Alarms like the admin's (design.md decision 7).
  const healthCheck = new aws.route53.HealthCheck(name("redirect"), {
    type: "HTTP",
    ipAddress: address.publicIp,
    port: 80,
    resourcePath: "/healthz",
    requestInterval: 30,
    failureThreshold: 3,
    regions: ["us-east-1", "eu-west-1", "ap-southeast-1"],
    tags: { Name: name("redirect") },
  });
  new aws.cloudwatch.MetricAlarm(
    name("redirect-down"),
    {
      alarmDescription:
        "The redirect server hasn't answered for 3 minutes: bare domains aren't redirecting",
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
  const statusAlarm = (
    key: string,
    description: string,
    metricName: string,
    actions: pulumi.Input<string>[],
  ) =>
    new aws.cloudwatch.MetricAlarm(name(key), {
      alarmDescription: description,
      namespace: "AWS/EC2",
      metricName,
      dimensions: { InstanceId: server.id },
      statistic: "Maximum",
      period: 60,
      evaluationPeriods: 2,
      comparisonOperator: "GreaterThanOrEqualToThreshold",
      threshold: 1,
      treatMissingData: "notBreaching",
      alarmActions: [alerts, ...actions],
      okActions: [alerts],
    });
  statusAlarm(
    "redirect-system-check",
    "The redirect server's hardware failed its status check; EC2 recovers it onto other hardware",
    "StatusCheckFailed_System",
    [pulumi.interpolate`arn:aws:automate:${region}:ec2:recover`],
  );
  statusAlarm(
    "redirect-instance-check",
    "The redirect server failed its instance status check",
    "StatusCheckFailed_Instance",
    [],
  );

  return { address, server };
}

export const redirect = enabled ? redirectServer() : undefined;
