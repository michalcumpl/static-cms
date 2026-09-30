# Tasks

## 1. Check Netlify

- [x] 1.1 Check Netlify's current documentation, plans and terms: the endpoints in design.md (Context), digest deploys and uploads, restore, custom domain and SSL, the apex load balancer IP, API rate limits, limits on sites per team and deploys per day, and whether hosting clients' sites under one agency account is allowed; record the findings in design.md (Risks) and correct the design where it differs, and verify the fake Netlify in task 3.1 follows them

## 2. Site address and redirects in `packages/site`

- [x] 2.1 Add the `siteUrl` render and export option (canonical links, sitemap base URL, validation); verify with unit tests for the Canonical links scenarios, Site address given to export, a malformed site address, and unchanged snapshots without `siteUrl`
- [x] 2.2 Add the `redirects` export option writing `_redirects`; verify with unit tests for Redirects written, No redirects, and rejected paths

## 3. Publishing on the server

- [x] 3.1 Write the fake Netlify server (design.md decision 9) and the Netlify adapter implementing `PublishTarget`, plus `listTeams` (decision 1); verify with unit tests against the fake: list teams (and a refused token), create site, deploy uploading only required files, waiting for ready, deploy errors, restore, connect and disconnect a domain, and the fake serving the live deploy
- [x] 3.2 Add the `hosting_connections`, `project_hosting` and `publishes` tables with a migration, and mark running publishes failed on startup; verify with a database test (tables, foreign keys) and a startup test for interrupted publishes
- [x] 3.3 Implement token encryption with `SECRET_KEY` (decision 3); verify with unit tests: round trip, a random IV per encryption, a tampered value refused, a wrong key refused, and no key meaning "not set up"
- [x] 3.4 Implement connecting a workspace (routes to check a token and list its teams, connect with a chosen team, disconnect; owners only) and `publishTarget(db, workspaceId)`; verify with route tests against the fake for Connect with a token, Rejected token, Editor can't connect (403), Token never shown again (no response or plain column contains it), and connecting without `SECRET_KEY`
- [x] 3.5 Implement `earlierAddresses` (decision 5); verify with unit tests for Renamed address, Deleted page, a page that became home, and no duplicates across several publishes
- [x] 3.6 Implement the publish job and queue (decision 4), and the routes `POST …/publish`, `GET …/publishes` and `POST …/publishes/<id>/restore`; verify with route tests against the fake for First publish (site created in the connected team), Publishing with errors, Second publish uploads only changes, Provider unreachable, Revoked token, Not connected, Publishing twice at once, Make an earlier publish live again, and access (401, 404, cross-site)
- [x] 3.7 Implement custom domains (decision 7): the routes to connect, disconnect and check, normalisation, the DNS records, the states and the site address; verify with route tests for Connect a bare domain, Domain becomes ready (with stubbed DNS), Invalid domain, a domain used by another project, and Address before/after the domain is ready
- [x] 3.8 Generate a development key when `SECRET_KEY` is unset under `NODE_ENV=development` (`SECRET_KEY_FILE`, default `data/secret.key`, mode 600), never in production or tests; verify with unit tests (generated once and reused, owner-only permissions, not used when `SECRET_KEY` is set or outside development, a too-short `SECRET_KEY` not replaced) and the README's configuration table

## 4. User interface

- [x] 4.1 Add Publish to the editor toolbar (save first when there are unsaved changes, status while publishing, link to the site) and a Publishing section on the project page; verify with Playwright against the fake: publish from the editor, "Save and publish", the refusal with errors listing the problems, and the published page served by the fake showing the saved heading
- [x] 4.2 Build `/p/<project>/publishing`: address, domain form with DNS records, state and actions, history with "Make live again", and the "connect Netlify first" message; verify with Playwright for connecting a domain, making an earlier publish live again, and a project whose workspace isn't connected
- [x] 4.3 Build `/w/<workspace>/hosting`: an owner pastes a token, chooses the team and can disconnect, and editors see the state only; verify with Playwright against the fake for connecting with a token and choosing a team, a rejected token, and an editor's read-only view

## 5. Integration

- [x] 5.1 Document publishing in `apps/admin/README.md` (`SECRET_KEY` and backing it up, `NETLIFY_API_URL` for tests, how an owner creates a Netlify token, each client's own plan and credits, GDPR note) and update Milestone 4 in `docs/roadmap.md`; verify the README's configuration table lists the variables and the roadmap links resolve once the change is archived
- [ ] 5.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally and in CI (a CI run after pushing); verify all pass
- [ ] 5.3 With a real Netlify token, connect a workspace, publish a real project, connect a test domain or subdomain, and check the site, a redirect and "Make live again", confirming the Findings against Netlify's own documentation; record the outcome in design.md
