# Spec Delta

## ADDED Requirements

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
