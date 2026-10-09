# Webmio hosting infrastructure

The AWS resources that serve every published website (own-hosting design.md decision 13), as a
[Pulumi](https://www.pulumi.com) program in TypeScript. One stack per environment: `dev` and
`prod`, in the same AWS account.

| Resource | What it does |
| --- | --- |
| S3 bucket `webmio-<stack>-sites-…` | every website's publishes, under `sites/<siteId>/<deployId>/`; private |
| CloudFront key-value store | `h:<hostname>` → website, `s:<siteId>` → live publish |
| CloudFront Function (viewer request) | routes each request to its website's live publish (`packages/edge/src/router.js`) |
| Lambda@Edge (origin response, `us-east-1`) | a missing address: the publish's redirect, or its `404.html` (`packages/edge/src/not-found.js`) |
| Multi-tenant distribution, connection group | serves everything; custom domains join as tenants, created by the admin |
| Tenant `webmio-<stack>-free-addresses` | `*.<sitesDomain>`, with an ACM wildcard certificate |
| Route 53 zones `<sitesDomain>`, `<netDomain>` | `*.<sitesDomain>` and `*.sites.<netDomain>` point at the connection group |
| IAM user `webmio-<stack>-admin` | the admin's access: the bucket's `sites/`, the key-value store, tenants |

| Stack | `sitesDomain` | `netDomain` |
| --- | --- | --- |
| `dev` | `dev.webmio.site` | `dev.webmio.net` |
| `prod` | `webmio.site` | `webmio.net` |

## What you need

- An AWS account, and credentials for it with administrator access in your shell
  (`aws sts get-caller-identity` shows who you are).
- Pulumi CLI 3.263 or later (`brew upgrade pulumi`; older ones can't read `Pulumi.yaml`).
- Control over the DNS of `webmio.site` and `webmio.net`, to delegate a zone to Route 53.
- The state bucket and the stack passphrase, once (below).

### State and secrets

The stacks' state lives in a versioned, private S3 bucket in the same account, and their
secrets (the admin's access key) are encrypted with a passphrase kept in a file:

```sh
aws s3api create-bucket --bucket webmio-pulumi-state --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1
aws s3api put-bucket-versioning --bucket webmio-pulumi-state --versioning-configuration Status=Enabled
aws s3api put-public-access-block --bucket webmio-pulumi-state --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
mkdir -p ~/.config/webmio && (umask 077; openssl rand -base64 32 > ~/.config/webmio/pulumi-passphrase)
```

Keep the passphrase in the team's password manager too: without it nobody can update a stack.
Every command below expects:

```sh
export PULUMI_BACKEND_URL="s3://webmio-pulumi-state?region=eu-central-1"
export PULUMI_CONFIG_PASSPHRASE_FILE="$HOME/.config/webmio/pulumi-passphrase"
```

## Deploying a stack

From the repository root:

```sh
pnpm install
pnpm turbo run build --filter @webmio/infra      # the edge bundles, then the program
cd infra
pulumi stack select dev                          # `pulumi stack init dev` the first time
```

Create the two DNS zones first, so they can be delegated while the rest deploys:

```sh
pulumi up --stack dev \
  --target 'urn:pulumi:dev::webmio-hosting::aws:route53/zone:Zone::webmio-dev-sites-zone' \
  --target 'urn:pulumi:dev::webmio-hosting::aws:route53/zone:Zone::webmio-dev-net-zone'
pulumi stack output sitesNameServers
pulumi stack output netNameServers
```

Delegate each zone where its parent domain is hosted (Webglobe for `webmio.site` and
`webmio.net`): for `dev`, NS records for `dev.webmio.site` and `dev.webmio.net` with the four
name servers each; for `prod`, the domains' own name servers at the registrar. Check that the
parent answers with them:

```sh
dig +norec NS dev.webmio.site @ns1.webglobe.cz
```

Then deploy the rest. The wildcard certificate validates through the delegated zone, so this
waits until the delegation is live; CloudFront takes a few minutes more.

```sh
pulumi up --stack dev
```

## The admin's environment

The stack's outputs are the admin's variables (README, "Webmio hosting"):

```sh
pulumi stack output --stack dev --show-secrets --shell
```

prints `WEBMIO_HOSTING_BUCKET=…`, `WEBMIO_HOSTING_KVS_ARN=…`, `WEBMIO_HOSTING_DISTRIBUTION_ID=…`,
`WEBMIO_HOSTING_CONNECTION_GROUP_ID=…`, `WEBMIO_SITES_DOMAIN=…`, `WEBMIO_CNAME_DOMAIN=…`,
`AWS_REGION=…`, `AWS_ACCESS_KEY_ID=…` and `AWS_SECRET_ACCESS_KEY=…`, plus the zones' name
servers. Put the `WEBMIO_*` and `AWS_*` lines in the server's environment and restart it. For a
local admin against `dev`, put them in `apps/admin/.env`, which git ignores.

## Changes and maintenance

- **Edge code:** after changing `packages/edge`, rebuild and `pulumi up`. The function is
  published at once; the Lambda@Edge function gets a new version, and CloudFront takes a few
  minutes to roll it out.
- **Rotating the admin's key:** `pulumi up --replace 'urn:pulumi:<stack>::webmio-hosting::aws:iam/accessKey:AccessKey::webmio-<stack>-admin'`,
  then set the new outputs in the admin's environment and restart it.
- **Moving one website:** add a Route 53 record for its CNAME target
  (`<name>.sites.<netDomain>`) pointing elsewhere; it takes precedence over the wildcard, and
  the website's owner changes nothing.
- **Tearing a stack down:** `pulumi destroy --stack dev`. Delete the admin's custom domain
  tenants first (disconnect the domains in the admin). AWS deletes Lambda@Edge replicas hours
  after the distribution, so the function's deletion can fail at first: run `pulumi destroy`
  again later.
