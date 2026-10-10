# Spec Delta

## MODIFIED Requirements

### Requirement: Project panel
A project SHALL have a panel (control-panel design decision 1): a dashboard and section pages, shown under a header with the project's name, a link back to the project list, and the actions Preview and Open editor. A section bar SHALL link to:
- **Overview**, the dashboard, at `/p/<project>/`;
- **Business** at `/p/<project>/business`;
- **What you offer** at `/p/<project>/offer`;
- **About you** at `/p/<project>/about`;
- **Website** at `/p/<project>/website`, with its subpages Pages and menu (`/website/pages`), Languages (`/website/languages`) and Domain (`/website/domain`);
- **Publish** at `/p/<project>/publish`, with its subpage Versions (`/publish/versions`).
- **Messages** at `/p/<project>/messages`, the contact forms' messages (see the contact-messages
  capability), with the number of unhandled messages beside its name.

Each page SHALL have its own address, so it can be bookmarked, opened in a new window, and reached with the browser's Back button. The current section SHALL be marked in the way assistive technology announces as the current page, and a subpage SHALL also mark its subpage. The access rules are those of the project (see the accounts capability): members of the project's workspace see every page, others get "not found". The pages that show one language (Business, What you offer, About you, Website, Pages and menu, Versions) SHALL take it from `?lang=`, the primary language without it, SHALL offer a language choice when the project has more than one language, and SHALL keep the language when the owner moves between them.

#### Scenario: Open a section
- **WHEN** a member opens the Business section of "Pekárna U Lípy"
- **THEN** the header shows the project's name, Business is marked as current in the section bar, and the address is `/p/<project>/business`

#### Scenario: Not a member
- **WHEN** someone who isn't a member of the workspace opens `/p/<project>/offer`
- **THEN** they get "not found", as for the other pages

#### Scenario: Keep the language between sections
- **WHEN** the owner chooses English in the Business section and then opens What you offer
- **THEN** What you offer shows the English services

#### Scenario: Unhandled messages
- **WHEN** the bakery has three unhandled messages
- **THEN** the section bar shows "Messages 3", and the Messages section lists them
