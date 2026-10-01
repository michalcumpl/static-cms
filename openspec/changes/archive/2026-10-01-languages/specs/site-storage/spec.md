# Spec Delta

## MODIFIED Requirements

### Requirement: Project documents
Each project SHALL have one site document per language, stored in the server's database: always one in its primary language, and one for each language added since (see the languages capability). Documents SHALL persist across server restarts.

#### Scenario: Restart
- **WHEN** a document was saved and the server restarts
- **THEN** the saved document is returned

### Requirement: Reading the site
The server SHALL return a project's current document in a requested language (the primary language when none is given), together with its version, an opaque value that changes on every accepted save of that language's document, and the document's validation problems. A document in a language other than the primary SHALL be returned with the primary's shared fields applied (see "Shared fields" in the languages capability), and its problems SHALL be those of the returned document. Asking for a language the project doesn't have SHALL answer "not found".

#### Scenario: Read
- **WHEN** the editor requests the project's site
- **THEN** the response contains the document, its version, and its problems

#### Scenario: Read another language
- **WHEN** the editor requests the English document of a project whose primary is Czech, after the Czech phone number was changed
- **THEN** the response contains the English document with the new phone number, and the English version

## ADDED Requirements

### Requirement: Saving a language
Saves SHALL apply to one language's document, with that document's version as the base for conflict detection, as for a single document. Saving one language SHALL NOT change any other language's stored document or version.

#### Scenario: Two languages edited at once
- **WHEN** one member saves the Czech document and another then saves the English document based on the version they opened
- **THEN** both saves are accepted
