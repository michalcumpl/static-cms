# Spec Delta

## MODIFIED Requirements

### Requirement: Website section
The Website section's main page SHALL show, for one language:
- the site settings (see "Site settings"), saved as "Saving a section" says;
- a Design card showing the site's template by name with its description, the theme's colours as swatches, the heading and body fonts by name, and the logo, with "Change design", which opens the editor on the home page with the Design tab open;
- a Home page sections card (see "Home page sections");
- links to its subpages Pages and menu, Languages and Domain, each with a one-line summary.

#### Scenario: Change design
- **WHEN** the owner chooses "Change design" in the Website section
- **THEN** the editor opens with the Design tab selected

#### Scenario: Template named
- **WHEN** the owner opens the Website section of a site using Standard, with the interface in English
- **THEN** the Design card says "Template: Standard" with Standard's English description

## ADDED Requirements

### Requirement: Home page sections
The Website section's Home page sections card SHALL list the blocks of the language's home page in page order, each by the name the editor uses for it ("Hero", "Services block") followed by its heading when it has one, with a "Show on website" switch that hides or shows the block (see "Hidden blocks" in the site-document capability). The switches SHALL be part of what the section's Save saves. The card SHALL link to the editor on the home page ("Edit home page"), which asks to save first when the section has unsaved changes.

In a language other than the primary, the card SHALL list that language's home page, and its switches SHALL work there, since each language has its own pages.

#### Scenario: Turn off the testimonials
- **WHEN** the owner turns off "Show on website" for "Testimonials block · Co říkají zákazníci" and saves
- **THEN** the published home page, after the next publish, has no testimonials, and the block is still in the editor, marked "Hidden"

#### Scenario: Unsaved switch
- **WHEN** the owner turns a switch off and chooses "Edit home page" without saving
- **THEN** the panel asks to save first
