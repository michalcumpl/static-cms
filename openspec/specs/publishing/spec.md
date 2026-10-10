# publishing Specification

## Purpose

Puts a project's saved site on the web: publishing it to Webmio hosting (or, for websites already there, to the workspace's own Netlify team), connecting the owner's domain, redirecting earlier addresses, and keeping a history that can be made live again.

## Requirements

### Requirement: Connecting a workspace to Netlify
A workspace owner SHALL be able to connect the workspace to a Netlify team by entering a Netlify personal access token. The server SHALL check the token with Netlify, let the owner choose one of the teams the token can access, and store the connection for the workspace. A token Netlify refuses SHALL be rejected with a message. An owner SHALL be able to disconnect the workspace; its projects' sites at Netlify stay as they are. Editors SHALL see whether the workspace is connected and to which team, but SHALL NOT connect or disconnect it. When the server has Webmio hosting configured, the workspace settings SHALL say that the workspace's websites are hosted by Webmio. They SHALL show the Netlify connection only to a workspace that is connected, so its owners can still disconnect it, and SHALL offer no way to connect a new one.

#### Scenario: Connect with a token
- **WHEN** an owner of a server without Webmio hosting enters a valid token that can access the teams "Aniděti" and "Personal", and chooses "Aniděti"
- **THEN** the workspace shows it is connected to the Netlify team "Aniděti"

#### Scenario: Rejected token
- **WHEN** an owner enters a token Netlify refuses
- **THEN** nothing is stored and the owner is told the token isn't valid

#### Scenario: Editor can't connect
- **WHEN** an editor opens the workspace settings
- **THEN** they see the Netlify connection's state but no way to connect or disconnect

#### Scenario: Webmio hosting, not connected
- **WHEN** the server has Webmio hosting configured and an owner of a workspace that was never connected opens the workspace settings
- **THEN** the page says the workspace's websites are hosted by Webmio, and there is no way to connect Netlify

### Requirement: Publishing a site
A member of a project's workspace (owner or editor) SHALL be able to publish the project's saved site. Publishing SHALL export the saved documents of every published language (the primary always included) together with their images, with the site's address (see "Site address") and its redirects (see "Redirects from earlier addresses"), and deploy the result to the project's hosting as one deploy, which visitors see all at once or not at all.

The project's hosting SHALL be chosen as follows:
- A project already published to Netlify SHALL keep publishing to its Netlify site.
- Any other project SHALL publish to Webmio hosting when the server has it configured, and to the workspace's connected Netlify team otherwise.

The first publish SHALL create the project's site there. Publishing to Netlify SHALL be refused, with a message to connect Netlify first, when the workspace isn't connected. Publishing SHALL be refused when the saved document has validation errors, with the errors listed; warnings SHALL NOT prevent it. Unsaved changes in the editor are not part of a publish.

#### Scenario: First publish
- **WHEN** a member publishes a valid project that was never published, on a server with Webmio hosting
- **THEN** the project gets a website on Webmio hosting, the website shows the saved pages at its `webmio.site` address, and the publish is recorded

#### Scenario: First publish without Webmio hosting
- **WHEN** a member publishes a valid project that was never published, on a server without Webmio hosting, in a workspace connected to Netlify
- **THEN** the project gets a site at Netlify, the site shows the saved pages at its `netlify.app` address, and the publish is recorded

#### Scenario: Website already on Netlify
- **WHEN** the server has Webmio hosting configured and a member publishes a project that was published to Netlify before
- **THEN** the publish goes to the project's Netlify site

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
A publish SHALL run in the background. While it runs, the project SHALL show it as publishing, with its current step: checking the site, uploading, or verifying the live website. Afterwards it SHALL show it as published (with the time, who published, and the address) or as failed. A project SHALL have at most one publish running at a time; publishing again while one runs SHALL be refused with a message. Only files the provider doesn't already have from earlier deploys SHALL be uploaded.

A failed publish SHALL say, in the member's language and without technical detail first:
- what went wrong;
- whether the previous version is still online, or that the website isn't online yet when it was never published.

It SHALL offer **Try again**, which publishes the saved site again as Publish does. A successful publish SHALL list the warnings it found (see "Checking links to other websites").

#### Scenario: Second publish uploads only changes
- **WHEN** a member changes one heading, saves and publishes again
- **THEN** only the changed page's HTML is uploaded, and the site shows the new heading

#### Scenario: Steps while publishing
- **WHEN** a member publishes and watches the Publish page
- **THEN** the publish is shown as checking the site, then uploading, then verifying the live website, then published

#### Scenario: Provider unreachable
- **WHEN** the provider's API can't be reached during a publish
- **THEN** the publish is shown as failed with a message saying the hosting service couldn't be reached and that the previous version is still online, and the site keeps showing the previous publish

#### Scenario: Try again
- **WHEN** a publish failed and the member chooses Try again
- **THEN** a new publish of the saved site starts, as if they had pressed Publish

#### Scenario: Publishing twice at once
- **WHEN** a member presses Publish while a publish of the same project is running
- **THEN** the second request is refused and the running publish continues

### Requirement: Checking the site's own links
Before anything is uploaded, a publish SHALL check that every reference in its pages and stylesheets that points into the website leads to a file of the same publish:
- page links;
- images, including every size an image offers;
- stylesheets, scripts and icons;
- fonts referenced by stylesheets.

An address ending in `/` leads to that folder's `index.html`. The targets of the website's redirects from earlier addresses SHALL lead to a file as well. A reference that leads nowhere SHALL fail the publish before anything is uploaded. The failure SHALL name each broken address and the page that refers to it. Links to the website's own address written in full (`https://<address>/…`) count as references into the website.

#### Scenario: Every reference leads somewhere
- **WHEN** a member publishes a valid site
- **THEN** the check passes and the publish goes on to upload

#### Scenario: A page links to a file the publish lacks
- **WHEN** an exported page links to `/cenik/`, but the publish has no `cenik/index.html`
- **THEN** the publish fails before uploading, saying that the home page links to `/cenik/`, which isn't part of the website, and the previous version stays online

#### Scenario: A stylesheet's font is missing
- **WHEN** the stylesheet refers to a font file the publish doesn't contain
- **THEN** the publish fails before uploading and names the font's address

### Requirement: Checking links to other websites
A publish SHALL ask every address on another website that its pages link to whether it answers, each address once, with a short timeout. Addresses that answer with an error or don't answer SHALL be listed as warnings with the publish. They SHALL NOT fail or delay the publish beyond that check. Links to email addresses and phone numbers SHALL NOT be checked. The server's operator SHALL be able to turn this check off.

#### Scenario: An outside link doesn't answer
- **WHEN** a page links to `https://stary-eshop.example/` and that address doesn't answer, and a member publishes
- **THEN** the website is published, and the publish lists a warning that the link to `https://stary-eshop.example/` on the contact page didn't answer

#### Scenario: Outside links answer
- **WHEN** every outside link answers
- **THEN** the publish lists no warnings

### Requirement: Verifying the live website
After the hosting switches to a new publish, the publish SHALL fetch every page and file of that publish at the website's address, until the new version is served or about two minutes have passed:
- pages, stylesheets, scripts, the sitemap and `robots.txt` SHALL match the published files exactly;
- images, fonts and other files SHALL be present with their published size.

The website's address is its ready custom domain, otherwise its free address. Only when everything matches SHALL the publish be shown as published.

#### Scenario: The new version is served
- **WHEN** a member publishes and the hosting serves every file of the new publish within a minute
- **THEN** the publish is shown as published

#### Scenario: A page doesn't arrive
- **WHEN** a member publishes and, after two minutes, the hosting still serves the old version of `/kontakt/`
- **THEN** the publish fails, saying the website didn't show the new version, and the previous version is online again (see "Keeping the previous version when a publish fails")

### Requirement: Keeping the previous version when a publish fails
When a publish fails before the switch, the publish that was live SHALL stay live. When it fails at verification, the website SHALL switch back to the publish that was live before, without re-uploading, and the failed publish's files SHALL be removed where the hosting keeps them per publish. A website's first publish has nothing to go back to: the website SHALL be taken offline again, its address answering as before the publish. The next publish then starts as a first publish. This SHALL hold on Webmio hosting and on Netlify.

#### Scenario: Verification fails on a published website
- **WHEN** a website on Webmio hosting has a live publish, and a new publish fails verification
- **THEN** visitors get the previous version again within a minute, the history marks the previous publish as live, and the failed publish's files are gone

#### Scenario: Verification fails on a first publish
- **WHEN** a website's first publish fails verification
- **THEN** its address answers as before the publish ("No website here" on Webmio hosting), the failure says the website isn't online yet, and Try again publishes it as a first publish

#### Scenario: Verification fails on Netlify
- **WHEN** a website on Netlify has a live publish, and a new publish fails verification
- **THEN** the previous deploy is made live again at Netlify, and the history marks the previous publish as live

### Requirement: Site address
Each published project SHALL have an address: its connected custom domain once the domain is ready, otherwise its free address. On Webmio hosting the free address SHALL be `https://<name>.webmio.site`. The name comes from the project's name at the first publish: lowercase, without diacritics, words joined by dashes, at most 40 characters. A number is added (`-2`, `-3`, …) when the name is taken or reserved for Webmio's own use. The name SHALL NOT change when the project is renamed. On Netlify the free address is the site's `netlify.app` address. The address SHALL be used as the site's base URL for its sitemap and canonical links, and shown with every successful publish.

#### Scenario: Free address from the name
- **WHEN** the project "Pekárna U Lípy" is first published to Webmio hosting
- **THEN** its sitemap and canonical links use `https://pekarna-u-lipy.webmio.site`

#### Scenario: Name taken
- **WHEN** another website already has `pekarna-u-lipy.webmio.site` and a second project "Pekárna u Lípy" is first published
- **THEN** its address is `https://pekarna-u-lipy-2.webmio.site`

#### Scenario: Reserved name
- **WHEN** a project named "WWW" is first published to Webmio hosting
- **THEN** its address is `https://www-2.webmio.site`

#### Scenario: Address before a domain is connected
- **WHEN** a project on Netlify without a custom domain is published
- **THEN** its sitemap and canonical links use `https://sc-<project>.netlify.app`

#### Scenario: Address after the domain is ready
- **WHEN** the project's domain `anideti.cz` is ready on Netlify and the project is published again
- **THEN** its sitemap and canonical links use `https://anideti.cz`

### Requirement: Custom domain
A member SHALL be able to connect a domain to a published project, and disconnect it. Connecting SHALL accept a bare domain (such as `anideti.cz`) or a subdomain (such as `web.anideti.cz`). It SHALL show the DNS records to set at the domain's registrar, and the domain's state: waiting for DNS, issuing the certificate, or ready. A member SHALL be able to check the state again on demand. A domain already connected to another project SHALL be refused.

Where the website is served depends on its hosting:
- **Webmio hosting:** a subdomain is served as itself, and a bare domain at its `www.` subdomain. Each needs a CNAME record pointing at the website's own target, `<name>.sites.webmio.net`, where `<name>` is the website's free address name. The target SHALL NOT change for as long as the website exists. The domain SHALL count as pointed only when its CNAME record names this website's target. The website's address is the served hostname. A domain that the CDN refuses because another service uses it SHALL be refused with a message saying so.
- **Webmio hosting, bare domain:** the page SHALL also show an A record for the bare domain pointing at the redirect server, and ask the member to remove the registrar's forwarding and any other A or AAAA records of the bare domain. The bare domain SHALL have a state of its own: waiting for DNS (its addresses aren't exactly the redirect server's), issuing the certificate, or redirecting (`https://<domain>/` answers with a redirect to `https://www.<domain>/`). Checking SHALL request `https://<domain>/` once its DNS points at the redirect server, so its certificate is issued before the first visitor needs it. The domain's state, its address and the free address's redirect SHALL depend on `www.` alone, so a bare domain still forwarded at the registrar doesn't hold the website back. Where Webmio hosting has no redirect server, as in development, the page SHALL ask to forward the bare domain to `https://www.<domain>` at the registrar instead, and show no A record or bare-domain state.
- **Netlify:** `www.` is added alongside a bare domain, with an A record for the bare domain and a CNAME record for `www.`.

#### Scenario: Connect a bare domain on Webmio hosting
- **WHEN** a member connects `pekarna.cz` to the website `pekarna-u-lipy.webmio.site`, and the redirect server's address is `203.0.113.7`
- **THEN** the project shows a CNAME record for `www.pekarna.cz` pointing at `pekarna-u-lipy.sites.webmio.net` and an A record for `pekarna.cz` pointing at `203.0.113.7`, asks to remove the registrar's forwarding and other records of `pekarna.cz`, and shows the state "waiting for DNS" for both

#### Scenario: Bare domain redirecting
- **WHEN** `pekarna.cz` has only the A record `203.0.113.7`, and a member checks again
- **THEN** `https://pekarna.cz/` is requested, it redirects to `https://www.pekarna.cz/`, and the bare domain's state is "redirecting"

#### Scenario: Bare domain with a leftover record
- **WHEN** `pekarna.cz` has the A records `203.0.113.7` and the registrar's forwarding address, and a member checks again
- **THEN** the bare domain's state stays "waiting for DNS", and the page still asks to remove the other records

#### Scenario: Bare domain still forwarded at the registrar
- **WHEN** the CNAME record for `www.pekarna.cz` is set and its certificate issued, but `pekarna.cz` still points at the registrar's forwarding
- **THEN** the domain's state is "ready" and the site's address is `https://www.pekarna.cz`, while the bare domain's state is "waiting for DNS"

#### Scenario: No redirect server
- **WHEN** a member connects `pekarna.cz` on Webmio hosting without a redirect server
- **THEN** the project shows the CNAME record for `www.pekarna.cz` and asks to forward `pekarna.cz` to `https://www.pekarna.cz` at the registrar

#### Scenario: Connect a subdomain on Webmio hosting
- **WHEN** a member connects `web.anideti.cz` to the website `anideti.webmio.site`
- **THEN** the project shows a CNAME record for `web.anideti.cz` pointing at `anideti.sites.webmio.net`, and no A record

#### Scenario: Domain becomes ready on Webmio hosting
- **WHEN** the CNAME record for `www.pekarna.cz` points at `pekarna-u-lipy.sites.webmio.net`, the certificate has been issued, and a member checks again
- **THEN** the state is "ready", the site's address is `https://www.pekarna.cz`, and the next publish uses it for its sitemap and canonical links

#### Scenario: Pointing at another website's target
- **WHEN** the CNAME record for `www.pekarna.cz` points at `jina-pekarna.sites.webmio.net`, the target of another website, and a member checks again
- **THEN** the state stays "waiting for DNS", and the page still shows the record pointing at `pekarna-u-lipy.sites.webmio.net`

#### Scenario: Domain used elsewhere
- **WHEN** a member connects a domain that the CDN reports as already used by another service
- **THEN** the domain is refused with a message saying it is connected to another service and must be removed there first

#### Scenario: Connect a bare domain
- **WHEN** a member connects `anideti.cz` to a website on Netlify
- **THEN** the project shows an A record for `anideti.cz` and a CNAME record for `www.anideti.cz` pointing at the project's `netlify.app` address, and the state "waiting for DNS"

#### Scenario: Domain becomes ready
- **WHEN** the DNS records are set and Netlify has issued the certificate, and a member checks again
- **THEN** the state is "ready" and the site's address is `https://anideti.cz`

#### Scenario: Invalid domain
- **WHEN** a member enters `https://anideti.cz/kontakt`
- **THEN** the domain is refused with a message asking for a domain name only, such as `anideti.cz`

### Requirement: Redirects from earlier addresses
Each deploy SHALL redirect (301) every address at which a still-existing page was published before to that page's current address in the same language. Addresses of pages that no longer exist, and of languages that are no longer published, SHALL NOT be redirected. The redirects SHALL follow the same base path as the pages, `/<lang>/` included.

A page made by an import (see the site-import capability) SHALL also redirect from its address on the old site, as the path of that address (`/kontakt.html`), for as long as the page exists, unless that path is now another page's address or the page's own. Old addresses with a query (`/?page_id=12`) SHALL NOT be redirected.

#### Scenario: Renamed address
- **WHEN** the page "Kontakt" was published at `/kontakt/`, its address is changed to `/napiste-nam/`, and the site is published again
- **THEN** `/kontakt/` redirects permanently to `/napiste-nam/`

#### Scenario: Deleted page
- **WHEN** a published page is deleted and the site is published again
- **THEN** its old address is not redirected

#### Scenario: Renamed English page
- **WHEN** the English copy of "Kontakt" was published at `/en/kontakt/`, its slug is changed to `contact`, and the site is published again
- **THEN** `/en/kontakt/` redirects permanently to `/en/contact/`

#### Scenario: Imported page
- **WHEN** a page imported from `https://pekarna-ulipy.cz/kontakt.html` has the address `/kontakt/` and the site is published
- **THEN** `/kontakt.html` redirects permanently to `/kontakt/`

#### Scenario: Imported page deleted
- **WHEN** the owner deletes the page imported from `/pecivo.php` and publishes
- **THEN** `/pecivo.php` is not redirected

### Requirement: Publish history and rollback
The project SHALL list its publishes, newest first, with the time, who published, the languages and saved versions it included, and the outcome. It SHALL mark the one that is live. A member SHALL be able to make an earlier successful publish live again. This SHALL switch the site to that deploy without re-uploading and without changing the project's saved document. On Webmio hosting this SHALL be possible only for publishes whose files are still kept (see "Keeping publishes" in the hosting capability); the history SHALL show older ones without the action.

#### Scenario: Make an earlier publish live again
- **WHEN** a member makes the previous publish live again
- **THEN** visitors see the previous version of the site, the history marks it as live, and the editor still shows the latest saved document

#### Scenario: Publish no longer kept
- **WHEN** a website on Webmio hosting has 12 successful publishes
- **THEN** the history lists all 12, and the two oldest offer no way to make them live again

### Requirement: Hosting credentials
A workspace's Netlify token SHALL be stored encrypted with a key from the server's configuration, and SHALL never be sent to browsers, shown again after it was entered, or written to logs. When the server has no encryption key, connecting SHALL be refused with a message that publishing isn't set up on this server. When Netlify refuses a stored token (revoked or expired), a publish SHALL fail with a message asking an owner to reconnect Netlify. Webmio hosting SHALL use the server's own cloud credentials, which SHALL never be stored in the database, sent to browsers or written to logs.

#### Scenario: Token never shown again
- **WHEN** an owner has connected the workspace and anyone opens the workspace settings or calls the API
- **THEN** no response contains the token, and the database holds it only in encrypted form

#### Scenario: Not connected
- **WHEN** the server has no Webmio hosting and a member opens the Publishing page of a project whose workspace isn't connected to Netlify
- **THEN** the page says an owner needs to connect Netlify in the workspace settings, and the Publish button is disabled

#### Scenario: Nothing to connect with Webmio hosting
- **WHEN** the server has Webmio hosting configured and a member opens the Publishing page of a never-published project in a workspace that isn't connected to Netlify
- **THEN** the Publish button is enabled and nothing asks to connect a hosting account

#### Scenario: Revoked token
- **WHEN** the connected token was revoked at Netlify and a member publishes a website on Netlify
- **THEN** the publish fails with a message asking an owner to reconnect Netlify

### Requirement: Access to publishing
Publishing, the publish history, rollback and domain settings SHALL be available only to members of the project's workspace; connecting and disconnecting Netlify only to its owners. Others SHALL get "not found", or 401 when not signed in. Requests that change them SHALL be refused when they come from another site's page.

#### Scenario: Someone else's project
- **WHEN** a member of workspace A tries to publish a project of workspace B
- **THEN** the response is "not found" and nothing is published

### Requirement: Taking a deleted website offline
Deleting a published project SHALL first take its website offline, and only then delete the project.
- **Webmio hosting:** its hostnames SHALL stop serving it at once, its custom domain SHALL be released from the CDN, and its files SHALL be deleted.
- **Netlify:** its Netlify site SHALL be deleted, which also releases its custom domain.

When the hosting service can't be reached or refuses, the project SHALL NOT be deleted, and the owner SHALL see why (as for a failed publish; for Netlify, asking to reconnect Netlify when the token is refused). When the project is on Netlify and the workspace is no longer connected to Netlify, the project SHALL be deleted and its Netlify site left as it is. A restored project SHALL have no site, address or domain: publishing it again creates a new site, chosen as for a project that was never published.

#### Scenario: Offline at once on Webmio hosting
- **WHEN** an owner deletes a website on Webmio hosting with the domain `www.pekarnaulipy.cz`
- **THEN** its `webmio.site` address and `www.pekarnaulipy.cz` answer "No website here" or stop resolving, and the domain can be connected to another project right away

#### Scenario: Offline at once
- **WHEN** an owner deletes a website published on Netlify with the domain `pekarnaulipy.cz`
- **THEN** its Netlify site is deleted, and the domain can be connected to another project right away

#### Scenario: Netlify down
- **WHEN** an owner deletes a website published on Netlify while Netlify can't be reached
- **THEN** the website isn't deleted, stays online, and the owner is told Netlify couldn't be reached

#### Scenario: Webmio hosting down
- **WHEN** an owner deletes a website on Webmio hosting while the hosting service can't be reached
- **THEN** the website isn't deleted, stays online, and the owner is told the hosting service couldn't be reached

#### Scenario: Publish after restoring
- **WHEN** an owner restores a deleted website and publishes it on a server with Webmio hosting
- **THEN** a new website is created for it on Webmio hosting
