# Spec Delta

## ADDED Requirements

### Requirement: Canonical links
Rendering SHALL accept an optional site address (an absolute `http` or `https` URL, such as `https://anideti.cz`). When it is given, each page SHALL include `<link rel="canonical">` with the page's absolute URL: the site address followed by the page's address (the site address with a trailing slash for the home page). Without a site address, pages SHALL have no canonical link. A site address that isn't an absolute http(s) URL SHALL be rejected with an error.

#### Scenario: Canonical link of a page
- **WHEN** rendering the page `kontakt` with site address `https://anideti.cz`
- **THEN** it contains `<link rel="canonical" href="https://anideti.cz/kontakt/">`

#### Scenario: Canonical link of the home page
- **WHEN** rendering the home page with site address `https://anideti.cz/`
- **THEN** it contains `<link rel="canonical" href="https://anideti.cz/">`

#### Scenario: No site address
- **WHEN** rendering without a site address
- **THEN** no page contains a canonical link
