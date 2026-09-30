# Design

## Context

See proposal.md for the motivation. The code as it stands:

- **Export.** `exportSite(doc, media, { basePath })` in `packages/site` produces a deterministic file tree:
  - `index.html` and `<slug>/index.html`;
  - `assets/style.css` and `assets/images/*.webp`;
  - `sitemap.xml`, but only when the document's `site.base_url` is set.

  It runs on the server for the preview; the ZIP download runs it in the browser.
- **Saved documents and media.** `readSite(db, projectId)` returns the saved document, its version string and its problems. `mediaFiles(projectId, usedImageFiles(doc))` returns exactly the image files a document needs. Every accepted save inserts a `versions` row with the whole document.
- **Background work.** The admin runs as one Node process (`adapter-node`). Uploads already run one at a time through an in-process promise chain.
- **Access and cross-site checks.** `requireMember(event, projectId, { api: true })` guards routes, and `hooks.server.ts` refuses non-GET `/api/` requests from other sites.
- **Netlify API** (to be confirmed in task 1.1):
  - `POST /api/v1/{account_slug}/sites` creates a site.
  - `POST /api/v1/sites/{site_id}/deploys` with `{ files: { "/path": sha1 } }` returns a deploy with `required` (the SHA-1s it lacks). Each required file is then sent with `PUT /api/v1/deploys/{deploy_id}/files/{path}`, and the deploy turns `ready` when the last one arrives.
  - `GET /api/v1/deploys/{deploy_id}` reports its state.
  - `POST /api/v1/sites/{site_id}/deploys/{deploy_id}/restore` makes an earlier deploy live.
  - `PATCH /api/v1/sites/{site_id}` with `custom_domain` connects a domain; `POST /api/v1/sites/{site_id}/ssl` provisions the certificate.
  - A `_redirects` file in a deploy defines redirects.

## Goals / Non-Goals

**Goals:**
- One publish is one atomic deploy: visitors never see a mix of old and new files.
- A second publish uploads only what changed.
- Adding another provider later only means adding an adapter.
- Everything is testable without a real Netlify account.

**Non-Goals:**
- A job system beyond one in-process queue.
- Multiple provider accounts per server, and per-workspace provider tokens.

## Decisions

### 1. The `PublishTarget` interface and the Netlify adapter

```
interface PublishTarget {
  createSite(name): { siteId, defaultUrl }
  deploy(siteId, files: Map<path, bytes>): { deployId }   // digest -> upload required -> wait ready
  restore(siteId, deployId): void
  connectDomain(siteId, domain): { records: DnsRecord[] }
  disconnectDomain(siteId): void
  domainState(siteId, domain): "waiting-for-dns" | "issuing-certificate" | "ready"
}
```

- **Where it lives.** `$lib/server/publishing/netlify.ts` implements the interface over `fetch`. It takes `{ token, account, apiUrl, fetch }`, with `apiUrl` defaulting to `https://api.netlify.com`, so tests point it at a fake.
- **Digests.** SHA-1 through `node:crypto`. Upload paths are URL-encoded per segment.
- **Waiting for a deploy.** It polls the deploy state at 1 s, 2 s, 4 s … up to 60 s in total, and turns `error` states into readable failures.
- **Choosing the target.** `publishTarget(db, workspaceId)` decrypts the workspace's stored token and returns the adapter for its chosen team (`account_slug`). It returns `undefined` when the workspace isn't connected. `NETLIFY_API_URL` only redirects the adapter to a fake in tests.
- **Checking a token.** `listTeams(token)` calls `GET /api/v1/accounts` and returns the teams the token can access (slug and name). A 401 means the token is refused. A stored token that Netlify refuses during a publish becomes the "reconnect Netlify" failure.
- **Alternative:** Netlify's JS client or CLI. They're heavier than five endpoints over `fetch`, and harder to fake.

### 2. Data

```
hosting_connections(workspace_id PK -> workspaces, provider "netlify", account_slug,
                    account_name, token_encrypted, connected_by -> users, connected_at)
project_hosting(project_id PK -> projects, provider "netlify", site_id, site_name,
                default_url, domain, domain_state, domain_checked_at, live_publish_id)
publishes(id PK, project_id -> projects, version_id -> versions, state
          ("running" | "ready" | "failed"), deploy_id, url, error, redirects_count,
          published_by -> users, started_at, finished_at)
```

- **Which publish is live.** `live_publish_id` names it. It moves when a publish becomes ready, and when a member makes an earlier one live again.
- **Leftovers after a restart.** On startup, publishes still `running` are marked `failed` ("interrupted by a server restart"): the process that ran them is gone.
- **Sites are created in the connected team.** A site belongs to the team it was created in. If the workspace later connects a different team, the next publish creates a new site there, and `project_hosting` is replaced.
- **The site name** is `sc-` plus the project ID in lowercase, with characters Netlify doesn't allow replaced by `-`. If the name is taken, `-2`, `-3` and so on are appended.

### 3. Token encryption

- **The key.** `SECRET_KEY` (at least 32 characters) from the server's environment. HKDF-SHA256 derives a 256-bit key from it, with the context `"hosting-token"`.
- **The format.** Tokens are encrypted with AES-256-GCM through `node:crypto`: a random 12-byte IV per encryption, stored as `v1.<iv>.<tag>.<ciphertext>` (base64url). Decrypting refuses anything whose authentication tag doesn't match.
- **No key.** Without `SECRET_KEY`, connecting is refused ("publishing isn't set up on this server"), and existing connections can't be used.
- **Local development.** When `NODE_ENV` is `development` (the Vite dev server) and `SECRET_KEY` is unset, a random key is generated once into `SECRET_KEY_FILE` (default `data/secret.key`, mode 600, git-ignored) and reused afterwards, so owners only ever paste their Netlify token. Production and tests never generate a key. A key file next to the database is weaker protection (one copy of the data folder holds both), which is why production requires `SECRET_KEY` explicitly.
- **What the owner sees.** The token is never returned by any route. After connecting, the settings show only the team and who connected it, and when.
- **Alternative:** storing tokens in plain text, like the hashes of our own session tokens. That doesn't work: a Netlify token must be usable, not just comparable, so hashing is impossible, and it grants access to the customer's whole Netlify account.

### 4. The publish job

```
POST /api/projects/<p>/publish
  requireMember; workspace connected (else 409 "connect Netlify first"); no publish "running" (409)
  readSite -> problems with errors? -> 422 { problems }
  insert publishes(running, version of the saved document); respond 202 { id }
  queue (one at a time per server):
    ensure project_hosting (createSite on first publish)
    siteUrl = domain_state == "ready" ? https://<domain> : default_url
    redirects = earlierAddresses(project) (decision 5)
    files = exportSite(doc, mediaFiles(...), { siteUrl, redirects })
    target.deploy(site_id, files) -> deploy_id
    publishes -> ready (url, deploy_id); project_hosting.live_publish_id = id
  on any error: publishes -> failed, error = readable message
```

- **Checking progress.** The editor and the Publishing page poll `GET /api/projects/<p>/publishes`, which returns the history with the running one first, every 2 s while one runs.
- **What gets published** is the version saved when Publish was pressed, even if someone saves again while it runs.
- **Server-side export** uses the same `packages/site` code as the preview, so the published site equals the preview apart from the site address and the `_redirects` file.

### 5. Redirects from earlier addresses

`earlierAddresses(projectId, doc)`:
1. Loads the documents of every `ready` publish of the project (their `version_id` rows).
2. For each, computes each page's route through the renderer's routing (`pageId → path`).
3. Collects, for every page ID present in the current document, every earlier route that differs from its current route.
4. Returns `{ from: "/<old>/", to: "/<current>/" }`, sorted by `from`, with no duplicates.

Routes of pages that no longer exist are dropped. The export writes `_redirects` from the list (the site-export requirement). This is bounded by the number of publishes. Each document is parsed once per publish, which is fine for small sites; it could be cached per version later.

### 6. Canonical links and the site address in `packages/site`

- **The option.** `RenderOptions` and `ExportOptions` get `siteUrl?: string`, validated as an absolute http(s) URL.
- **Canonical links.** `renderPage` adds `<link rel="canonical" href="<siteUrl without trailing slash>/<route>">` when it is set.
- **The sitemap** uses `siteUrl ?? site.base_url`.
- **`_redirects`.** A `redirects?: { from: string; to: string }[]` export option writes `_redirects`. Paths must start with `/` and contain no whitespace; a bad path raises an error instead of producing a broken file.
- **What doesn't change.** The preview passes neither option, so it doesn't change, and snapshots of pages rendered without `siteUrl` stay byte-identical.

### 7. Custom domains

- **Connecting.** `connectDomain` sets `custom_domain` (and, for a bare domain, `domain_aliases: ["www.<domain>"]`), then requests SSL.
- **The records shown:**
  - a bare domain: `A <domain> 75.2.60.5` and `CNAME www.<domain> <site_name>.netlify.app`;
  - a subdomain: `CNAME <subdomain> <site_name>.netlify.app`.

  The load balancer IP is a constant to confirm in task 1.1.
- **The state:**
  - "waiting for DNS" until `node:dns` resolves the domain to the records;
  - then "issuing the certificate" until the site's SSL reports provisioned;
  - then "ready".

  It is checked on "Check again" and whenever the Publishing page opens (at most once a minute), and stored in `project_hosting`.
- **Domain names** are normalised (lowercase, trailing dot removed) and must be a hostname with at least one dot. A domain that another project already uses is refused (409).

### 8. User interface

- **The editor's toolbar** gets **Publish** next to Save. With unsaved changes it offers "Save and publish". While publishing it shows "Publishing…", then "Published", with a link to the site, or the error.
- **The project page** gets a Publishing section: the live address, Publish, and a link to the Publishing page.
- **`/p/<project>/publishing`** shows the address, the domain form with its DNS records, state and "Check again" / "Disconnect", and the history with "Make live again". When the workspace isn't connected, it says an owner needs to connect Netlify, with a link to the workspace's settings.
- **`/w/<workspace>/hosting`** (linked from the workspace's pages) shows the Netlify connection. Owners can paste a token, choose the team and disconnect; editors see the state only. The token field is a password field, and the token is never shown again.

### 9. Tests

- **A fake Netlify** (`apps/admin/src/lib/server/publishing/fake-netlify.ts`): a small `node:http` server that implements the endpoints above in memory. It records uploads and serves the live deploy's files at `/sites/<site>/<path>`, so tests can check what visitors would see.
- **Unit tests** use it through the adapter's `fetch` and `apiUrl`.
- **Playwright** starts it as a second `webServer`, with `NETLIFY_API_URL` pointing the dev server at it.
- **What the tests cover:**
  - the first publish creating a site;
  - a second publish uploading only the changed page;
  - refusal because of errors;
  - failure when the provider can't be reached;
  - no two publishes at once;
  - redirects after an address change;
  - domain connect, states, disconnect, and a domain another project already uses;
  - making an earlier publish live again;
  - access checks;
  - the "not set up" state.

## Findings (task 1.1, 2026-09-30)

These come from search results that summarise Netlify's documentation, pricing, forum and legal pages. The pages themselves couldn't be fetched from the development machine, so they still need confirming against the originals.

- **API: confirmed as assumed.** A deploy takes a digest of SHA-1s and returns the missing ones. Files are uploaded with `PUT /api/v1/deploys/{deploy_id}/files/{path}` (`application/octet-stream`).
- **Apex domain: confirmed.** The A record goes to `75.2.60.5`, or an ALIAS to `apex-loadbalancer.netlify.com`. `www` is a CNAME to `<site>.netlify.app`. Netlify recommends `www` as the primary domain when DNS is external.
- **API rate limits:** 500 requests per minute; deploys at most 3 per minute and 100 per day, per account.
- **Pricing is credit-based.** Every production deploy costs 15 credits, and bandwidth costs 20 credits per GB.
  - Free: 300 credits a month, about 20 deploys in total. Sites pause when the credits run out.
  - Personal: $9 a month for 1,000 credits.
  - Pro: $20 a month for 3,000 credits, about 200 deploys a month across all sites.
- **Terms: this is the blocker for hosting clients' sites in one account.**
  - The standard licence is non-transferable, "without the right to sublicense".
  - Reselling Netlify to clients needs a separate **Reseller Addendum** under the Partner Program.
  - Netlify's agency guide advises *not* keeping clients' production projects in the agency's own account.

  One account (ours) hosting every customer's site is therefore outside the standard terms, unless a reseller agreement is signed.

## Real publish (task 5.3, 2026-09-30)

- Connecting a workspace with a real Netlify token and publishing a real project worked: the
  site was created in the workspace's own Netlify team and went live.
- Not reported from the real run: a custom domain, a redirect after a page's address changed,
  and "Make live again". The e2e suite covers them against the fake Netlify only; check them on
  the first customer site with a domain.

## Risks / Trade-offs

- **[Resolved] Netlify's terms and pricing don't fit hosting every client site in one account** (see Findings). → Each workspace connects its own Netlify team. The client's plan, credits and deploy limits are theirs, and each publish costs 15 of their credits. The `PublishTarget` interface keeps other providers open.
- **[Risk] A Netlify personal access token grants access to the customer's whole Netlify account.** → It's encrypted at rest (decision 3), never shown again, and never logged; only owners can connect it. The README advises creating the token under a Netlify user dedicated to publishing, where the client's plan allows it.
- **[Risk] Losing `SECRET_KEY` makes every stored token unreadable.** → Owners reconnect with a new token, and publishing and sites are otherwise unaffected. The README says to back the key up with the database.
- **[Risk] The API differs from what's assumed above** (endpoints, apex IP). → Task 1.1 confirms against Netlify's current documentation, and the fake mirrors what is confirmed.
- **[Trade-off] Publishing is in-process.** A server restart interrupts a running publish, which is then marked failed. The site keeps showing the previous deploy (deploys are atomic), and the member publishes again.
- **[Trade-off] GDPR.** Visitors' requests are served by a US company (Netlify, with a DPA and SCCs). The README says so, so operators can tell their customers.
- **[Risk] Leaking the token.** → It is decrypted only inside `publishTarget()` and never goes into a response or a log. A test asserts that no API response, and no plain-text database column, contains it.
