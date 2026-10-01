# Spec Delta

## MODIFIED Requirements

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
