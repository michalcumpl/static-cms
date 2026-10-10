# Proposal

## Why

The private beta (phase 7, `docs/roadmap.md`) needs the admin running somewhere other than a
laptop, at `app.webmio.eu` (`docs/strategy.md`, "Brand and domains"). Today it keeps its
SQLite database and every uploaded image on the local disk, sends mail over whatever SMTP
server is configured, and reaches Webmio hosting with a long-lived IAM access key. A server
holding the only copy of customers' websites and images is one disk failure from losing them.
`admin-on-aws` puts the admin on one small EU server whose loss costs nothing that can't be
restored.

## What Changes

- **The admin runs on one EC2 instance** in `eu-central-1`: an ARM `t4g.small` running the
  admin's Docker image, with Caddy in front for HTTPS at `app.webmio.eu`. It is defined in
  `infra/` like Webmio hosting, as part of the `prod` stack (and of `dev`, at
  `app.dev.webmio.net`).
- **Nothing on the server is the only copy:**
  - **Media in S3.** Uploaded originals and the sizes made from them move from the media folder
    to a private bucket. The admin reads and writes them through a storage layer that keeps the
    folder for development and tests.
  - **SQLite replicated by Litestream** to a versioned S3 bucket, continuously. A new server
    restores the latest database before the admin starts.
- **An instance role instead of the access key.** The server gets exactly the permissions it
  uses: Webmio hosting, the media and backup buckets, sending mail, its logs and its image.
  The `dev` stack keeps its IAM user for a local admin.
- **Mail through Amazon SES** from `mail.webmio.net`, the mail-sending subdomain the strategy
  reserves. Its DKIM, SPF and DMARC records live in the Route 53 zone Pulumi manages. The SMTP
  and outbox mailers stay for other setups, development and tests.
- **Deploys from GitHub Actions.** After CI passes on `main`, the workflow:
  - builds the image on an ARM runner and pushes it to ECR;
  - rolls it onto the server through SSM and waits for the new admin to answer `/healthz`;
  - goes back to the previous image if it doesn't.

  GitHub signs in to AWS with OIDC, so no AWS key is stored in GitHub.
- **Monitoring and alerts** by email:
  - the site down, from a Route 53 health check of `/healthz`;
  - the server's status checks failing, which also recovers the instance automatically;
  - the disk filling up;
  - backups falling behind.

  The admin's and Litestream's logs go to CloudWatch Logs.
- **A health endpoint**, `/healthz`: it answers once the database opens and its latest
  migration is applied.
- **Moving an existing installation:** an admin command copies a media folder into the bucket,
  and the operator guide covers seeding the server from an existing database.

### Non-goals

- More than one server, a load balancer, or zero-downtime deploys. A deploy restarts the admin
  in a few seconds.
- Moving Webmio hosting's operations (it stays as `own-hosting` built it) or the remaining
  Netlify websites.
- Scheduled jobs such as backup restore drills or media cleanup (`scheduled-jobs`), and the
  status page.
- A staging environment beyond the `dev` stack.

## Capabilities

### New Capabilities

- `operations`: running the admin as a service:
  - its address and HTTPS;
  - the health endpoint;
  - backups of the database and media, and restoring them;
  - deploys and going back;
  - alerts;
  - sending mail.

### Modified Capabilities

None: images are still uploaded, served and cleaned up as the media spec says, only stored
elsewhere.

## Impact

- **`apps/admin`:**
  - a media storage layer (folder or S3) used by `media.ts`, the media route and project
    removal, with the file operations becoming async;
  - an SES mailer;
  - `/healthz`;
  - a `media-upload` admin command;
  - a `Dockerfile` and its `.dockerignore`.
- **`infra/`:** for `prod` and `dev`:
  - the instance with its Elastic IP and role;
  - the media and backup buckets, ECR, SES identities and DNS;
  - the GitHub OIDC provider and deploy role;
  - SSM parameters for secrets;
  - health checks, alarms and the alert topic;
  - the server's boot configuration (Docker, Caddy, Litestream, systemd units).
- **`.github/workflows/`:** a deploy job after CI on `main`.
- **New dependencies:** `@aws-sdk/client-sesv2` in the admin; Litestream v0.5 and Caddy 2.11 on
  the server (container images, pinned).
- **Operations:**
  - the `prod` stack deployed with `webmio.site` and `webmio.net` delegated;
  - an `app` A record at `webmio.eu`'s DNS host;
  - SES production access requested once;
  - documented in `infra/README.md`.
- **Docs:** the README's production section and the roadmap's phase 7 row.
