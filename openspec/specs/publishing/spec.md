# publishing Specification

## Purpose

Puts a project's saved site on the web: connecting a workspace to its own hosting account, publishing to it, connecting the owner's domain, redirecting earlier addresses, and keeping a history that can be made live again.

## Requirements

### Requirement: Connecting a workspace to Netlify
A workspace owner SHALL be able to connect the workspace to a Netlify team by entering a Netlify personal access token. The server SHALL check the token with Netlify, let the owner choose one of the teams the token can access, and store the connection for the workspace. A token Netlify refuses SHALL be rejected with a message. An owner SHALL be able to disconnect the workspace; its projects' sites at Netlify stay as they are. Editors SHALL see whether the workspace is connected and to which team, but SHALL NOT connect or disconnect it.

#### Scenario: Connect with a token
- **WHEN** an owner enters a valid token that can access the teams "Aniděti" and "Personal", and chooses "Aniděti"
- **THEN** the workspace shows it is connected to the Netlify team "Aniděti"

#### Scenario: Rejected token
- **WHEN** an owner enters a token Netlify refuses
- **THEN** nothing is stored and the owner is told the token isn't valid

#### Scenario: Editor can't connect
- **WHEN** an editor opens the workspace settings
- **THEN** they see the Netlify connection's state but no way to connect or disconnect

### Requirement: Publishing a site
A member of a project's workspace (owner or editor) SHALL be able to publish the project's saved site. Publishing SHALL export the saved documents of every published language (the primary always included) together with their images, with the site's address (see "Site address") and its redirects (see "Redirects from earlier addresses"), and deploy the result to the project's site in the workspace's connected Netlify team as one deploy, which visitors see all at once or not at all. The first publish SHALL create the project's site in that team. Publishing SHALL be refused, with a message to connect Netlify first, when the workspace isn't connected. Publishing SHALL be refused when the saved document has validation errors, with the errors listed; warnings SHALL NOT prevent it. Unsaved changes in the editor are not part of a publish.

#### Scenario: First publish
- **WHEN** a member publishes a valid project that was never published
- **THEN** the project gets a site at the provider, the site shows the saved pages at its `netlify.app` address, and the publish is recorded

#### Scenario: Publishing with errors
- **WHEN** a member publishes a project whose saved document has an image without a description
- **THEN** nothing is deployed and the member is shown the problems to fix

#### Scenario: Editor with unsaved changes
- **WHEN** the owner has unsaved changes in the editor and presses Publish
- **THEN** the editor asks to save first and publishes only after a successful save

#### Scenario: Two published languages
- **WHEN** a member publishes a project with Czech (primary) and published English
- **THEN** one deploy serves the Czech pages at `/` and the English pages at `/en/`

#### Scenario: Hidden language
- **WHEN** a project has a hidden German language and a member publishes
- **THEN** the deploy contains no `/de/` pages, and the published pages link no German alternate

### Requirement: Publish status
A publish SHALL run in the background. While it runs, the project SHALL show it as publishing; afterwards as published (with the time, who published, and the address) or as failed (with a readable reason). A project SHALL have at most one publish running at a time; publishing again while one runs SHALL be refused with a message. Only files the provider doesn't already have from earlier deploys SHALL be uploaded.

#### Scenario: Second publish uploads only changes
- **WHEN** a member changes one heading, saves and publishes again
- **THEN** only the changed page's HTML is uploaded, and the site shows the new heading

#### Scenario: Provider unreachable
- **WHEN** the provider's API can't be reached during a publish
- **THEN** the publish is shown as failed with a message saying the hosting service couldn't be reached, and the site keeps showing the previous publish

#### Scenario: Publishing twice at once
- **WHEN** a member presses Publish while a publish of the same project is running
- **THEN** the second request is refused and the running publish continues

### Requirement: Site address
Each published project SHALL have an address: its connected custom domain once the domain is ready, otherwise its `netlify.app` address. The address SHALL be used as the site's base URL for its sitemap and canonical links, and shown with every successful publish.

#### Scenario: Address before a domain is connected
- **WHEN** a project without a custom domain is published
- **THEN** its sitemap and canonical links use `https://sc-<project>.netlify.app`

#### Scenario: Address after the domain is ready
- **WHEN** the project's domain `anideti.cz` is ready and the project is published again
- **THEN** its sitemap and canonical links use `https://anideti.cz`

### Requirement: Custom domain
A member SHALL be able to connect a domain to a published project, and disconnect it. Connecting SHALL accept a bare domain (such as `anideti.cz`) or a subdomain (such as `web.anideti.cz`), SHALL add `www.` alongside a bare domain, and SHALL show the DNS records to set at the domain's registrar. The project SHALL show the domain's state: waiting for DNS, issuing the certificate, or ready; a member SHALL be able to check the state again on demand. A domain already connected to another project SHALL be refused.

#### Scenario: Connect a bare domain
- **WHEN** a member connects `anideti.cz`
- **THEN** the project shows an A record for `anideti.cz` and a CNAME record for `www.anideti.cz` pointing at the project's `netlify.app` address, and the state "waiting for DNS"

#### Scenario: Domain becomes ready
- **WHEN** the DNS records are set and the provider has issued the certificate, and a member checks again
- **THEN** the state is "ready" and the site's address is `https://anideti.cz`

#### Scenario: Invalid domain
- **WHEN** a member enters `https://anideti.cz/kontakt`
- **THEN** the domain is refused with a message asking for a domain name only, such as `anideti.cz`

### Requirement: Redirects from earlier addresses
Each deploy SHALL redirect (301) every address at which a still-existing page was published before to that page's current address in the same language. Addresses of pages that no longer exist, and of languages that are no longer published, SHALL NOT be redirected. The redirects SHALL follow the same base path as the pages, `/<lang>/` included.

#### Scenario: Renamed address
- **WHEN** the page "Kontakt" was published at `/kontakt/`, its address is changed to `/napiste-nam/`, and the site is published again
- **THEN** `/kontakt/` redirects permanently to `/napiste-nam/`

#### Scenario: Deleted page
- **WHEN** a published page is deleted and the site is published again
- **THEN** its old address is not redirected

#### Scenario: Renamed English page
- **WHEN** the English copy of "Kontakt" was published at `/en/kontakt/`, its slug is changed to `contact`, and the site is published again
- **THEN** `/en/kontakt/` redirects permanently to `/en/contact/`

### Requirement: Publish history and rollback
The project SHALL list its publishes, newest first, with the time, who published, the languages and saved versions it included, and the outcome, and SHALL mark the one that is live. A member SHALL be able to make an earlier successful publish live again; this SHALL switch the site to that deploy without re-uploading and without changing the project's saved document.

#### Scenario: Make an earlier publish live again
- **WHEN** a member makes the previous publish live again
- **THEN** visitors see the previous version of the site, the history marks it as live, and the editor still shows the latest saved document

### Requirement: Hosting credentials
A workspace's Netlify token SHALL be stored encrypted with a key from the server's configuration, and SHALL never be sent to browsers, shown again after it was entered, or written to logs. When the server has no encryption key, connecting SHALL be refused with a message that publishing isn't set up on this server. When Netlify refuses a stored token (revoked or expired), a publish SHALL fail with a message asking an owner to reconnect Netlify.

#### Scenario: Token never shown again
- **WHEN** an owner has connected the workspace and anyone opens the workspace settings or calls the API
- **THEN** no response contains the token, and the database holds it only in encrypted form

#### Scenario: Not connected
- **WHEN** a member opens the Publishing page of a project whose workspace isn't connected to Netlify
- **THEN** the page says an owner needs to connect Netlify in the workspace settings, and the Publish button is disabled

#### Scenario: Revoked token
- **WHEN** the connected token was revoked at Netlify and a member publishes
- **THEN** the publish fails with a message asking an owner to reconnect Netlify

### Requirement: Access to publishing
Publishing, the publish history, rollback and domain settings SHALL be available only to members of the project's workspace; connecting and disconnecting Netlify only to its owners. Others SHALL get "not found", or 401 when not signed in. Requests that change them SHALL be refused when they come from another site's page.

#### Scenario: Someone else's project
- **WHEN** a member of workspace A tries to publish a project of workspace B
- **THEN** the response is "not found" and nothing is published
