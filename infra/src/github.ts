// Deploys from GitHub Actions (admin-on-aws design.md decision 6): GitHub's OIDC provider and
// the role the deploy workflow assumes for this stack. The workflow's job runs in the GitHub
// environment named after the stack, and the role trusts only that environment; the `prod`
// environment's branch rule limits it to `main`.
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { repository } from "./admin.js";
import { account, config, name, region, stack } from "./hosting.js";

// The repository as GitHub names it in its tokens' subject: with the owner's and repository's
// immutable IDs, so a renamed or re-created repository isn't trusted
// (`gh api repos/michalcumpl/webmio/actions/oidc/customization/sub`).
const githubRepository = "michalcumpl@134929375/webmio@1394510292";
const issuer = "token.actions.githubusercontent.com";

// An account has one provider for GitHub. The stack that creates it (githubProvider: create)
// keeps it when destroyed, since other stacks use it.
const providerArn =
  (config.get("githubProvider") ?? "create") === "create"
    ? new aws.iam.OpenIdConnectProvider(
        "github",
        { url: `https://${issuer}`, clientIdLists: ["sts.amazonaws.com"] },
        { retainOnDelete: true },
      ).arn
    : pulumi.interpolate`arn:aws:iam::${account}:oidc-provider/${issuer}`;

export const deployRole = new aws.iam.Role(name("deploy"), {
  assumeRolePolicy: providerArn.apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Federated: arn },
          Action: "sts:AssumeRoleWithWebIdentity",
          Condition: {
            StringEquals: {
              [`${issuer}:aud`]: "sts.amazonaws.com",
              [`${issuer}:sub`]: `repo:${githubRepository}:environment:${stack}`,
            },
          },
        },
      ],
    }),
  ),
});

// Push the image, then run webmio-deploy on the stack's server and read how it went.
new aws.iam.RolePolicy(name("deploy"), {
  role: deployRole.id,
  policy: pulumi.all([repository.arn, region, account]).apply(([repositoryArn, regionName, id]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        { Effect: "Allow", Action: "ecr:GetAuthorizationToken", Resource: "*" },
        {
          Effect: "Allow",
          Action: [
            "ecr:BatchCheckLayerAvailability",
            "ecr:BatchGetImage",
            "ecr:CompleteLayerUpload",
            "ecr:DescribeImages",
            "ecr:GetDownloadUrlForLayer",
            "ecr:InitiateLayerUpload",
            "ecr:PutImage",
            "ecr:UploadLayerPart",
          ],
          Resource: repositoryArn,
        },
        {
          Effect: "Allow",
          Action: "ssm:SendCommand",
          Resource: `arn:aws:ssm:${regionName}::document/AWS-RunShellScript`,
        },
        {
          Effect: "Allow",
          Action: "ssm:SendCommand",
          Resource: `arn:aws:ec2:${regionName}:${id}:instance/*`,
          Condition: { StringEquals: { "ssm:resourceTag/webmio-admin": stack } },
        },
        {
          Effect: "Allow",
          Action: [
            "ssm:GetCommandInvocation",
            "ssm:ListCommandInvocations",
            "ec2:DescribeInstances",
          ],
          Resource: "*",
        },
      ],
    }),
  ),
});
