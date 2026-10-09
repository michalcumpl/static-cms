# Tasks

## 1. The site's own links (`@webmio/export`)

- [x] 1.1 Add `checkSiteLinks(files, { siteUrl })` (design decision 2): pages' `href`, `src`, every `srcset` candidate and `poster`; stylesheets' `url(...)` relative to the stylesheet; `_redirects` targets; full links to the site's own address as internal; `#`, `mailto:`, `tel:`, `data:`, `javascript:` ignored; outside `http(s)` links returned per page; verify unit tests cover each kind, a missing page, a missing image size, a missing font, a broken redirect target, and that the demo site's export has no broken references
- [x] 1.2 Export it from `@webmio/export` and verify `pnpm turbo run build test --filter @webmio/export` passes

## 2. Checks and verification in the admin

- [x] 2.1 Add `publishing/outside-links.ts` with `checkOutsideLinks` (design decision 3: HEAD then GET on 405/501, 5 s timeout, 8 at a time, at most 100 URLs, answered vs warning statuses, a Webmio `User-Agent`) and the `PUBLISH_CHECK_OUTSIDE_LINKS` switch; verify unit tests with an injected `fetch` cover a timeout, a 404, a 403 counted as answered, the 405 fallback and the 100-URL cap
- [x] 2.2 Add `publishing/verify.ts` with `verifyLive` (design decision 4: home page first, then every file by hash or size, page paths as addresses, retries until the deadline); verify unit tests with an injected `fetchLive` and short deadlines cover a match, a page that stays old, a missing image, an image of the wrong size, and the deadline
- [x] 2.3 Add `fetchLive` and `takeOffline` to `PublishTarget`, `fetchSite` to `HostingBackend` (AWS: `fetch`; folder fake: `serveFake`, plus a `serveStale` test switch that keeps serving the previous deploy), and the Netlify implementations (fake URL rewrite; deleting the site); verify the Webmio and Netlify adapter tests cover fetching the live site through each fake and taking a first publish offline

## 3. The pipeline

- [x] 3.1 Add migration `0005_safe_publishing.sql` (`publishes.step`, `publishes.warnings`), using the next free number if `main` has moved on; verify `pnpm --filter @webmio/admin db:generate` then reports no changes
- [x] 3.2 Rework `runPublish` into the steps of design decision 1, recording `step`: the link check before upload, outside links in the background, verification, and warnings stored with a successful publish; verify route tests against the folder fake cover "Steps while publishing", "A page links to a file the publish lacks" (by injecting a broken export), and "An outside link doesn't answer"
- [x] 3.3 Add rollback (design decision 5): restore the previous deploy and prune the failed one's files, or take a first publish offline, with the Netlify row removal; failure messages `failedKept`, `failedFirst` and the failed-rollback variant in Czech and English; verify route tests cover "Verification fails on a published website", "Verification fails on a first publish" (including Try again publishing it as a first publish), "Verification fails on Netlify" and "Provider unreachable"
- [x] 3.4 Replace the single queue with per-project chains and at most three publishes at once (design decision 6), keeping `publishesSettled()`; verify a test where one project's verification waits while another project's publish completes, and the existing "Publishing twice at once" test still passes

## 4. What the owner sees

- [x] 4.1 Return `step` and `warnings` from the publishing state API, and add them to `PublishSummary` in the browser; verify the publishing endpoint tests
- [x] 4.2 Show the step in the Publish button while running, and the failure message with **Try again** after a failure; show warnings and Try again in `PublishHistory`; add Czech and English messages; verify `pnpm --filter @webmio/admin typecheck` and server-rendered component tests for a running step, a failure with Try again, and a publish with warnings
- [x] 4.3 Set `PUBLISH_CHECK_OUTSIDE_LINKS=false` in the e2e environment and add Playwright tests with Webmio hosting on: the steps appear, a publish forced to fail verification (`serveStale`) shows the message and Try again, and Try again publishes; verify `pnpm --filter @webmio/admin test:e2e` passes in full

## 5. Real hosting and documentation

- [x] 5.1 On the `dev` stack, publish a real project through the admin's code and confirm verification passes; force a failure (an `s:` key pointing at a deploy without the new home page) and confirm the rollback within a minute; record the timings in design.md (Risks); verify on a Netlify site as well, if a token for a test team is available, and note it if not
- [x] 5.2 Update the README's Webmio hosting section (`PUBLISH_CHECK_OUTSIDE_LINKS`) and the roadmap's phase 5 row; run `pnpm lint`, `pnpm typecheck` and `pnpm test` from the root and verify all pass
