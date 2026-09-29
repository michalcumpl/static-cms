# Spec Delta

## Purpose

Defines where the server keeps the site document, which saves it accepts, how it protects against overwriting newer changes, and that previews and exports use what was saved.

## ADDED Requirements

### Requirement: Working copy
The server SHALL keep the site document as a working copy. When no working copy exists, the server SHALL create one from the demo site fixture. The working copy SHALL persist across server restarts.

#### Scenario: First start
- **WHEN** the server reads the site and no working copy exists
- **THEN** it creates the working copy from the demo fixture and returns that document

#### Scenario: Restart
- **WHEN** a document was saved and the server restarts
- **THEN** the saved document is returned, not the fixture

### Requirement: Reading the site
The server SHALL return the current document together with its version, an opaque value that changes on every accepted save, and the document's validation problems.

#### Scenario: Read
- **WHEN** the editor requests the site
- **THEN** the response contains the document, its version, and its problems

### Requirement: Accepting saves
A save SHALL be accepted when the document has no structural problems, even if it has site-rule problems. A save with any structural problem SHALL be rejected without changing the working copy, and the response SHALL list the structural problems. An accepted save SHALL return the new version and all problems of the saved document.

#### Scenario: Unfinished content is saved
- **WHEN** the editor saves a document whose only problem is an empty subheading
- **THEN** the save is accepted and the response lists the empty-heading problem

#### Scenario: Broken document is refused
- **WHEN** a save contains a block list that references a node that does not exist
- **THEN** the save is rejected, the working copy is unchanged, and the response lists the missing-reference problem

### Requirement: Conflict detection
Every save SHALL state the version it was based on. When that is not the current version, the save SHALL be rejected as a conflict without changing the working copy, and the response SHALL say that the site was changed elsewhere.

#### Scenario: Stale save
- **WHEN** two editor tabs load version 5, the first saves (making version 6), and the second then saves based on version 5
- **THEN** the second save is rejected as a conflict and the first tab's changes are kept

### Requirement: Atomic writes
An accepted save SHALL replace the working copy atomically, so that a crash or concurrent read never sees a partially written document.

#### Scenario: Reader during a save
- **WHEN** the preview reads the site while a save is being written
- **THEN** it gets either the complete old document or the complete new one

### Requirement: Saved document is the source for preview and export
The site preview and the ZIP download SHALL use the saved working copy. They SHALL still require a fully valid document and SHALL show the validation problems instead of output when it is not.

#### Scenario: Preview shows saved edits
- **WHEN** the owner changes the hero heading and saves
- **THEN** `/preview/` shows the new heading

#### Scenario: Preview with site-rule problems
- **WHEN** the saved document has an empty heading
- **THEN** `/preview/` shows the problems instead of the page
