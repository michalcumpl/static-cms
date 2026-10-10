## Why

Webmio hosting serves a custom domain only at `www.<domain>`: CloudFront can't be the target of
a bare domain's A record without its Anycast static IPs, reported at $3,000 a month. So today
the Domain page asks the owner to forward the bare domain at their registrar. Registrars'
forwarding is often HTTP only, Webglobe's for one. On `cumpl.cz` it drops the path, and
`https://cumpl.cz` shows a certificate error, which is the first thing many visitors type. That
isn't good enough for the beta.

## What Changes

- **A redirect server of our own.** A `t4g.nano` with an Elastic IP that never changes, running
  Caddy, in every stack (≈ €7 a month). It answers `http://` and `https://<domain>/<path>` with
  a 301 to `https://www.<domain>/<path>`, keeping the path and query.
- **Certificates on demand.** The server gets a certificate for a bare domain the first time
  someone visits it. Before that, it asks the admin whether the domain is connected to a website
  on Webmio hosting. It asks only when it issues or renews a certificate, so admin deploys and
  outages don't stop redirects that already work. A domain the admin doesn't know gets no
  certificate. Over HTTP it gets the "No website here" page.
- **The Domain page asks for an A record instead of forwarding.** For a bare domain it shows two
  records, `www CNAME <name>.sites.webmio.net` and `@ A <redirect address>`, and asks the owner
  to remove the registrar's forwarding and any other `@` A or AAAA records. The forwarding
  sentence stays only where there is no redirect server, as in development and tests.
- **The domain check also checks the bare domain.** It shows its own state: waiting for DNS,
  issuing the certificate, or redirecting. The check confirms the whole chain by requesting
  `https://<domain>/`, which also makes the server get the certificate before the first visitor
  does. The domain's overall readiness, and so the free address's redirect, still depends on
  `www` only. Owners who keep their registrar's forwarding lose nothing they have today.
- **An alarm** when the redirect server stops answering, and automatic recovery when its status
  checks fail, as for the admin's server.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hosting`: a new requirement for bare domains redirecting to `www.` over HTTPS. The
  infrastructure requirement adds the redirect server and its permanent address.
- `publishing`: the custom-domain requirement asks for an A record instead of the registrar's
  forwarding, and checks the bare domain's own state.
- `operations`: the alerts requirement adds the redirect server being down.

## Impact

- **Infrastructure:**
  - a new `infra/src/redirect.ts`: the instance, its Elastic IP (protected from deletion), a
    security group for 80 and 443, the role, the log group, the health check and alarms;
  - a Caddyfile and systemd unit in `infra/server/`;
  - a stack setting to turn it off, and a new output, `redirectAddress`;
  - the admin's environment in Parameter Store gains `WEBMIO_REDIRECT_ADDRESS`.
- **Admin:**
  - a new public endpoint the redirect server asks before issuing a certificate;
  - `domains.ts`: the records, the bare domain's check and its state;
  - a migration adding `project_hosting.apex_state`;
  - `DomainPanel.svelte` and its English and Czech texts.
- **Docs:** `infra/README.md` gets the redirect server's section. `docs/roadmap.md` marks the
  change done when it's archived.
- **Cost:** about €7 a month per stack (instance, Elastic IP, disk, health check).
- **Existing websites:** `cumpl.cz` on `dev` keeps working through Webglobe's forwarding until
  its `@` A record is changed. Nothing is migrated.
- **Not in scope:**
  - IPv6 (no AAAA record for the server);
  - CloudFront's Anycast static IPs;
  - the free address's cached 301 and checking domains on a schedule (both in `docs/tasks.md`).
