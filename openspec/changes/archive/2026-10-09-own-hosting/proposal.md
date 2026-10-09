# Proposal

## Why

Webmio promises "one hosting, ours": the customer never picks a provider, pastes a token or pays
anyone else (`docs/strategy.md`, `docs/roadmap.md` phase 5). Today every website goes to the
workspace's own Netlify team, which needs a Netlify account and token per customer. Netlify's
terms also don't let us host customers' sites from our account without a reseller agreement. Own
hosting is the longest task before the private beta and doesn't depend on phases 3–4, so it can
start now.

## What Changes

- **Webmio hosting:** one S3 bucket and one CloudFront multi-tenant distribution in our AWS
  account serve every website. A CloudFront Function with a key-value store maps each hostname
  to its website's live publish. A new `PublishTarget` puts the exported site there.
- **The default for new websites.** When the server has Webmio hosting configured, a website that
  has never been published, or was restored after deletion, is published to Webmio hosting.
  Nothing has to be connected first. Websites already on Netlify keep publishing there through the
  workspace's connection. Moving them over and removing the Netlify adapter is a later change.
  Without the configuration (development, tests), publishing works as today.
- **A free address, `<name>.webmio.site`.** It comes from the website's name (`pekarna-u-lipy`),
  with a number added when the name is taken. It is the website's address until a custom domain
  is ready, and it redirects to that domain afterwards.
- **Atomic deploys that upload only what changed.** Each publish gets its own folder. Files the
  previous publish already had are copied inside S3, not uploaded again. The website switches to
  the new publish in one key-value store write, so visitors see all of it or none of it.
- **Rollback without re-uploading:** "Make live again" moves the pointer back. The files of the
  10 most recent successful publishes are kept. Older publishes stay in the history but can't be
  made live again.
- **Redirects and the site's 404 page** work as on Netlify. When a publish has no file at an
  address, a small Lambda@Edge function answers from that publish's own `_redirects`, with a
  301, or its `404.html`, with status 404. CloudFront Functions can't do this because they don't
  run on error responses.
- **Custom domains on our edge.** Each website with a domain becomes a CloudFront distribution
  tenant, and CloudFront issues the certificate for it.
  - Every website gets its own CNAME target, `<name>.sites.webmio.net`
    (`pekarna-u-lipy.sites.webmio.net`). We can then move one website to another part of our
    edge without its owner touching DNS.
  - A subdomain (`web.anideti.cz`) is served as itself, with a CNAME record to the target.
  - A bare domain (`pekarna.cz`) is served at `www.pekarna.cz`, which the owner points at the
    target with a CNAME record. The owner forwards the bare domain to `www` at the registrar, and
    the Domain page says so.
  - The states stay the same: waiting for DNS, issuing the certificate, ready.
- **Deleting a website takes it offline at once.** Its hostnames are removed from the key-value
  store, its tenant is deleted (which frees the domain), and its files are deleted.
- **The infrastructure as code:** a new `infra/` workspace package with a Pulumi (TypeScript)
  program. It sets up the bucket, the distribution, the function and its key-value store, the
  Lambda@Edge function, certificates, the `webmio.site` and `webmio.net` DNS zones, and an IAM
  user and policy for the admin, which doesn't run on AWS yet. The edge code is unit-tested in
  Node.
- **The Netlify connection** in the workspace settings is shown only to workspaces that are
  connected. With Webmio hosting there's no "connect Netlify first" state.

### Non-goals

- Moving existing Netlify sites over and removing the Netlify adapter, the workspace connection
  and the token storage (follow-up change).
- Previews on `webmio.site` and renaming a free address.
- Serving a bare domain directly: no static IPs and no Route 53 nameservers for customers.
  `domain-guides` (phase 6) explains forwarding for each registrar.
- The publish pipeline's link check, deploy verification and *Try again* (`safe-publishing`).
- Running the admin itself on AWS (`admin-on-aws`), and statistics from CDN logs.

## Capabilities

### New Capabilities

- `hosting`: Webmio hosting, the infrastructure that serves published websites:
  - hostnames mapped to live publishes;
  - pages, directory indexes, redirects and the 404 page served from a publish's folder;
  - the free `webmio.site` address and its redirect to a ready custom domain;
  - caching and content types;
  - publish retention;
  - the infrastructure program.

### Modified Capabilities

- `publishing`:
  - choosing the target (Webmio hosting for new websites when configured, Netlify for websites
    already on it);
  - the site address (`<name>.webmio.site`);
  - custom domains on Webmio hosting (CNAME to the website's own `<name>.sites.webmio.net`,
    `www` for bare domains);
  - rollback limited to retained publishes;
  - taking a deleted website offline on Webmio hosting;
  - the Netlify connection only where it is still used.

## Impact

- **`apps/admin`:**
  - `$lib/server/publishing/`: a Webmio hosting adapter (`webmio.ts`) over a narrow
    storage-and-edge interface, with an AWS SDK implementation and an in-memory fake for tests;
    choosing the target per project; free names; domain records and checks per provider.
  - `project_hosting.provider` gains `webmio`; a migration.
  - The Publish, Domain and workspace Hosting pages; Czech and English messages.
  - Configuration: `WEBMIO_HOSTING_BUCKET`, the key-value store ARN, the distribution and
    connection group IDs, the AWS region and credentials from the default chain.
- **A new `packages/edge`:** the CloudFront Function's router and the Lambda@Edge not-found
  handler as plain JavaScript, with tests. The admin's fake and the Pulumi program both use them.
- **A new `infra/`:** the Pulumi program (`@pulumi/pulumi`, `@pulumi/aws`), with `dev` and `prod`
  stacks.
- **New runtime dependencies in the admin:** `@aws-sdk/client-s3`,
  `@aws-sdk/client-cloudfront` and `@aws-sdk/client-cloudfront-keyvaluestore`, with its SigV4a
  signer.
- **Operations:**
  - an AWS account;
  - delegating `webmio.site` and `webmio.net` to Route 53;
  - deploying the stack and setting the admin's environment from its outputs;
  - documented in the README and in `infra/README.md`.
- **Docs:** the roadmap's phase 5 status.
