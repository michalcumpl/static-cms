# Spec Delta

## MODIFIED Requirements

### Requirement: Page settings panel
The editor SHALL show a settings panel for the current page with:
- its title, slug and SEO description;
- its share image;
- a "show in menu" switch;
- the actions to duplicate, delete, and set it as home.

Changes to the title and SEO description SHALL apply to the document as the owner types. The slug field SHALL apply its value when the owner leaves the field or confirms it, normalised by slugifying; while typing, the panel SHALL show the slug that will be applied and the page's resulting address. For the home page, the panel SHALL explain that the page is served at the site root and that its slug is used only if it stops being home. An empty title or an empty slug after normalising SHALL be reported as a problem rather than refused.

The share image SHALL be:
- chosen from the media library;
- shown as a thumbnail with its description, which the owner can edit;
- changeable and removable.

When the page has none, the panel SHALL say that the site's default share image is used, or that there is none. Choosing, changing and removing the share image SHALL each be one undoable action.

#### Scenario: Edit the title
- **WHEN** the owner types "O nás" into the title field of a page without a hero
- **THEN** the page title on the canvas and in the sidebar shows "O nás"

#### Scenario: Normalise the slug
- **WHEN** the owner types `O Nás!` into the slug field and leaves it
- **THEN** the page's slug is `o-nas`

#### Scenario: Choose a share image
- **WHEN** the owner chooses a photo from the library as the share image of "Kontakt"
- **THEN** the page's share image list holds one image node with that photo's media key, width and height, and the panel shows its thumbnail

#### Scenario: Undo removing the share image
- **WHEN** the owner removes the page's share image and then undoes
- **THEN** the share image is back

## ADDED Requirements

### Requirement: Site settings panel
The editor SHALL offer site settings, opened from the sidebar, with:
- the site name;
- the site description;
- the favicon;
- the default share image;
- the switches "AI search and answers" and "AI training", each with a sentence explaining what it allows.

Changes to the name and description SHALL apply to the document as the owner types, and each switch SHALL apply when changed. The favicon and default share image SHALL be chosen from the media library, shown as thumbnails (the favicon as the square icon it becomes), and be changeable and removable. The default share image's description SHALL be editable. Every change SHALL be undoable with the editor's undo, and SHALL mark the site as having unsaved changes. Problems about the site's settings, when selected in the problems panel, SHALL open the site settings at the field concerned.

#### Scenario: Rename the site
- **WHEN** the owner changes the site name to "Anideti Brno" in site settings
- **THEN** the site name in the canvas's header shows "Anideti Brno", and undo restores the old name

#### Scenario: Choose a favicon
- **WHEN** the owner chooses a logo from the library as the favicon
- **THEN** the site's favicon list holds one image node with the logo's media key, width and height, and the panel shows a square thumbnail

#### Scenario: Switch off AI training
- **WHEN** the owner switches "AI training" off and saves
- **THEN** the saved document has AI training not allowed, and the next export's `robots.txt` disallows the AI training crawlers

#### Scenario: Missing description problem
- **WHEN** the problems panel lists that "Kontakt" has no description, and the owner selects the problem
- **THEN** the editor shows the page "Kontakt" with its SEO description field focused
