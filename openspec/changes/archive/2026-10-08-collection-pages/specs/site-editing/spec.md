## ADDED Requirements

### Requirement: Projects block in the editor
The block picker SHALL offer a Projects block ("Projects": "Your work as photo tiles, all of it or one category"). On the canvas a `projects` block SHALL show its tiles as the published page will, and SHALL behave as "Items in collection blocks" and "Collection block mode" describe for the other collection blocks, with "All projects" and "Chosen projects", and "New project" when adding. A tile's name SHALL be editable in place and its cover SHALL use the usual image slot; the project's other fields SHALL be edited in What you offer, which the block panel links to ("Edit projects").

The block panel of a selected projects block SHALL also offer:
- the category: "All categories" or one of the site's categories;
- how many to show: "All" or a number from 1 to 24.

Each choice SHALL be one undoable step, and the canvas SHALL show its result at once. A new projects block SHALL show all projects of all categories.

#### Scenario: Category page
- **WHEN** the owner adds a Projects block to the page "Výstavy" and chooses the category "Výstavy"
- **THEN** the canvas shows only that category's projects, and one undo shows all projects again

#### Scenario: Latest work on the home page
- **WHEN** the owner sets the home page's projects block to show 4
- **THEN** the canvas shows the first four projects, and the preview ends the block with a link to all projects when the projects have a listing page

#### Scenario: New project from the canvas
- **WHEN** the owner adds an item to a projects block showing all projects
- **THEN** a new project with an empty name and no cover appears at the end of the block and of the collection, with the caret in its name

## MODIFIED Requirements

### Requirement: Deleting pages
The owner SHALL be able to delete a page other than the home page, after confirming. Deleting SHALL remove the page, its blocks and its navigation items as one undoable action. Before deleting, the editor SHALL say how many links elsewhere in the site point to the page. Those links SHALL stay in place and be reported as problems. When the deleted page is the one being edited, the editor SHALL switch to the home page. When the page lists services or projects (see "Item pages" in the site-document capability), the confirmation SHALL say that their pages will no longer be published, and deleting SHALL also clear that listing page, in the same undoable action. The home page SHALL NOT be deletable, and the editor SHALL explain that another page must be set as home first.

#### Scenario: Delete a page with links to it
- **WHEN** the owner deletes the page "Kontakt", which two text links on other pages point to, and confirms
- **THEN** the page and its menu item are gone, the canvas shows the home page, and the problems panel lists two links to a page that no longer exists

#### Scenario: Home page can't be deleted
- **WHEN** the owner looks at the delete action for the home page
- **THEN** it is disabled with an explanation to set another page as home first

#### Scenario: Cancel deletion
- **WHEN** the owner starts deleting a page and cancels the confirmation
- **THEN** nothing changes

#### Scenario: Delete the page that lists the projects
- **WHEN** the owner deletes the page "Work", which lists the projects, and confirms
- **THEN** the confirmation said that the projects' pages would no longer be published, the projects have no listing page, and one undo brings back the page and its role
