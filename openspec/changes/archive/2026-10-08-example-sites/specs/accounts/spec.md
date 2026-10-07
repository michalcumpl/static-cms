## ADDED Requirements

### Requirement: Loading a site
An admin command on the server SHALL create a project in a given workspace from a folder holding:
- `project.json` with the project's name, its primary language, and its languages, each naming its site document;
- one site document per language, whose images name files of the folder instead of library keys;
- those image files.

The command SHALL upload the images into the new project's library, point the documents at the uploaded images, and check every language with the site document's validation. A folder with errors (a missing file, an image that can't be uploaded, a document with validation errors, a language that isn't offered, an unknown workspace) SHALL be refused with each problem printed, and SHALL leave no project, version or image behind. Languages other than the primary SHALL be stored as languages of the project, sharing the primary's shared fields as any language does. On success the command SHALL print the project's address in the admin.

#### Scenario: Load an English site
- **WHEN** the command loads a folder whose `project.json` names "Mortgage Specialist" with English as its only language
- **THEN** the workspace has the project "Mortgage Specialist", its primary language is English, its pages show the folder's images from the library, and its address is printed

#### Scenario: Two languages
- **WHEN** the folder names Czech as the primary language and English as a second one
- **THEN** the project has both languages, and the English pages share the Czech pages' images and business details

#### Scenario: Broken folder
- **WHEN** the Czech document names an image file the folder doesn't have, and a page with an empty address (slug)
- **THEN** the command prints both problems, exits with an error, and the workspace has no new project and its media folder no new files
