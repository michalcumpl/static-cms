## MODIFIED Requirements

### Requirement: Menu management
The owner SHALL be able to reorder the menu, to add a page to the menu or remove it (the "show in menu" switch, or moving it between the sidebar's sections), and to add, edit and remove external links in the menu. A page added to the menu SHALL get a navigation item at the end of the menu, outside any group, labelled with its title. A page SHALL have at most one navigation item created by the editor. External link addresses SHALL be checked with the same rules as the link dialog. The owner SHALL be able to add a menu group with a label, rename it, move it, and remove it, which keeps its links in the menu where the group was; and to move a page or link into a group, out of it, and within it. Groups SHALL be one level deep. Removing a page from the menu, or deleting it, SHALL remove its link wherever it is, inside a group or not. Menu and group labels SHALL stay editable in place on the canvas, but the canvas SHALL NOT add, remove or reorder menu items or groups. Every menu action SHALL be one undoable action.

#### Scenario: Reorder the menu
- **WHEN** the owner moves "Kontakt" above "Služby" in the sidebar's Menu section
- **THEN** the navigation on the canvas shows "Kontakt" before "Služby", and the document's navigation has the new order

#### Scenario: Hide a page from the menu
- **WHEN** the owner turns off "show in menu" for the page "Děkujeme"
- **THEN** its navigation item is removed, the page is listed under "Not in menu", and the page itself is unchanged

#### Scenario: Add an external link
- **WHEN** the owner adds a menu link labelled "Facebook" with address `https://facebook.com/anideti`
- **THEN** the menu ends with a "Facebook" item linking to that address

#### Scenario: Unsafe external link refused
- **WHEN** the owner enters `javascript:alert(1)` as a menu link address
- **THEN** the link is not added and the owner is told which addresses are allowed

#### Scenario: Group four pages
- **WHEN** the owner adds a group "Projekty" and uses "Move to group" › "Projekty" on "TV a film", "Eventy", "Výstavy" and "Interiéry"
- **THEN** the sidebar lists the four pages indented under "Projekty", the canvas's menu shows "Projekty" in their place, and one undo takes the last page back out of the group

#### Scenario: Remove a group
- **WHEN** the owner uses "Remove group" on "Projekty", which holds four pages and stands second in the menu
- **THEN** the four pages are in the menu from the second place on, in their order, and no group is left

#### Scenario: Hide a page that is in a group
- **WHEN** the owner turns off "show in menu" for "Eventy", which is in the group "Projekty"
- **THEN** "Projekty" holds the other three pages, and "Eventy" is listed under "Not in menu"

#### Scenario: Edit a group's label on the canvas
- **WHEN** the owner places the caret in "Projekty" in the canvas's menu and types
- **THEN** the group's label changes, and its links show under it while the caret is in the group
