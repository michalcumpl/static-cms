## MODIFIED Requirements

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

## ADDED Requirements

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
