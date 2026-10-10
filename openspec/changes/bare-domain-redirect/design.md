# Design

## Context

See proposal.md for why. Today:

- **Domains:** `apps/admin/src/lib/server/publishing/domains.ts` serves a bare domain at
  `www.` on Webmio hosting (`servedHost`).
  - `domainInstructions` returns one CNAME record plus `forwardTo`, which `DomainPanel.svelte`
    shows as a sentence asking for the registrar's forwarding.
  - `checkDomain` resolves the CNAME and asks CloudFront about the certificate, then stores
    `domainState` in `project_hosting`.
  - When the state changes to or from ready, it switches the free address's redirect in the
    key-value store.
  - The panel checks again when it opens, unless the domain is ready.
- **Configuration:** the admin learns about Webmio hosting from `WEBMIO_*` variables
  (`webmioBackend`). On the server they come from the SSM environment parameter that
  `infra/src/admin.ts` writes.
- **Infrastructure:** `infra/src/admin.ts` already runs one EC2 server whose containers are
  systemd units writing to CloudWatch Logs, configured by gzipped user data. It also has the
  alert topics (one in the stack's region, one in us-east-1 for Route 53's health checks), a
  Route 53 health check, and status-check alarms with EC2's automatic recovery. The redirect
  server reuses those patterns.
- **Caddy 2.11.4** already terminates the admin's HTTPS. Its on-demand TLS gets a certificate
  during the first TLS handshake for a hostname, after an HTTP `ask` endpoint answers 200 for
  `?domain=<name>`.

## Goals / Non-Goals

**Goals:**
- **An address that never changes:** customers' `@` A records name it, so losing it would
  break every bare domain at once.
- **A server that recovers alone and needs no deploys:** no state worth keeping, no part in
  GitHub deploys, replaced by `pulumi up` when its configuration changes.
- **Redirects that keep working while the admin is down,** over HTTP and HTTPS.

**Non-Goals:**
- Serving anything other than redirects, such as a bare domain's own website.
- High availability. One small instance; while it's being replaced or recovered, bare domains
  don't answer, but `www.` does.
- IPv6.

## Decisions

### 1. A separate `t4g.nano`, not Caddy on the admin's server

- **Why separate:** the admin's server is replaced on every change to its files, and its Caddy
  serves one hostname. Putting customers' bare domains on it would tie their redirects to admin
  deploys and replacements, and mix customers' traffic with the admin's.
- **Cost:** about €3 a month for the instance, €3.50 for the IPv4 address, €0.60 for an 8 GB
  `gp3` disk and €0.50 for the health check, so ≈ €7 a month.
- **The rest:**
  - Amazon Linux 2023, arm64, in the default VPC like the admin;
  - IMDSv2 only;
  - a security group for 80 and 443 from anywhere;
  - SSM for access, with no SSH.
- **Alternatives:**
  - CloudFront's Anycast static IPs: $3,000 a month, later.
  - Global Accelerator in front of an ALB: about $40 a month and still needs a certificate per
    domain.
  - A redirect S3 bucket: it can't do HTTPS for a domain.

### 2. The Elastic IP is its own resource, protected

- **The resources:** an `aws.ec2.Eip` with no instance, attached by an `aws.ec2.EipAssociation`.
  A replaced instance only moves the association.
- **Protection:** the Elastic IP has Pulumi's `protect: true` and `retainOnDelete: true`, so
  `pulumi destroy` or a refactor can't release it. Releasing it on purpose takes an explicit
  `pulumi state unprotect`.
- **The output:** `redirectAddress`.

### 3. Caddy with on-demand TLS, its configuration in user data

There is no SSM rendering step: the Caddyfile depends only on the admin's address, so user data
carries it. A change replaces the instance (`userDataReplaceOnChange`), and the redirects are
down for the two minutes or so that takes.

The Caddyfile, in outline:

```
{
	on_demand_tls {
		ask https://<adminDomain>/hosting/bare-domain
	}
}
https:// {
	tls {
		on_demand
	}
	redir https://www.{host}{uri} 301
}
http:// {
	@health path /healthz
	respond @health 200
	@address expression {host}.matches('^[0-9.]+$')
	respond @address "No website here" 404
	redir https://www.{host}{uri} 301
}
```

- **HTTP doesn't ask the admin** (the hosting spec). Any hostname pointed at the server is sent
  to its own `www.`, which harms nobody, and HTTP redirects don't depend on the admin. Caddy's
  ACME HTTP challenge is answered before these routes.
- **The "No website here" body** is the edge's HTML page (`packages/edge`'s `NO_WEBSITE_BODY`),
  copied into the Caddyfile at build time so the wording stays the same.
- **Redirects are cached for a day** (`Cache-Control: max-age=86400`): bare to `www.` is stable
  for a connected domain, but not forever. A domain's owner who moves elsewhere shouldn't have
  visitors stuck on a year-long cached 301.
- **Certificates live in `/var/lib/caddy` on the root disk.** A replacement starts with none and
  gets each one again on the domain's next visit. Let's Encrypt's limits (300 new orders per
  account every 3 hours, 50 certificates per registered domain a week) leave room for hundreds
  of bare domains. Keeping certificates in S3 would need a Caddy build with a storage plugin;
  not worth it at this size.
- **Logs:** the container logs to `/webmio/<stack>/redirect/caddy` in CloudWatch, kept for 30
  days. Caddy logs certificate issuance and errors, not each request.

### 4. The admin's `ask` endpoint: `GET /hosting/bare-domain?domain=<name>`

- **The answer:** 200 when a project on Webmio hosting has that bare domain connected (normalized
  as `normalizeDomain` does), in any state; 404 otherwise, including subdomains and Netlify
  websites.
- **Why any state:** the www CNAME may not be set yet. The bare domain's own check (decision 5)
  is what usually triggers the first issuance.
- **No sign-in:** Caddy can't sign in. The answer only says whether a domain is connected,
  which its public DNS shows anyway. It's one indexed query, so there's no rate limit. It lives
  outside `/api/`, like `/healthz`, and is a GET, so the hooks' CSRF check doesn't apply.
- **Renewals:** Caddy asks again before renewing an on-demand certificate, so a disconnected
  domain stops being renewed. Its current certificate keeps redirecting until it expires, which
  is harmless since `www.` then answers "No website here".

### 5. The bare domain's own state, checked with the domain

- **A new column,** `project_hosting.apex_state`: `waiting-for-dns`, `issuing-certificate` or
  `redirecting`, null when there's nothing to check. That's a subdomain, Netlify, or no
  `WEBMIO_REDIRECT_ADDRESS`. A Drizzle migration adds it.
- **`checkDomain`,** for a bare domain on Webmio hosting with a redirect address, also does this:
  1. **DNS:** `resolve4(domain)` must return exactly the redirect address, and `resolve6` must
     return nothing (ENODATA or ENOTFOUND). A leftover registrar record means some visitors
     land on the old forwarding, so it counts as not pointed.
  2. **The redirect:** when pointed, it fetches `https://<domain>/` with `redirect: "manual"`
     and a 15-second timeout. A 301 whose `Location` is `https://www.<domain>/` means
     `redirecting`. A TLS error or a timeout means `issuing-certificate`, because Caddy is still
     getting the certificate. This request is also what makes Caddy issue it.
- **What the bare domain doesn't touch:** `domainState`, the free address's redirect and the
  website's address still come from `www.` alone, as today.
- **Where it shows:** `DomainPanel.svelte` shows the A record in the records table and the bare
  domain's state as its own line. The panel checks again on opening when either state isn't
  final.
- **The records:** `domainInstructions` returns the A record, and keeps `forwardTo` only when
  there's no redirect address.
- **The record's name** is shown as the domain itself (`cumpl.cz`), like the existing CNAME
  rows show `www.cumpl.cz`. The hint text explains that registrars call it `@` or leave the
  name empty.

### 6. Configuration: `redirectServer` and `WEBMIO_REDIRECT_ADDRESS`

- **The stack setting:** `redirectServer` (boolean, default `true`) in `Pulumi.yaml`; `dev` and
  `prod` both run one.
- **`infra/src/redirect.ts`** builds the server and exports the address. `admin.ts` adds
  `WEBMIO_REDIRECT_ADDRESS=<address>` to the admin's environment parameter.
- **`webmioBackend`** reads it as `redirectAddress`. Without it, everything behaves as today,
  which covers local development, tests, and running the admin locally against `dev` without
  setting it.

### 7. Alerts like the admin's

- **The health check:** a Route 53 HTTP health check on the Elastic IP, port 80, `/healthz`,
  every 30 seconds from three regions. The alarm `redirect-down` fires on the us-east-1 topic
  after three minutes.
- **Status checks:** `redirect-system-check` with EC2's `recover` action, and
  `redirect-instance-check`, on the regional topic.
- **No disk or memory alarms:** the server writes only certificates and nothing else grows.
- **`alerts` and `alertsUsEast1`** are exported from `admin.ts`, or moved to a small
  `alerts.ts` both import, so there's one subscription per topic.

## Risks / Trade-offs

- **[The server is down or being replaced] → bare domains don't answer.**
  - `www.` keeps working, and so do links and search results, which point there.
  - The health check alarms within three minutes, and EC2 recovery handles hardware failures.
- **[A replacement loses all certificates] → each bare domain's first visit after it waits a
  few seconds for issuance.** If the admin is also down then, that visit fails. Replacements
  are rare and done by the operator, who can run the domain checks afterwards to re-issue.
- **[Someone points many hostnames at the address] → each costs an `ask` request.**
  Certificates are issued only for connected domains, so Let's Encrypt's limits aren't at risk.
- **[An owner keeps the registrar's forwarding and adds the A record] → two A records, half the
  visitors on HTTP-only forwarding.** The check counts that as not pointed and asks to remove
  the other record.
- **[A cached 301 outlives a disconnection] → visitors go to `www.` for up to a day.** Short
  enough, and `www.` is where they'd want to be.
- **[The Elastic IP is released by mistake] → every customer's bare domain breaks.** It's
  protected in Pulumi (decision 2), and `infra/README.md` says not to release it.

## Migration Plan

1. `pulumi up --stack dev`: creates the redirect server, its Elastic IP, the alarms, and the
   new environment variable. It doesn't replace the admin's server: its user data doesn't
   change, only the SSM parameter does.
2. Merge to `main`. CI deploys the admin, and the restart picks up `WEBMIO_REDIRECT_ADDRESS` and
   runs the migration.
3. On `cumpl.cz`: set `@ A <redirectAddress>` at Ignum, remove Webglobe's forwarding and its A
   record, and check on the Domain page.
4. `prod` gets the redirect server when it's set up before the beta.

**Rollback:** the owner points `@` back at the registrar's forwarding. On a stack that has the
server, `redirectServer: false` stops at the protected address: `pulumi up` refuses to delete
it until the operator runs `pulumi state unprotect` on purpose, and then releases it from
Pulumi's state while keeping it in AWS (`retainOnDelete`). Without the variable, the admin
falls back to the forwarding sentence.

## Open Questions

- **Whether Caddy 2.11's renewal `ask`** happens at renewal time or only when a handshake
  needs a renewed certificate. Either is fine for decision 4. The local test (task 1.2) couldn't
  show it: Caddy asked once per domain, at the first handshake, and the internal CA's
  certificates last 12 hours. `dev`'s Caddy log will show it at the first renewal, about 60
  days in.
