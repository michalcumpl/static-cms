## MODIFIED Requirements

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
- **Webmio hosting:** a subdomain is served as itself, and a bare domain at its `www.` subdomain. Each needs a CNAME record pointing at the website's own target, `<name>.sites.webmio.net`, where `<name>` is the website's free address name. The target SHALL NOT change for as long as the website exists. The domain SHALL count as pointed only when its CNAME record names this website's target. For a bare domain, the page SHALL also tell the member to forward the bare domain to `https://www.<domain>` at the registrar. The website's address is the served hostname. A domain that the CDN refuses because another service uses it SHALL be refused with a message saying so.
- **Netlify:** `www.` is added alongside a bare domain, with an A record for the bare domain and a CNAME record for `www.`.

#### Scenario: Connect a bare domain on Webmio hosting
- **WHEN** a member connects `pekarna.cz` to the website `pekarna-u-lipy.webmio.site`
- **THEN** the project shows a CNAME record for `www.pekarna.cz` pointing at `pekarna-u-lipy.sites.webmio.net`, asks to forward `pekarna.cz` to `https://www.pekarna.cz` at the registrar, and shows the state "waiting for DNS"

#### Scenario: Connect a subdomain on Webmio hosting
- **WHEN** a member connects `web.anideti.cz` to the website `anideti.webmio.site`
- **THEN** the project shows a CNAME record for `web.anideti.cz` pointing at `anideti.sites.webmio.net`

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
