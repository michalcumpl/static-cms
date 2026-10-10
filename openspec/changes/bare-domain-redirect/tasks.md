# Tasks

## 1. The redirect server's Caddy configuration

- [x] 1.1 Add `infra/server/redirect/Caddyfile` (design decision 3: on-demand TLS with `ask`, HTTPS and HTTP redirects to `https://www.{host}{uri}` with `Cache-Control: max-age=86400`, `/healthz`, the "No website here" page by address) the `webmio-redirect.service` unit and `bootstrap.sh`; verify `bootstrap.sh` with `shellcheck` and `docker run caddy:2.11.4 caddy validate` on the rendered file
- [x] 1.2 Test the Caddyfile locally with Docker: a stub `ask` endpoint allowing one domain, Caddy's internal CA in place of Let's Encrypt, and `curl --resolve`; verify a 301 to `www.` keeping path and query over HTTPS and HTTP, a failed handshake for a domain the stub refuses, 404 by address, 200 on `/healthz`, and that redirects keep working once the stub is stopped; record in design.md's open question when Caddy asks again for a renewal

## 2. Infrastructure (`infra/`)

- [x] 2.1 Move the alert topics into `infra/src/alerts.ts`, imported by `admin.ts`; verify `pulumi preview --stack dev` shows no changes
- [x] 2.2 Add `infra/src/redirect.ts` (design decisions 1, 2, 6 and 7): the `redirectServer` setting in `Pulumi.yaml`, the protected Elastic IP with its association, the security group, the role (SSM and its log group), the log group, the gzipped user data with the Caddyfile and unit, the `t4g.nano` instance, the health check and the three alarms; export `redirectAddress` from `index.ts`, and add `WEBMIO_REDIRECT_ADDRESS` to the admin's environment parameter; verify `pulumi preview --stack dev` creates only these and changes only the environment parameter
- [x] 2.3 Document the redirect server in `infra/README.md` (what it does, its address and why it must never be released, replacing it, its alarms, the cost) and add `redirectAddress` to the README's environment table; verify every command in the new section runs against `dev` in group 5

## 3. The admin

- [x] 3.1 Read `WEBMIO_REDIRECT_ADDRESS` into `webmioBackend` as `redirectAddress`; verify a connection test with and without it
- [x] 3.2 Add `GET /hosting/bare-domain?domain=` (design decision 4); verify route tests: 200 for a connected bare domain on Webmio hosting in any state, including uppercase and a trailing dot; 404 for an unknown domain, a subdomain, a Netlify website's domain and a missing parameter; no session needed
- [x] 3.3 Add the `apex_state` column with its Drizzle migration; verify the migration applies to a copy of an existing database and existing rows read as null
- [x] 3.4 Extend `domainInstructions` and `checkDomain` (design decision 5): the A record, `forwardTo` only without a redirect address, the DNS check (exactly the address, no AAAA), the `https://<domain>/` request, and `apex_state`; leave `domainState` and the free address's redirect to `www.`; verify unit tests with fake DNS and a fake fetch covering every scenario of the publishing spec's "Custom domain", plus a TLS failure and a timeout reading as issuing the certificate
- [x] 3.5 Show the A record, the request to remove the forwarding and other `@` records, and the bare domain's state in `DomainPanel.svelte`, in English and Czech, checking again on opening while either state isn't final; verify the panel tests and the i18n tests, and an end-to-end test with fake hosting showing the records with and without a redirect address

## 4. Checks before `dev`

- [ ] 4.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the end-to-end suite from the root; verify all pass

## 5. Verification on `dev`

- [ ] 5.1 `pulumi up --stack dev` (operator approves); verify the server answers `http://<redirectAddress>/healthz` with 200, the admin's environment has `WEBMIO_REDIRECT_ADDRESS` after the next deploy, and `/hosting/bare-domain?domain=cumpl.cz` answers 200
- [ ] 5.2 With the operator, on `cumpl.cz`: connect it again, set `@ A <redirectAddress>` at Ignum, remove Webglobe's forwarding, and check on the Domain page; verify `https://cumpl.cz/some/path?q=1` and `http://cumpl.cz/some/path` redirect in one step to `https://www.cumpl.cz/some/path…` with a valid certificate, and the page shows "redirecting"
- [ ] 5.3 Replace the redirect server (`pulumi up --replace` on the instance); verify the address stays, `cumpl.cz` redirects again after its next check, and record how long bare domains were down
- [ ] 5.4 Stop Caddy on the server through SSM for four minutes; verify the `redirect-down` alarm emails the operator and clears once Caddy is started again
- [ ] 5.5 Mark `bare-domain-redirect` Next, then Done on archiving, in `docs/roadmap.md`, and replace the forwarding advice in the roadmap's phase 7 note; verify the links resolve
