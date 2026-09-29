# site-storage Specification

## Purpose

Defines where the server keeps each project's site documents and their versions, which saves it accepts, how it protects against overwriting newer changes, and that previews and exports use what was saved.

## Requirements

### Requirement: Project documents
Each project SHALL have one site document per language, stored in the server's database. Until multiple languages exist, a project SHALL have exactly one document. Documents SHALL persist across server restarts.

#### Scenario: Restart
- **WHEN** a document was saved and the server restarts
- **THEN** the saved document is returned

### Requirement: Version history
Every accepted save SHALL be kept as a version with its time and the member who saved it. Reading a project's site SHALL return the latest version.

#### Scenario: Versions accumulate
- **WHEN** a member saves three times
- **THEN** the project has three more stored versions, the latest one being the current document

### Requirement: Import of the earlier working copy
On first start, when the database holds no projects and a working copy from before this change exists (`site.json` in the data folder), the server SHALL import it and its media into a workspace named "Default" with one project. The first user created by the admin command SHALL become that workspace's owner.

#### Scenario: Upgrade
- **WHEN** the server starts on an installation that has `data/site.json` and an empty database
- **THEN** the site appears as the "Default" workspace's project with its content and images, and the next admin-created user owns it

### Requirement: Reading the site
The server SHALL return a project's current document together with its version, an opaque value that changes on every accepted save, and the document's validation problems.

#### Scenario: Read
- **WHEN** the editor requests the project's site
- **THEN** the response contains the document, its version, and its problems

### Requirement: Accepting saves
A save SHALL be accepted when the document has no structural problems, even if it has site-rule problems. A save with any structural problem SHALL be rejected without changing the project's document, and the response SHALL list the structural problems. An accepted save SHALL return the new version and all problems of the saved document.

#### Scenario: Unfinished content is saved
- **WHEN** the editor saves a document whose only problem is an empty subheading
- **THEN** the save is accepted and the response lists the empty-heading problem

#### Scenario: Broken document is refused
- **WHEN** a save contains a block list that references a node that does not exist
- **THEN** the save is rejected, the project's document is unchanged, and the response lists the missing-reference problem

### Requirement: Conflict detection
Every save SHALL state the version it was based on. When that is not the current version, the save SHALL be rejected as a conflict without changing the project's document, and the response SHALL say that the site was changed elsewhere.

#### Scenario: Stale save
- **WHEN** two editor tabs load version 5, the first saves (making version 6), and the second then saves based on version 5
- **THEN** the second save is rejected as a conflict and the first tab's changes are kept

### Requirement: Atomic writes
An accepted save SHALL change the project's document and add its version in one database transaction, so that a crash or concurrent read never sees a partially saved document, and two saves based on the same version can't both succeed.

#### Scenario: Reader during a save
- **WHEN** the preview reads the site while a save is being written
- **THEN** it gets either the complete old document or the complete new one

#### Scenario: Simultaneous saves
- **WHEN** two saves based on the same version arrive at the same time
- **THEN** exactly one is accepted and the other is rejected as a conflict

### Requirement: Saved document is the source for preview and export
A project's preview and its ZIP download SHALL use the project's saved document. They SHALL still require a fully valid document and SHALL show the validation problems instead of output when it is not.

#### Scenario: Preview shows saved edits
- **WHEN** a member changes the hero heading and saves
- **THEN** the project's preview (`/p/<project>/preview/`) shows the new heading

#### Scenario: Preview with site-rule problems
- **WHEN** the saved document has an empty heading
- **THEN** the project's preview shows the problems instead of the page

### Requirement: Project media
Images SHALL be stored per project, and served only to members of the project's workspace.

#### Scenario: Media of another workspace
- **WHEN** a member of workspace A requests an image of a project in workspace B
- **THEN** the response is "not found"

### Requirement: Upgrading stored documents
Whenever the server reads a stored document (for the editor, the preview, the ZIP download, or the import of the earlier working copy), it SHALL upgrade a version-1 document to version 2 before validating or returning it. The stored document and its versions SHALL NOT be rewritten by reading; the upgraded document SHALL be stored by the next accepted save. The version value returned with an upgraded document SHALL be the stored version, so the next save based on it is accepted.

#### Scenario: Open a version-1 project
- **WHEN** a project's stored document has schema version 1 and a member opens the editor
- **THEN** the editor receives a version-2 document with a home page ID and a slug on every page, and the stored document is unchanged

#### Scenario: Save after upgrade
- **WHEN** a member opens a version-1 project, changes a heading, and saves based on the version they received
- **THEN** the save is accepted and the project's stored document is now version 2 with the changed heading

#### Scenario: Preview of a version-1 project
- **WHEN** the preview is opened for a project whose stored document has schema version 1
- **THEN** the site is rendered from the upgraded document, without validation errors about the schema version
