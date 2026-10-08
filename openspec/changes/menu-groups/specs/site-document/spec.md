## MODIFIED Requirements

### Requirement: Navigation
The navigation SHALL be an ordered list of navigation items. Each item SHALL be a link or a menu group. A link SHALL have a label and SHALL link either to a page node in the document (by reference) or to an external URL. A menu group SHALL have a label and an ordered list of links; a group SHALL NOT hold groups, and its label is not a link. A group without a label SHALL be reported as an error, and a group without links as a warning. A page that has more than one navigation item, inside groups or outside them, SHALL be reported as a warning.

#### Scenario: Link to a page by reference
- **WHEN** a navigation item references `page_contact` and that page's slug later changes
- **THEN** the item still links to that page without editing the navigation

#### Scenario: Page in the menu twice
- **WHEN** two navigation items both reference `page_contact`
- **THEN** validation reports a duplicate-menu-item warning, and the document stays valid

#### Scenario: Projects grouped
- **WHEN** the navigation holds a group "Projekty" with links to "TV a film", "Eventy", "Výstavy" and "Interiéry", then links to "O nás" and "Kontakty"
- **THEN** the document is valid with no problems

#### Scenario: A page in a group and outside it
- **WHEN** the group "Projekty" links to "Eventy", and the navigation also links to "Eventy" outside the group
- **THEN** validation reports a duplicate-menu-item warning

#### Scenario: Group without a label or links
- **WHEN** the navigation holds a group with an empty label, and another group with no links
- **THEN** validation reports an `empty-link-label` error for the first and an `empty-menu-group` warning for the second

#### Scenario: Group inside a group
- **WHEN** a group's list of links holds a group
- **THEN** the document is invalid
