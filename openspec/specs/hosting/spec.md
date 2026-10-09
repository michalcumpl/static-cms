# hosting Specification

## Purpose

Webmio hosting serves every published website from our own infrastructure. It maps each hostname
to its website's live publish and serves its pages, redirects and 404 page over HTTPS. Switching
to a new publish or back to an earlier one is atomic and doesn't re-upload anything.

## Requirements

### Requirement: Serving a website by its hostname
Webmio hosting SHALL serve each request from the live publish of the website its hostname belongs to: the website's free address, or its custom domain once connected. A hostname that belongs to no website SHALL get a short "No website here" page with status 404. A request SHALL NOT reach files of another website or of a publish that isn't live, whatever its path.

#### Scenario: Free address
- **WHEN** a visitor opens `https://pekarna-u-lipy.webmio.site/`
- **THEN** they get the home page of that website's live publish

#### Scenario: Unknown hostname
- **WHEN** a visitor opens `https://nic-tu-neni.webmio.site/`
- **THEN** they get the "No website here" page with status 404

#### Scenario: Escaping the publish
- **WHEN** a visitor requests `https://pekarna-u-lipy.webmio.site/../other-site/index.html` or an encoded variant of it
- **THEN** nothing outside the live publish of `pekarna-u-lipy` is served

### Requirement: Pages and files
Webmio hosting SHALL serve `/` from the publish's `index.html` and an address ending in `/` from that folder's `index.html`. An address without a trailing slash and without a file extension SHALL redirect permanently (301) to the same address with the slash. Files SHALL be served with the content type of their extension. Query strings SHALL NOT change which file is served. Plain HTTP requests SHALL redirect permanently to HTTPS.

#### Scenario: Page address
- **WHEN** a visitor opens `/kontakt/`
- **THEN** they get the publish's `kontakt/index.html` as `text/html; charset=utf-8`

#### Scenario: Missing slash
- **WHEN** a visitor opens `/kontakt`
- **THEN** they are redirected (301) to `/kontakt/`

#### Scenario: Stylesheet
- **WHEN** a page loads `/assets/style.css`
- **THEN** it is served as `text/css`

#### Scenario: HTTP
- **WHEN** a visitor opens `http://pekarna-u-lipy.webmio.site/kontakt/`
- **THEN** they are redirected (301) to `https://pekarna-u-lipy.webmio.site/kontakt/`

### Requirement: Not found
An address that matches no file and no redirect of the live publish SHALL get that publish's `404.html` with status 404.

#### Scenario: Missing page
- **WHEN** a visitor opens `/stara-stranka/`, which the live publish doesn't have and no redirect covers
- **THEN** they get the website's own 404 page with status 404

### Requirement: Redirects of the live publish
Webmio hosting SHALL apply the redirects of the live publish (see "Redirects from earlier addresses" in the publishing capability) as permanent (301) redirects, whether the address is requested with or without its trailing slash. Making another publish live SHALL apply that publish's redirects instead.

#### Scenario: Earlier address
- **WHEN** the live publish redirects `/kontakt/` to `/napiste-nam/`, and a visitor opens `/kontakt`
- **THEN** they are redirected (301) to `/napiste-nam/`

#### Scenario: Redirects follow rollback
- **WHEN** a publish without the `/kontakt/` redirect is made live again
- **THEN** `/kontakt/` is no longer redirected

### Requirement: Atomic switch between publishes
A website SHALL switch from one publish to another, by publishing or by making an earlier publish live again, in one step: no request SHALL get files from both. After the switch, a visitor who loads the website again SHALL get the new publish within a minute, without the old files being purged from caches.

#### Scenario: New publish
- **WHEN** a member publishes a changed heading and the publish is shown as published
- **THEN** a visitor reloading the page within a minute sees the new heading, with the stylesheet of the same publish

#### Scenario: No mixed publish while uploading
- **WHEN** a publish is still uploading files
- **THEN** visitors keep getting every file from the previous publish

### Requirement: Caching
Every file of a publish SHALL be cached at the edge for as long as the publish is kept, since a publish's files never change. Browsers SHALL revalidate pages, stylesheets, scripts, `sitemap.xml` and `robots.txt` on every load. Images and fonts MAY be cached by browsers for up to a day.

#### Scenario: Stylesheet after a new publish
- **WHEN** a new publish changes `assets/style.css` and a visitor who has the old one reloads a page
- **THEN** the browser gets the new stylesheet

### Requirement: Free address redirects to the custom domain
Once a website's custom domain is ready, requests to its free address SHALL redirect permanently (301) to the same path on the custom domain. While the website has no ready domain, the free address SHALL serve the website itself.

#### Scenario: Domain ready
- **WHEN** `www.pekarna.cz` is ready for the website and a visitor opens `https://pekarna-u-lipy.webmio.site/menu/`
- **THEN** they are redirected (301) to `https://www.pekarna.cz/menu/`

#### Scenario: Domain disconnected
- **WHEN** the custom domain is disconnected
- **THEN** the free address serves the website again

### Requirement: Keeping publishes
Webmio hosting SHALL keep the files of a website's 10 most recent successful publishes, and the live one whatever its age. After a successful publish, the files of older publishes SHALL be deleted. A failed publish SHALL leave no files behind.

#### Scenario: Eleventh publish
- **WHEN** a website has 10 kept publishes, the live one the newest, and a member publishes successfully again
- **THEN** the oldest publish's files are deleted, and the other 10 can still be made live again

#### Scenario: Old live publish
- **WHEN** a member made the oldest kept publish live again and then publishes 10 times more
- **THEN** each new publish becomes live in turn, and none of them deletes files of the publish that is live at that moment

### Requirement: Infrastructure defined in the repository
The infrastructure that Webmio hosting runs on SHALL be defined in the repository as code, deployable per environment (`dev`, `prod`) with one command. A deployment SHALL output every value the admin needs to publish to it. The admin SHALL get only the permissions publishing needs: reading and writing the hosting bucket, the hostname store, and the distribution's tenants.

#### Scenario: New environment
- **WHEN** an operator deploys the `dev` environment into an empty AWS account with the `webmio.site` and `webmio.net` zones delegated
- **THEN** the deployment succeeds and prints the values to put in the admin's environment
