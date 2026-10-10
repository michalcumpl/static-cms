# Webmio infrastructure

Webmio's AWS resources, as a [Pulumi](https://www.pulumi.com) program in TypeScript. One stack
per environment, `dev` and `prod`, in the same AWS account. The program has these parts:

- **`src/hosting.ts`:** Webmio hosting, which serves every published website (own-hosting
  design.md decision 13).
- **`src/admin.ts`:** the admin's server (admin-on-aws). The files the server runs are in
  `server/`.
- **`src/redirect.ts`:** the redirect server for customers' bare domains (bare-domain-redirect).
  Its files are in `server/redirect/`.
- **`src/alerts.ts`:** the alert topics both servers' alarms email through.
- **`src/github.ts`:** deploys from GitHub Actions.

## Webmio hosting

| Resource | What it does |
| --- | --- |
| S3 bucket `webmio-<stack>-sites-…` | every website's publishes, under `sites/<siteId>/<deployId>/`; private |
| CloudFront key-value store | `h:<hostname>` → website, `s:<siteId>` → live publish |
| CloudFront Function (viewer request) | routes each request to its website's live publish (`packages/edge/src/router.js`) |
| Lambda@Edge (origin response, `us-east-1`) | a missing address: the publish's redirect, or its `404.html` (`packages/edge/src/not-found.js`) |
| Multi-tenant distribution, connection group | serves everything; custom domains join as tenants, created by the admin |
| Tenant `webmio-<stack>-free-addresses` | `*.<sitesDomain>`, with an ACM wildcard certificate |
| Route 53 zones `<sitesDomain>`, `<netDomain>` | `*.<sitesDomain>` and `*.sites.<netDomain>` point at the connection group |
| IAM user `webmio-<stack>-admin` | a local admin's access to the hosting: the bucket's `sites/`, the key-value store, tenants; only with `localAdminUser` |

## The admin's server

| Resource | What it does |
| --- | --- |
| EC2 `webmio-<stack>-server` (`t4g.small`, Amazon Linux 2023) and its Elastic IP | runs the admin, Litestream and Caddy as Docker containers under systemd (`server/`) |
| Role `webmio-<stack>-server` | the server's access: hosting, its buckets, SES, its parameters, ECR, logs, metrics, Session Manager |
| S3 `webmio-<stack>-media-…` | every project's images, under `<projectId>/` |
| S3 `webmio-<stack>-backups-…` | Litestream's replica under `admin/`; `seed/app.db` when moving in; versioned, 30 days |
| ECR `webmio-<stack>-admin` | the admin's images, tagged with their commit; the newest 20 are kept |
| Parameters `/webmio/<stack>/admin/` | `env`, `secret-key`, `caddyfile`, `litestream`, and `image` (the tag running, set by deploys) |
| SES identity `mail.<netDomain>` | sign-in and invitation mail, with DKIM, MAIL FROM `bounce.mail.<netDomain>` and DMARC |
| SNS `webmio-<stack>-alerts` (both regions), Route 53 health check, CloudWatch alarms | email when the admin is down, the server fails, the disk is over 80 %, or the backup lags |
| Log groups `/webmio/<stack>/admin`, `/litestream`, `/caddy` | the containers' logs, 30 days |
| OIDC provider, role `webmio-<stack>-deploy` | GitHub Actions pushes images and runs `webmio-deploy` |

## The redirect server

Webmio hosting serves a custom domain at `www.<domain>`. A bare domain's A record points at
this server instead, which redirects every request to `https://www.<domain>/<path>` with a 301,
keeping the path and query. Its Caddy gets each bare domain's certificate on the first visit,
after asking the admin (`GET /hosting/bare-domain?domain=`) whether the domain is connected to
a website. Redirects that already have a certificate keep working while the admin is down, and
HTTP redirects never ask.

| Resource | What it does |
| --- | --- |
| EC2 `webmio-<stack>-redirect` (`t4g.nano`, Amazon Linux 2023) | runs Caddy as a Docker container under systemd (`server/redirect/`) |
| Elastic IP `webmio-<stack>-redirect` | the address customers' `@` A records name; the `redirectAddress` output |
| Role `webmio-<stack>-redirect` | Session Manager and its log group, nothing else |
| Route 53 health check, CloudWatch alarms | email when it stops answering or fails its status checks |
| Log group `/webmio/<stack>/redirect/caddy` | Caddy's log (certificates, errors; not each request), 30 days |

It costs about €7 a month. Things to know:

- **Never release its address.** Every customer's bare domain names it. Pulumi protects it:
  `pulumi destroy`, turning `redirectServer` off, or a change that would replace it stops with
  an error. Releasing it on purpose takes `pulumi state unprotect` first.
- **Its configuration is in its user data,** so a change to `server/redirect/` or to its Caddy
  version replaces the server. The address moves to the new one, and bare domains don't
  answer for the two minutes or so that takes; `www.` keeps working. The new server has no
  certificates yet: each bare domain gets its own again on its next visit, or when its domain
  check runs (the Domain page in the admin).
- **Replacing it** by hand:

  ```sh
  pulumi up --stack dev --replace 'urn:pulumi:dev::webmio-hosting::aws:ec2/instance:Instance::webmio-dev-redirect'
  ```

- **Checking it:**

  ```sh
  curl -i "http://$(pulumi stack output redirectAddress --stack dev)/healthz"   # 200
  curl -sI http://cumpl.cz/kontakt/                                            # 301 to https://www.cumpl.cz/kontakt/
  aws logs tail /webmio/dev/redirect/caddy --since 1h
  ```

- **Running a command on it:** as on the admin's server, through Session Manager with
  `--target "$(pulumi stack output redirectServer --stack dev)"`. Caddy runs as
  `webmio-redirect.service`.

## Stacks

| Setting | `dev` | `prod` |
| --- | --- | --- |
| `sitesDomain` | `dev.webmio.site` | `webmio.site` |
| `netDomain` | `dev.webmio.net` | `webmio.net` |
| `adminDomain` | `app.dev.webmio.net` | `app.webmio.eu` |
| `adminZone` | `dev.webmio.net` | none: its DNS is at Webglobe |
| `localAdminUser` | `true` | `false` |
| `githubProvider` | `create` | `existing` |
| `redirectServer` | `true` | `true` |
| `adminSecretKey`, `alertEmail` | secrets, set once | secrets, set once |

The secrets stay out of the repository, which is public:

```sh
openssl rand -base64 48 | pulumi config set --secret adminSecretKey --stack prod
pulumi config set --secret alertEmail you@example.com --stack prod
```

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

Then set the stack's secrets (Stacks, above) and deploy the rest. The wildcard certificate
validates through the delegated zone, so this waits until the delegation is live; CloudFront
takes a few minutes more.

```sh
pulumi up --stack dev
```

### After the first deploy

1. **Alerts:** AWS sends `alertEmail` two subscription emails, one per region. Confirm both, or
   no alarm reaches you.
2. **The admin's address:**
   - `dev` creates the A record for `app.dev.webmio.net` itself.
   - For `prod`, add an A record for `app.webmio.eu` at Webglobe, pointing at
     `pulumi stack output adminAddress --stack prod`.

   Caddy gets the certificate on the first request once DNS points at the server.
3. **GitHub:** create the environment named after the stack, and give it the stack's outputs:

   ```sh
   gh api -X PUT repos/michalcumpl/webmio/environments/prod
   gh variable set AWS_DEPLOY_ROLE_ARN --env prod --body "$(pulumi stack output AWS_DEPLOY_ROLE_ARN --stack prod)"
   gh variable set ECR_REPOSITORY --env prod --body "$(pulumi stack output ECR_REPOSITORY --stack prod)"
   gh variable set DEPLOY_STACKS --body '["dev","prod"]'
   ```

   - In the repository's settings, limit the `prod` environment's deployment branches to `main`.
   - The deploy role trusts only the GitHub environment named after its stack. GitHub names
     the repository with immutable IDs in its tokens:
     `repo:michalcumpl@134929375/webmio@1394510292:environment:<stack>`. Check the form with
     `gh api repos/michalcumpl/webmio/actions/oidc/customization/sub`.
4. **The first image:** run the Deploy workflow by hand (`gh workflow run deploy.yml -f stack=prod`).
   - Until the first deploy, the server keeps retrying; it starts the newest image in the
     repository.
   - Without a replica or `seed/app.db` (Moving in, below), it starts with an empty database.
5. **The first account,** on the server (Running a command on the server, below):

   ```sh
   docker exec webmio-admin node dist/cli/admin.js create-user you@example.com "Your workspace"
   ```

   This prints a sign-in link. Webmio is invite-only: the sign-in page sends links only to
   existing accounts, and says "sent" either way.
6. **Mail out of the SES sandbox:** until AWS grants production access, SES sends only to
   verified addresses.
   - Request it in the SES console (Account dashboard → Request production access): transactional
     mail, sign-in links and invitations.
   - Meanwhile, verify a tester's address with
     `aws sesv2 create-email-identity --region eu-central-1 --email-identity them@example.com`;
     they confirm it by email.
   - Google and others mail daily DMARC reports to `alertEmail`; a filter can archive them.

## Running the admin

### Deploys

- **Automatic:** every push to `main` whose CI passes is deployed to the stacks in the
  repository variable `DEPLOY_STACKS` (`.github/workflows/deploy.yml`).
- **By hand,** any branch to one stack:
  `gh workflow run deploy.yml --ref <branch> -f stack=dev`. Testing a branch on `dev` is
  allowed; `prod` takes only `main`.
- **What a deploy does:**
  1. It builds `apps/admin/Dockerfile` for arm64 and pushes it to ECR as `<commit>`.
  2. It runs `/usr/local/bin/webmio-deploy <commit>` on the server through SSM.
  3. The server starts the new image and waits up to two minutes for `/healthz`.
  4. If `/healthz` doesn't answer, it starts the previous image again, and the workflow fails.
  5. Migrations run when the admin starts. They only add, so going back is safe.

### Running a command on the server

There is no SSH. Open a shell through Session Manager (`aws ssm start-session --target
"$(pulumi stack output adminServer --stack dev)"`, with the Session Manager plugin), or run one
command:

```sh
aws ssm send-command --instance-ids "$(pulumi stack output adminServer --stack dev)" \
  --document-name AWS-RunShellScript --parameters 'commands=["systemctl is-active webmio-admin"]'
```

On the server:

- **The admin command:** `docker exec webmio-admin node dist/cli/admin.js <command>`, the same
  commands as `pnpm admin` (`create-user`, `media-cleanup`, `load-site`, `import-site`).
- **Units:** `webmio-restore` (once at boot), `webmio-admin`, `webmio-litestream`,
  `webmio-caddy`, and the `webmio-replica-lag` timer. `systemctl status <unit>`;
  `journalctl -u <unit>` for what they printed before the containers started.
- **Logs:** the containers' logs are in CloudWatch:
  `aws logs tail /webmio/dev/admin --region eu-central-1 --since 1h`.
- **Configuration:** each unit renders its configuration from the parameters under
  `/webmio/<stack>/admin/` when it starts. After `pulumi up` changes a parameter, restart the
  unit: `systemctl restart webmio-admin`.

### Replacing the server

The server is disposable. A replacement restores the database from the replica and the media
are in S3. It comes up by itself only for a hardware fault (EC2 recover). After a terminated or
broken server, or to take a newer Amazon Linux:

```sh
pulumi up --stack dev --refresh
```

- **What happens:** the old server is deleted before the new one is created, so two servers
  never write to the replica.
- **The `dev` drill:** the admin was down for 2½ to 3¼ minutes, and no writes were lost, even
  with the server terminated 5 seconds after a write.
- **Changing a file in `server/`** also replaces the server on the next `pulumi up`.

### Restoring an earlier moment

Litestream keeps 30 days. To put the database back to a moment, on the server:

```sh
cd /var/lib/webmio
ls="docker run --rm --user 1000:1000 -v /var/lib/webmio:/data -v /etc/webmio/litestream.yml:/etc/litestream.yml:ro litestream/litestream:0.5.17"

# 1. The moment, in UTC, into a separate file; check it before going on.
$ls restore -timestamp 2026-10-09T13:44:00Z -o /data/earlier.db /data/app.db
dnf install -y sqlite && sqlite3 -readonly earlier.db 'select email from users'

# 2. Swap it in, with the admin and Litestream stopped; the current database is kept aside.
systemctl stop webmio-admin webmio-litestream
mkdir before-restore && mv app.db app.db-wal app.db-shm before-restore/
mv earlier.db app.db && chown -R 1000:1000 /var/lib/webmio
$ls reset /data/app.db
systemctl start webmio-litestream webmio-admin
```

- **Why the reset:** it clears Litestream's local records of the database that was replaced, so
  it starts afresh from the restored one. It logs "detected database behind replica" and goes
  on from the replica's latest transaction number. This is the procedure that was tested; it
  wasn't tried without the reset.
- **Afterwards:** it replicates the restored database as the latest state.
- **Going back:** swap `before-restore/` in the same way.
- **On `dev`:** restoring 13:44 gave the admin exactly what it held then, and swapping back
  restored today.

### Moving an installation in

To start a new server with an existing installation's data:

1. **The database:** before the server first boots, put it where the restore looks when there
   is no replica:

   ```sh
   sqlite3 apps/admin/data/app.db ".backup /tmp/app.db"
   aws s3 cp /tmp/app.db "s3://$(pulumi stack output adminBackupsBucket --stack prod)/seed/app.db"
   ```

2. **The media:** copy the media folder into the bucket, under the same names. It's safe to
   run again, and skips files already there with the same size.

   ```sh
   cd apps/admin
   MEDIA_DIR=data/media AWS_REGION=eu-central-1 \
     MEDIA_BUCKET="$(pulumi stack output adminMediaBucket --stack prod --cwd ../../infra)" \
     pnpm admin media-upload
   ```

   It uses your AWS credentials, which need write access to the bucket.

### Alarms

Each alarm emails `alertEmail`, and again when it recovers. In the `dev` check:

| Alarm | Fires on | Fired after |
| --- | --- | --- |
| `admin-down` (`us-east-1`) | `https://<adminDomain>/healthz` failing for 3 minutes, checked from three regions | about 5 minutes |
| `server-disk` | the disk over 80 % | about 4 minutes |
| `replica-lag` | the replica more than 5 minutes behind, or its metric missing (Litestream stopped) | about 8½ minutes |
| `server-system-check` | a hardware fault; EC2 also moves the server to other hardware | |
| `server-instance-check` | the operating system not responding | |
| `redirect-down` (`us-east-1`) | `http://<redirectAddress>/healthz` failing for 3 minutes, checked from three regions | |
| `redirect-system-check` | the redirect server's hardware fault; EC2 also moves it to other hardware | |
| `redirect-instance-check` | the redirect server's operating system not responding | |

All recovered within 4 minutes of the fix.

## Running the admin locally against `dev`

With `localAdminUser`, the stack has an IAM user for a local admin. Its outputs are the
variables a local admin needs (README, "Webmio hosting"):

```sh
pulumi stack output --stack dev --show-secrets --shell
```

This prints `WEBMIO_HOSTING_*`, `WEBMIO_SITES_DOMAIN`, `WEBMIO_CNAME_DOMAIN` and `AWS_*` lines,
among the other outputs. Put them in `apps/admin/.env`, which git ignores.

## Changes and maintenance

- **Edge code:** after changing `packages/edge`, rebuild and `pulumi up`. The function is
  published at once; the Lambda@Edge function gets a new version, and CloudFront takes a few
  minutes to roll it out.
- **Rotating the local admin's key:** `pulumi up --replace 'urn:pulumi:<stack>::webmio-hosting::aws:iam/accessKey:AccessKey::webmio-<stack>-admin'`,
  then put the new outputs in `apps/admin/.env`. The server needs no key: it uses its role.
- **The images Caddy and Litestream run** are pinned in `src/admin.ts`. A new version takes
  effect with the next `pulumi up`, which replaces the server.
  The redirect server's Caddy is pinned in `src/redirect.ts`, and replaced the same way.
- **Moving one website:** add a Route 53 record for its CNAME target
  (`<name>.sites.<netDomain>`) pointing elsewhere; it takes precedence over the wildcard, and
  the website's owner changes nothing.
- **Tearing a stack down:** `pulumi destroy --stack dev`. Delete the admin's custom domain
  tenants first (disconnect the domains in the admin). The `prod` stack's buckets and image
  repository refuse to be deleted while they hold anything; `dev`'s are emptied. GitHub's OIDC
  provider stays for the other stack. AWS deletes Lambda@Edge replicas hours
  after the distribution, so the function's deletion can fail at first: run `pulumi destroy`
  again later. The redirect server's address is protected: run `pulumi state unprotect` on it
  first, and release it in the EC2 console afterwards, since Pulumi leaves it in AWS.
