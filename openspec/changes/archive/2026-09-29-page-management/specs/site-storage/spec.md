# Spec Delta

## ADDED Requirements

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
