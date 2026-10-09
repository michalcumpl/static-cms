# Tasks

## 1. Edge code (`packages/edge`)

- [x] 1.1 Create the `@webmio/edge` workspace package (plain JavaScript with JSDoc types, vitest, `build`/`test`/`typecheck` scripts matching `packages/export`) and verify `pnpm turbo run build test --filter @webmio/edge` succeeds on an empty test
- [x] 1.2 Add `content-types.js`: extension → content type (text types with `; charset=utf-8`, fallback `application/octet-stream`) and → browser `Cache-Control` (design decision 6); verify unit tests cover `.html`, `.css`, `.js`, `.xml`, `.txt`, `.webp`, `.woff2` and an unknown extension
- [x] 1.3 Add `router.js` with `route(request, lookup)` (design decision 3): host lookup, redirect host, live deploy lookup, path normalisation, missing-slash 301, `index.html`, rewrite to `/sites/<siteId>/<deployId>/…`, query string dropped, `/_redirects` hidden; verify unit tests for every hosting-spec scenario on serving, pages, missing slash, unknown hostname, free address → custom domain redirect, and `..`/`%2e%2e`/`%2f`/backslash escapes
- [x] 1.4 Add `not-found.js` with `resolveMissing({ uri, read })` and a parser for `_redirects` (design decision 4): redirect with or without trailing slash and `index.html`, the publish's `404.html` with 404, plain fallback when it is missing, per-deploy caching of parsed redirects; verify unit tests including "Redirects follow rollback" (two deploys, different `_redirects`)
- [x] 1.5 Add the build that emits `dist/viewer-request.js` (CloudFront Functions runtime 2.0, KVS handler around `route`) and `dist/origin-response.mjs` (Lambda@Edge handler around `resolveMissing`, bucket and region as placeholders replaced at deploy); verify a test asserts the viewer bundle has no `import`/`export`, parses, and is under 10 KB

## 2. Infrastructure (`infra/`) and the edge spike

- [x] 2.1 Create the `infra/` workspace package with `@pulumi/pulumi` and `@pulumi/aws`, `Pulumi.yaml`, and `dev`/`prod` stack configs (`sitesDomain`, `netDomain`, `region`); check whether `@pulumi/aws` has the multi-tenant distribution, tenant and connection group resources, and add `@pulumi/aws-native` only for those that are missing; verify `pnpm --filter infra typecheck` passes and `pulumi preview --stack dev` lists the resources
- [x] 2.2 Write the program (design decision 13): private bucket with OAC policy and multipart lifecycle rule, KVS, CloudFront Function from `packages/edge/dist`, Lambda@Edge in `us-east-1` with read-only role, cache policy, multi-tenant distribution with one behavior and `redirect-to-https`, connection group, `webmio-sites` wildcard tenant, Route 53 zones, wildcard ACM certificate, `*.<sitesDomain>` and `*.sites.<netDomain>` wildcard records, the admin IAM user, policy and access key, and outputs for every `WEBMIO_*` variable and `AWS_REGION`; verify `pulumi preview --stack dev` succeeds
- [x] 2.3 Spike in the `dev` stack (requires the operator's AWS account and delegated dev zones): `pulumi up`, upload a hand-written two-page site under `sites/test/d1/` with a `_redirects` and `404.html`, put `h:`/`s:` keys, and verify with `curl` that the free address serves `/`, `/kontakt` redirects to `/kontakt/`, a redirect and the 404 page work, HTTP redirects to HTTPS, and switching `s:test` to `d2` changes the page within a minute; if Lambda@Edge or the wildcard tenant fails, stop and amend design.md (Risks) before continuing
- [x] 2.4 Write `infra/README.md` (account, deploy, zone delegation, reading outputs into the admin's environment, key rotation, tearing down) and verify every command in it ran during 2.3

## 3. Hosting backend in the admin

- [x] 3.1 Add `@aws-sdk/client-s3`, `@aws-sdk/client-cloudfront`, `@aws-sdk/client-cloudfront-keyvaluestore` and `@aws-sdk/signature-v4a` to the pnpm catalog and the admin, and `@webmio/edge` as a workspace dependency; verify `pnpm install` and `pnpm --filter @webmio/admin typecheck` pass
- [x] 3.2 Define `HostingBackend` and `webmioHostingConfig(env)` in `publishing/webmio-backend.ts` (objects: put, copy, get, delete prefix; KVS: get and batched put/delete with ETag and one retry on conflict; tenants: create, get certificate state, re-request certificate, delete); verify `webmioHostingConfig` unit tests return `undefined` unless all four required variables are set
- [x] 3.3 Implement the AWS backend over the SDK clients (credentials from the default chain, SigV4a for the KVS client, tenant alias conflicts mapped to `domain-in-use`, network failures to `unreachable`); verify unit tests with mocked SDK clients for the KVS ETag retry and the error mapping
- [x] 3.4 Implement the directory-backed fake (`webmio-fake.ts`, design decision 12) with test hooks to set certificate state and reject aliases; verify a contract test suite runs against the fake (and, when `WEBMIO_AWS_CONTRACT=1` with the dev stack's variables, against AWS)

## 4. Webmio `PublishTarget`

- [x] 4.1 Extend `target.ts` with optional `setRedirectHost`, `prune`, `servedHost`, and the `domain-in-use` error kind, and add Czech and English messages for the new errors; verify the Netlify adapter and its tests compile unchanged
- [x] 4.2 Implement `webmio.ts` `createSite` (new `ws_` id, `h:<name>.<sitesDomain>` written, `name-taken` when the key exists) and `deploy` (design decision 5: hashes, manifest of the live deploy, copy or put with content type and cache control, manifest, `s:` switch, cleanup on failure); verify tests against the fake: a second deploy copies unchanged files, uploads only changed ones, and a failure mid-upload leaves no files and keeps the old deploy live
- [x] 4.3 Implement `restore` (one `s:` write), `prune`, and `deleteSite` (KVS keys, domain tenant, every object under `sites/<siteId>/`); verify tests against the fake for rollback, pruning to the kept set, and deletion removing all keys and files
- [x] 4.4 Implement `connectDomain`, `disconnectDomain`, `certificateIssued` (re-requesting a failed certificate), `setRedirectHost` and `servedHost` (design decision 7); verify tests against the fake for bare and subdomain, `domain-in-use`, and the free address `h:` entry gaining and losing its redirect host
- [x] 4.5 Verify end to end against the fake, through `route()` and `resolveMissing()` from `@webmio/edge`, that an exported site publishes, serves its pages, applies its redirects, serves its 404 page, and that rollback switches pages and redirects together

## 5. Choosing the target, free names, and retention

- [x] 5.1 Add migration `0002_own_hosting.sql` (`project_hosting.domain_tenant_id`, `publishes.files_deleted_at`, unique index on `project_hosting(provider, site_name)`) and the `"webmio"` provider in the schema; verify `pnpm --filter @webmio/admin db:generate` produces no further diff and the migration runs in tests
- [x] 5.2 Add `targetFor(db, projectId, options)` and rename `NetlifyEnv` to `HostingEnv` with `webmio?: HostingBackend` (design decision 8); switch `startPublish`, `restorePublish`, the domain functions and `deleteProject` to it; verify existing Netlify tests pass and new tests cover the three selection rules, including a restored project on a Webmio server
- [x] 5.3 Add `freeSiteName` (slug, 40 characters, reserved names, `-2`, `-3`, …) and use it in `ensureSite` for Webmio; keep `siteNameFor` for Netlify; verify tests for "Free address from the name", "Name taken", "Reserved name", an empty or all-diacritics name, and that renaming the project keeps the address
- [x] 5.4 After a successful Webmio publish, compute the kept deploy ids (10 newest `ready` plus live), call `prune`, and set `files_deleted_at`; expose `restorable` from `publishingState` and refuse others in `restorePublish`; verify tests for "Eleventh publish", "Old live publish" and "Publish no longer kept"
- [x] 5.5 Make `siteAddress` provider-aware (served host for a ready Webmio domain, `https://<name>.<sitesDomain>` otherwise); verify the sitemap and canonical links of a Webmio publish use the free address, then the served domain once ready

## 6. Domains and deletion on Webmio hosting

- [x] 6.1 Make `dnsRecords` per provider (Webmio: one CNAME for the served host to the website's own target `<siteName>.<cnameDomain>`, plus a `forward` instruction for a bare domain) and `checkDomain` require the CNAME to name exactly that target (design decision 7); call `setRedirectHost` on the first transition to `ready` and on disconnect; verify the domain API tests cover every Webmio scenario of "Custom domain" in the publishing spec with a stubbed `dns`, including "Pointing at another website's target"
- [x] 6.2 Take Webmio websites offline in `deleteProject` before deleting the project, failing with the hosting message when the backend is unreachable; verify deletion tests for "Offline at once on Webmio hosting", "Webmio hosting down" and "Publish after restoring"

## 7. Admin pages and messages

- [x] 7.1 Replace `connected` with `canPublish` and `provider` in the project publishing endpoint, and update the Overview, Publish and Website pages so a Webmio server never asks to connect hosting; verify the publishing endpoint test and "Nothing to connect with Webmio hosting"
- [x] 7.2 Show the Webmio CNAME record and the bare-domain forwarding instruction on the Domain page, and hide "Make live again" for non-restorable publishes; add Czech and English messages; verify `pnpm --filter @webmio/admin typecheck` (i18n guard included) and component or page tests for both
- [x] 7.3 Update the workspace Hosting page: on a Webmio server, say websites are hosted by Webmio, show the Netlify connection only when one exists (with disconnect for owners), and never offer connecting; verify `hosting.test.ts` covers "Webmio hosting, not connected" and a connected workspace on a Webmio server

## 8. End-to-end and documentation

- [x] 8.1 Add `e2e/fake-webmio-server.ts` serving the fake's directory through `route()` and `resolveMissing()` on `<name>.localhost`, wire `WEBMIO_HOSTING_FAKE_DIR` (honoured only outside production) into `playwright.config.ts`, switched off before each test and on by `useWebmioHosting()`, so the Netlify flows keep covering servers without Webmio hosting while `webmio-hosting.spec.ts` covers publishing to it; verify `pnpm --filter @webmio/admin test:e2e` passes, including opening the published site, a rollback, a redirect and the 404 page
- [x] 8.2 Document Webmio hosting in the README (what it is, the `WEBMIO_*` variables, pointing to `infra/README.md`) and set phase 5's `own-hosting` row in `docs/roadmap.md` to its status; verify the README's variable list matches `webmioHostingConfig`
- [x] 8.3 Run `pnpm lint`, `pnpm typecheck` and `pnpm test` from the root and verify all pass
- [x] 8.4 With the `dev` stack configured in a local admin, publish a real project, connect a test subdomain, wait for "ready", check the free address redirects to it, roll back, and delete the project; verify each step against the hosting and publishing spec scenarios and note anything that differs
