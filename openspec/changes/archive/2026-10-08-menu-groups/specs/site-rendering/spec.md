## MODIFIED Requirements

### Requirement: Navigation rendering
The navigation SHALL render as a list of links in document order. A link to the home page SHALL point to the base path, and a link to another page SHALL point to `<base path><slug>/`. The home page's own slug SHALL NOT appear in any link. The link to the page being rendered SHALL carry `aria-current="page"`. A menu group SHALL render as a list item holding a `<details>` element whose `<summary>` is the group's label and whose content is a list of the group's links; groups start closed, and opening one SHALL close the others without JavaScript (a shared `name`). A group without links SHALL NOT be rendered. The group holding the current page's link SHALL be styled like a current link.

#### Scenario: Current page marked
- **WHEN** rendering page `kontakt` with the default base path, and its navigation includes it
- **THEN** its navigation link has `href="/kontakt/"` and `aria-current="page"`, and no other link has `aria-current`

#### Scenario: Link to the home page
- **WHEN** the home page has slug `uvod` and a navigation item, a text link and a call to action point to it
- **THEN** all of them link to the base path, and no link is `/uvod/`

#### Scenario: Projects grouped
- **WHEN** the navigation holds a group "Projekty" with four page links, then links to "O nás" and "Kontakty"
- **THEN** the menu's list has three items: a closed `<details>` with the summary "Projekty" and a list of four links, then the two links

#### Scenario: Current page inside a group
- **WHEN** rendering the page "Eventy", linked from the group "Projekty"
- **THEN** its link inside the group has `aria-current="page"`, and the group's summary is styled as current

## ADDED Requirements

### Requirement: Menu script
Every page of a site whose menu has a group with links SHALL load `assets/menu.js` with `defer`, and pages of other sites SHALL NOT. The script SHALL close an open group when the visitor presses Escape (returning focus to the group's summary), clicks outside it, or moves focus out of it. The menu SHALL work without the script.

#### Scenario: Escape closes the group
- **WHEN** a visitor opens "Projekty" and presses Escape
- **THEN** the group closes and focus is on its summary

#### Scenario: Click outside
- **WHEN** a visitor opens "Projekty" and clicks the page's content
- **THEN** the group closes

#### Scenario: No groups, no script
- **WHEN** a site's menu has only links
- **THEN** its pages have no `menu.js` script tag, and the export has no `assets/menu.js`
