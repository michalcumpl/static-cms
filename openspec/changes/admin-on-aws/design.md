# Design

## Context

See proposal.md for why. The admin today is the SvelteKit app in `apps/admin`, built with
`adapter-node` into `dist/` and run with `node dist`:

- **Storage:** SQLite at `DATABASE_PATH`, with migrations from `drizzle/`.
- **Media:** `media.ts` keeps each project's media under `MEDIA_DIR/<projectId>/`:
  - variants (`<key>-<width>.webp`) and derived icon and share files beside them;
  - metadata-free originals under `originals/`.

  It uses synchronous `fs` calls, and so do the media route and `purgeProject`.
- **Mail:** nodemailer over `SMTP_URL`, or an outbox folder without it.
- **AWS:** Webmio hosting through the default credential chain. The `dev` stack's IAM user
  supplies the credentials today.
- **Infrastructure:** `infra/` is one Pulumi program (`src/index.ts`) with `dev` and `prod`
  stacks. State is in `s3://webmio-pulumi-state`; `dev` is deployed.
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck, tests, build and Playwright on every
  push and pull request. The repository is public, so GitHub's ARM runners are free.

## Goals / Non-Goals

**Goals:**
- **A disposable server:** terminating it loses at most seconds of database writes. A
  replacement comes up by itself from the infrastructure program, the replicated database and
  the media bucket.
- **The same image everywhere:** the `dev` stack runs exactly what `prod` runs, at
  `app.dev.webmio.net`.
- **Local development and tests unchanged:** a media folder, no AWS, the outbox mailer.

**Non-Goals:**
- High availability or zero-downtime deploys. SQLite with one writer means one server; a deploy
  restarts the admin.
- Containers orchestrated by ECS or Kubernetes.
- Hardening beyond the defaults: no SSH (SSM only), security groups open only on 80 and 443,
  IMDSv2 required. A WAF can come later.

## Decisions

### 1. One EC2 instance running containers under systemd

- **The instance:** a `t4g.small` (2 vCPU, 2 GB, arm64) on Amazon Linux 2023, in a default-VPC
  public subnet, with an Elastic IP.
  - Its root volume is a 20 GB `gp3` disk.
  - Its security group allows 80 and 443 from anywhere and nothing else. Access is through SSM
    Session Manager, with no SSH key.
- **Containers,** each a systemd unit running `docker run`:

  | Unit | What it runs |
  | --- | --- |
  | `webmio-restore` | oneshot: restores the database before the admin starts (decision 3) |
  | `webmio-admin` | the admin image from ECR, on a private Docker network, data in `/var/lib/webmio` |
  | `webmio-litestream` | Litestream replicating the same database file |
  | `webmio-caddy` | Caddy terminating HTTPS for the admin domain, with automatic certificates |

- **Configuration from SSM:** a small bootstrap in user data installs Docker, the CloudWatch
  agent and the units, then starts them. Each unit's `ExecStartPre` renders its configuration
  from SSM Parameter Store, under `/webmio/<stack>/admin/`:
  - the environment file;
  - the Caddyfile;
  - the Litestream configuration;
  - the image tag.

  So configuration changes need a restart, not a new instance.

*Alternative:* Docker Compose. Amazon Linux 2023 doesn't package the plugin, and systemd units
already give ordering, restart policies and journald. Rejected.

*Alternatives:* Lightsail, which lacks proper instance roles, and Fargate, where SQLite would
need EFS or a single pinned task. Both were decided against with the operator.

### 2. Media through a storage layer: a folder or S3

`apps/admin/src/lib/server/media-store.ts` defines the storage interface, with keys relative to
the media root (`<projectId>/<name>`, `<projectId>/originals/<name>`):

```ts
interface MediaStore {
  read(key: string): Promise<Uint8Array | undefined>;
  write(key: string, bytes: Uint8Array): Promise<void>;
  remove(keys: readonly string[]): Promise<void>;
  /** Names directly under a prefix ending in `/`. */
  list(prefix: string): Promise<string[]>;
  removePrefix(prefix: string): Promise<void>;
}
```

- **The folder store** keeps today's layout under `MEDIA_DIR`, with atomic writes through a
  temporary file and rename.
- **The S3 store** puts objects in the media bucket under the same keys. `MEDIA_BUCKET` selects
  it, otherwise the folder store is used.
- **`media.ts`** keeps its logic and only swaps `fs` calls for the store, which makes its
  readers `async`:
  - `variantFile`, `derivedSource`, `registerLegacyMedia` and `cleanupMedia` become async;
  - `purgeProject` calls `removePrefix(<projectId>/)` after the commit.
- **Order of writes:** "files first, row last" still holds, since a `PutObject` is atomic and
  durable before it returns.
- **The media route** adds `cache-control: private, max-age=31536000, immutable`. Variant and
  derived names include the content hash, so a name never changes meaning. Browsers then fetch
  each image once, instead of the admin reading S3 on every page.

*Alternative:* serving images from S3 through presigned URLs. Every image URL in the editor and
preview would change and expire. Rejected for now; the cache header gets most of the benefit.

### 3. SQLite with Litestream: continuous replication and restore on boot

- **Replication:** Litestream v0.5.17 replicates `/var/lib/webmio/app.db` to
  `s3://<backups>/admin/`. The bucket is versioned, private, and kept for 30 days by a
  lifecycle rule. Litestream's retention (30 days) and snapshot interval (daily) are set in its
  configuration; the v0.5 configuration keys are checked against its documentation when it is
  written.
- **Restore on boot:** `webmio-restore` runs before the admin.
  - It runs `litestream restore -if-db-not-exists -if-replica-exists`.
  - If there is no replica yet but an object `seed/app.db` exists in the backups bucket, it
    downloads that instead. This is how an existing installation's database arrives
    (decision 9).
  - Then the admin starts.
- **Restoring an earlier moment** (the spec's 30 days): the operator guide runs
  `litestream restore -timestamp <time>` into a new file, stops the admin, swaps the file, and
  starts the admin again.
- **The backup alarm:** a systemd timer reads the time of Litestream's latest replicated
  position every minute and publishes it to CloudWatch as `ReplicaLagSeconds`, through the
  CloudWatch agent's StatsD or `aws cloudwatch put-metric-data`. The alarm fires above 300
  seconds, and also when the metric is missing.

### 4. A role, not a key

The instance profile's role gets:
- **Webmio hosting:** the same statements as the `dev` IAM user's policy. They are extracted into
  one function in `infra/src/hosting.ts` and used by both.
- **Its buckets:** read and write on the media bucket, and on the backups bucket for Litestream.
- **Mail:** `ses:SendEmail` and `ses:SendRawEmail` for the `mail.<netDomain>` identity.
- **Its parameters:** `ssm:GetParameter*` on `/webmio/<stack>/admin/*`, and `kms:Decrypt` for
  them.
- **Its image:** ECR pull from the admin repository.
- **Logs and metrics:** `logs:*` on its log groups and `cloudwatch:PutMetricData`.
- **Session Manager:** the managed policy `AmazonSSMManagedInstanceCore`.

The admin needs no code change for this: the AWS SDK's default chain already picks up the
instance role through IMDSv2. In `prod` the IAM user and its access key are not created at all
(a stack setting, `localAdminUser`, true only for `dev`).

### 5. Mail through SES

- **The sender:** an SES domain identity for `mail.<netDomain>`, with Easy DKIM. Its DNS lives
  in the `netDomain` zone Pulumi already manages:
  - three DKIM CNAMEs;
  - a custom MAIL FROM domain, `bounce.mail.<netDomain>`, with its MX record and SPF TXT;
  - DMARC at `_dmarc.mail.<netDomain>`, `p=none` with reports to the operator, tightened once
    mail flows cleanly.
- **The mailer:** `createMailer` gets a third mode. `MAIL_TRANSPORT=ses` uses nodemailer's SES
  transport over `@aws-sdk/client-sesv2`, sending from `MAIL_FROM`
  (`Webmio <prihlaseni@mail.webmio.net>`). SMTP and the outbox stay as they are.
- **Production access:** SES starts in the sandbox, so requesting production access is a step
  in the operator guide. Until then, mail only reaches verified addresses.

### 6. Deploys: GitHub Actions, ECR and SSM

- **The workflow:** `.github/workflows/deploy.yml` runs `on: workflow_run` of CI, on `main`,
  when CI succeeded, for every stack in the repository variable `DEPLOY_STACKS` (`["dev"]`
  until `prod` exists). It also runs on `workflow_dispatch`, which deploys any branch to one
  stack. Each stack's job:
  1. runs on `ubuntu-24.04-arm` with `permissions: id-token: write`, in the GitHub environment
     named after the stack, whose variables are the stack's outputs `AWS_DEPLOY_ROLE_ARN` and
     `ECR_REPOSITORY`;
  2. assumes the stack's deploy role through GitHub's OIDC provider. The role trusts only
     `repo:michalcumpl/webmio:environment:<stack>`, since a job in an environment gets that
     subject rather than its branch. The `prod` environment's branch rule allows only `main`;
     `dev` allows any branch, for testing a branch there.
     - The account has one OIDC provider for GitHub. `dev` creates it and keeps it when
       destroyed; `prod` sets `githubProvider: existing`.
  3. builds `apps/admin/Dockerfile` and pushes it to ECR tagged with the commit SHA, unless
     that tag is already there (tags are immutable);
  4. runs `/usr/local/bin/webmio-deploy <sha>` on the instance with `aws ssm send-command`,
     finding the instance by its tag, and waits for the command;
  5. fails if the command failed.
- **`webmio-deploy` on the instance:**
  1. pulls the image;
  2. writes the tag to `/webmio/<stack>/admin/image`, remembering the previous one;
  3. restarts `webmio-admin`;
  4. polls `http://localhost:3000/healthz` for up to two minutes;
  5. if it never answers, it writes the previous tag back, restarts the admin, and exits
     non-zero.
- **The deploy role's permissions:** ECR push to the one repository, `ssm:SendCommand` limited
  to the `AWS-RunShellScript` document and instances tagged `webmio-admin=<stack>`, and reading
  command results.
- **Migrations** run when the admin opens its database, as today. A migration is applied before
  `/healthz` answers, so a failed migration counts as a failed deploy. Migrations only add, so
  going back to the previous image after a migration ran is safe.

### 7. The image

`apps/admin/Dockerfile` builds from the repository root:

- **Build stage** (`node:22-bookworm-slim`):
  1. `corepack` and pnpm;
  2. `pnpm install --frozen-lockfile`;
  3. `pnpm turbo run build --filter @webmio/admin...`;
  4. `pnpm --filter @webmio/admin deploy --prod /app`, which gives the production dependencies
     with the workspace packages' `dist`. sharp and better-sqlite3 install their linux-arm64
     builds here.
- **Runtime stage** (`node:22-bookworm-slim`):
  - `/app`, the admin's `dist/` and `drizzle/`, running as user `node`;
  - `MIGRATIONS_DIR=/app/drizzle` and `NODE_ENV=production`;
  - `CMD ["node", "dist"]`;
  - a `HEALTHCHECK` on `/healthz`.

A `.dockerignore` keeps `node_modules`, `data/`, `.svelte-kit` and test output out of the build
context. The image takes no secrets at build time.

### 8. Monitoring and alerts

- **The alert topics:** an SNS topic `webmio-<stack>-alerts` with the operator's email (stack
  setting `alertEmail`), in `eu-central-1` and in `us-east-1`. Route 53 health check metrics
  exist only in `us-east-1`. The operator confirms both subscriptions once.
- **The alarms:**

  | Watch | Fires on | Action |
  | --- | --- | --- |
  | Route 53 HTTPS health check on `https://<adminDomain>/healthz`, every 30 seconds from three regions | 3 minutes failing (`HealthCheckStatus` < 1) | alarm in `us-east-1`, email |
  | `StatusCheckFailed_System` | failure | EC2 recover action, email |
  | `StatusCheckFailed_Instance` | failure | email |
  | `disk_used_percent` on `/`, from the CloudWatch agent | above 80 % | email |
  | `ReplicaLagSeconds` (decision 3) | above 300, or missing | email |

  Every alarm also emails when it returns to OK.
- **Logs:** each container uses Docker's `awslogs` driver, into `/webmio/<stack>/admin`,
  `/litestream` and `/caddy`, kept for 30 days.

### 9. Address, DNS and moving in

- **The address:** stack settings `adminDomain` (`app.webmio.eu` for `prod`,
  `app.dev.webmio.net` for `dev`) and `adminZone` (the Route 53 zone to put its A record in,
  when there is one).
  - `app.webmio.eu`'s DNS is at Webglobe, not in Route 53, so `prod` outputs the Elastic IP and
    the operator adds the A record.
  - `dev` creates its record itself.
- **Before the first deploy:** Caddy obtains the certificate on the first request once DNS
  points at the Elastic IP. The bootstrap starts with the newest image tag in ECR; the
  workflow's first run or a `workflow_dispatch` puts one there before the first boot is useful.
- **Moving an existing installation in:**
  - `pnpm admin media-upload` copies a media folder into `MEDIA_BUCKET` with the same keys,
    skipping objects that exist with the same size.
  - The operator uploads the database to `seed/app.db` before the server first boots.
  - Both steps are in the operator guide. Today's local data, from the example sites, can
    move over the same way, or the server can start empty.

### 10. Infrastructure program layout

`infra/src/index.ts` is split:
- `hosting.ts`: everything `own-hosting` created, unchanged, so Pulumi sees no difference;
  resource names stay as they are;
- `admin.ts`: decisions 1 and 3 to 9;
- `github.ts`: the OIDC provider and deploy role;
- `index.ts`: the outputs.

The admin's environment, previously copied from stack outputs by hand, becomes SSM parameters
the server reads. The old outputs stay for a local admin against `dev`.

New stack settings:

| Setting | `prod` | `dev` |
| --- | --- | --- |
| `adminDomain` | `app.webmio.eu` | `app.dev.webmio.net` |
| `adminZone` | none (Webglobe) | the `dev.webmio.net` zone |
| `alertEmail` (secret: the repository is public) | the operator's address | the operator's address |
| `localAdminUser` | false | true |
| `githubProvider` | `existing` | `create` (the default) |
| `adminSecretKey` (secret) | set once with `pulumi config set --secret` | set once |

## Risks / Trade-offs

- **[One server is a single point of failure]** → Recovery is automatic for hardware faults
  (EC2 recover), and a replacement restores itself (Server replaced). Downtime is minutes, which
  is acceptable for an invite-only beta.
- **[Litestream v0.5's configuration and restore flags differ from v0.3's]** → The tasks verify
  the configuration against the release's documentation, and the restore drill (tasks) proves
  it on `dev` before `prod`.
- **[Losing the last seconds of writes on a crash]** → Litestream syncs to S3 every second by
  default. The spec allows "the last few seconds".
- **[Image reads through the admin are slower from S3]** → The immutable cache header means
  each browser fetches an image once. Publishing reads the variants it exports; S3 in the same
  region answers in milliseconds.
- **[SES sandbox delays sign-ups]** → Production access is requested while `dev` is being
  verified. Until then, invited beta users are verified addresses.
- **[A deploy during an upload or publish interrupts it]** → Publishes are marked interrupted
  on start, as today. Uploads fail and can be retried. Deploys happen on merge, which the
  operator controls.
- **[ECR images pile up]** → A lifecycle policy keeps the newest 20.
- **[Cost]** → About €15 a month for `prod`: instance, disk, IP, CloudWatch and alerts. `dev`
  can be stopped when unused.

## Migration Plan

1. Merge with `MEDIA_BUCKET` and `MAIL_TRANSPORT` unset. Local development and CI are unchanged.
2. Deploy the `dev` stack's admin part, run the first deploy by `workflow_dispatch`, and check
   `app.dev.webmio.net`: sign in, upload, publish, and the alarms.
3. Run the restore drill on `dev`: terminate the instance and check the replacement.
4. Deploy `prod`:
   - delegate `webmio.site` and `webmio.net` to Route 53, as `own-hosting`'s `prod` needs;
   - add `app.webmio.eu`'s A record;
   - request SES production access;
   - seed the database and media if moving an installation.
5. **Rollback:** the old local setup keeps working, since `MEDIA_DIR` and `SMTP_URL` still work.
   A bad deploy goes back to the previous image (decision 6). A bad server is replaced from the
   backups.
