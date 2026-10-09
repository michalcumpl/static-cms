# Spec Delta

## MODIFIED Requirements

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
