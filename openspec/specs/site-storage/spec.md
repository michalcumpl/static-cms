# site-storage Specification

## Purpose

Defines where the server keeps each project's site documents and their versions, which saves it accepts, how it protects against overwriting newer changes, and that previews and exports use what was saved.

## Requirements

### Requirement: Project documents
Each project SHALL have one site document per language, stored in the server's database: always one in its primary language, and one for each language added since (see the languages capability). Documents SHALL persist across server restarts.

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
The server SHALL return a project's current document in a requested language (the primary language when none is given), together with its version, an opaque value that changes on every accepted save of that language's document, and the document's validation problems. A document in a language other than the primary SHALL be returned with the primary's shared fields applied (see "Shared fields" in the languages capability), and its problems SHALL be those of the returned document. Asking for a language the project doesn't have SHALL answer "not found".

#### Scenario: Read
- **WHEN** the editor requests the project's site
- **THEN** the response contains the document, its version, and its problems

#### Scenario: Read another language
- **WHEN** the editor requests the English document of a project whose primary is Czech, after the Czech phone number was changed
- **THEN** the response contains the English document with the new phone number, and the English version

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

### Requirement: Saving a language
Saves SHALL apply to one language's document, with that document's version as the base for conflict detection, as for a single document. Saving one language SHALL NOT change any other language's stored document or version.

#### Scenario: Two languages edited at once
- **WHEN** one member saves the Czech document and another then saves the English document based on the version they opened
- **THEN** both saves are accepted

### Requirement: Upgrading projects to version 7
Before the admin serves its first request, it SHALL upgrade every project that still has a document stored below version 7. The upgrade runs once per project, as one transaction:
1. Upgrade each language's document to version 7, as "Upgrading version-6 documents" says.
2. Append each collection item that exists only in a non-primary language to the end of the primary's collection, with that language's texts. In each document that lacks the item, any block showing all items switches to `chosen` with its former items, so no page changes.
3. Save every changed document as a new version, recorded as made by the system, so it shows in the history and can be restored.

A failed upgrade SHALL leave the project's stored documents unchanged and SHALL make the admin refuse requests, with a logged message naming the project. Reading a stored document below version 7 (an older version from the history, for example) SHALL still upgrade it per document, as for earlier versions.

#### Scenario: Czech and English project
- **WHEN** the admin starts with a project whose Czech and English documents are version 6, both holding the services "Chléb" and "Rohlíky" with the same node IDs
- **THEN** both documents are stored as new version-7 versions with the same two services in their collections, and both languages publish the same pages as before, apart from the services catalog added to the home page's structured data

#### Scenario: A service only in English
- **WHEN** the English document of a version-6 project has a services block with "Bread" and an extra item "Gluten-free bread" that the Czech document doesn't have
- **THEN** after the upgrade the Czech collection also holds "Gluten-free bread", with the English texts
- **AND** the Czech blocks that showed all services now show their former services as chosen, so the Czech pages are unchanged, and the English page still shows both items

#### Scenario: Already upgraded
- **WHEN** the admin starts again after the upgrade
- **THEN** no project is changed and no versions are added
