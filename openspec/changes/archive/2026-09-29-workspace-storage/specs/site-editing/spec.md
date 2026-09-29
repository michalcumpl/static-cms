# Spec Delta

## MODIFIED Requirements

### Requirement: Editor per page
The editor SHALL be available per project, at `/p/<project>/edit/` for the home page and at `/p/<project>/edit/<slug>/` for every other page, to signed-in members of the project's workspace. It SHALL show the page's navigation and blocks laid out and styled like the published page, using the site's stylesheet. An unknown slug SHALL show a not-found page.

#### Scenario: Open the home page
- **WHEN** a member opens `/p/<project>/edit/`
- **THEN** the home page's blocks are shown in edit mode with the site's theme applied

#### Scenario: Unknown page
- **WHEN** a member opens `/p/<project>/edit/does-not-exist/`
- **THEN** a not-found page is shown

#### Scenario: Someone else's project
- **WHEN** a signed-in person who isn't a member of the project's workspace opens its editor
- **THEN** a not-found page is shown
