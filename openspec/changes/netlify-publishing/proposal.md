# Proposal

## Why

Owners can build a complete site, but the only way to get it online is to download the ZIP and upload it somewhere themselves. The roadmap's goal ends at a published, standards-compliant site, and this is the missing step: Milestone 4.

Sites are published to Netlify, into **each customer's own Netlify team**. Netlify's standard terms don't allow one agency account to host (resell) its clients' sites without a reseller agreement, and its credit-based pricing makes each client's plan and usage theirs (see design.md, Findings).

## What Changes

- **Connecting a workspace to Netlify.** A workspace owner pastes a Netlify personal access token into the workspace settings. The admin checks it, lets the owner choose the Netlify team to publish into, and stores the token encrypted. An owner can disconnect it again.
- **Publishing to the workspace's Netlify team.** Members (owners and editors) press **Publish** in the editor or on the project page. The server then:
  - exports the saved site;
  - creates the project's Netlify site the first time (`https://sc-<project>.netlify.app`);
  - deploys only the files Netlify doesn't already have, as one atomic deploy;
  - records the publish.

  The token never leaves the server.
- **Publishing needs a saved site without errors,** as the ZIP download does. Warnings are fine. Unsaved changes in the editor aren't published; the editor asks the owner to save first.
- **Publish status.** A publish runs in the background, and the owner sees "Publishing…", then "Published" with the address, or a readable error. Only one publish per project runs at a time.
- **Custom domain.** In the project's new **Publishing** page, a member can connect a domain (for example `anideti.cz`, with `www` alongside). The page shows the DNS records to set at the registrar, and the connection's state: waiting for DNS, certificate being issued, or ready. Netlify issues the certificate. The domain can be disconnected again.
- **Base URL from publishing.** The site's address is the connected domain once it's ready, otherwise the `netlify.app` address. It is used for the sitemap and for new canonical links, replacing the document's `base_url`, which the editor never exposed.
- **Automatic redirects.** When a page's address changes, its earlier published addresses redirect (301) to the current one, through a `_redirects` file in each deploy. Addresses of deleted pages return "not found".
- **History and rollback.** The Publishing page lists earlier publishes (when, by whom, which saved version). **Make live again** restores an earlier deploy instantly. It doesn't change what's being edited.

### Non-goals (this change)

- Publishing to the customer's own hosting (FTP/SFTP) and other providers (Bunny.net). The publishing interface leaves room for them.
- Taking a site offline or deleting its Netlify site, billing, and publishing on a schedule.
- Favicon, social share images, and SEO settings beyond canonical links and the sitemap.
- Each language of a site (Milestone 5).

## Capabilities

### New Capabilities

- `publishing`:
  - connecting a workspace to its Netlify team;
  - publishing a project's saved site to the hosting provider, and who may publish;
  - publish status and history, and making an earlier publish live again;
  - the site's address and connecting a custom domain;
  - redirects from earlier addresses;
  - keeping provider credentials encrypted on the server.

### Modified Capabilities

- `site-rendering`: pages get a canonical link when rendering is given the site's address.
- `site-export`: the sitemap uses the address given to export (falling back to the document's `base_url`), and export can add a `_redirects` file.

## Impact

- `packages/site`:
  - a `siteUrl` render and export option (canonical links, sitemap);
  - an optional `redirects` export option writing `_redirects`;
  - tests.
- `apps/admin`:
  - `hosting_connections` (per workspace, token encrypted), `project_hosting` and `publishes` tables (the Netlify site, the domain and its state) with a migration;
  - token encryption with a key from `SECRET_KEY`;
  - `$lib/server/publishing/`: a `PublishTarget` interface, a Netlify adapter (sites, digest deploys, uploads, domains, restore), the publish job and the redirect builder;
  - API routes (`POST …/publish`, `GET …/publishes`, domain connect, disconnect and check, restore);
  - the Publish button in the editor and on the project page, and the new Publishing page;
  - configuration (`SECRET_KEY`; `NETLIFY_API_URL` for tests), and a "connect Netlify first" state;
  - the Netlify connection in the workspace settings;
  - tests against a fake Netlify API.
- No new runtime dependencies: `fetch` and `node:crypto`.
- Operations: backing up `SECRET_KEY` (without it, stored tokens can't be read); Netlify plans and limits per customer, documented in the README; the roadmap's Milestone 4.
