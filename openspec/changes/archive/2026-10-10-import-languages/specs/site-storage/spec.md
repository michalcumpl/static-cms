# Spec Delta

## MODIFIED Requirements

### Requirement: Saved document is the source for preview and export
A project's preview and its ZIP download SHALL use the project's saved document. They SHALL still require a fully valid document and SHALL show the validation problems instead of output when it is not. When the project has more than one language, the preview SHALL name each problem's language, and each problem SHALL link to where it is fixed in that language's editor or section.

#### Scenario: Preview shows saved edits
- **WHEN** a member changes the hero heading and saves
- **THEN** the project's preview (`/p/<project>/preview/`) shows the new heading

#### Scenario: Preview with site-rule problems
- **WHEN** the saved document has an empty heading
- **THEN** the project's preview shows the problems instead of the page

#### Scenario: A problem in a hidden language
- **WHEN** the hidden Czech language's home photo has no description
- **THEN** the preview shows the problem as Czech's, linking to that image in the Czech editor
