# version-history Specification

## Purpose

A project's saved versions per language: seeing them, previewing any of them, and restoring one as a new version, so no save is ever lost.

## Requirements

### Requirement: Listing versions
A project's history SHALL list the saved versions of one language, newest first, 50 at a time, with a way to list older ones. Each version SHALL show when it was saved and the member who saved it ("a former member" when that account no longer exists). It SHALL be marked:
- **Current** when it is the language's current document;
- **Live** when it is part of the publish the live site shows;
- **Published** when it was part of any other successful publish;
- **Restored from** with the time of the version it was restored from, when it was made by restoring.

#### Scenario: Three saves
- **WHEN** a member saves the Czech site three times
- **THEN** the Czech history lists those three versions first, newest first, the newest marked Current

#### Scenario: Published and live
- **WHEN** the Czech site was published, then saved again
- **THEN** the history marks the published version as Live and the newest one as Current

#### Scenario: Older versions
- **WHEN** a language has 120 versions
- **THEN** the history shows the newest 50, and asking for older ones shows the next 50

### Requirement: Previewing a version
A member SHALL be able to preview any version of a language as a read-only site at `/p/<project>/history/<version>/`:
- its pages, and links between them, stay within the version's preview;
- its stylesheet and images are served;
- a stored older format is upgraded first;
- a language other than the primary gets the primary's current shared fields, as when editing it.

A version with validation errors SHALL show its problems instead of pages. The preview SHALL say which version it shows, with its time, and link back to the history.

#### Scenario: Preview an older version
- **WHEN** a member previews yesterday's version, in which the hero heading was "Čerstvý chléb"
- **THEN** its home page shows "Čerstvý chléb", and its link to "Kontakt" opens that version's "Kontakt"

#### Scenario: A version of another project
- **WHEN** a member asks for a version ID that belongs to another project
- **THEN** the response is "not found"

### Requirement: Restoring a version
A member SHALL be able to restore a version of a language after confirming:
- the version's document SHALL be saved as a new version of that language, recording the version it was restored from;
- every other version SHALL stay unchanged;
- other languages' stored documents SHALL NOT change. Restoring the primary language changes its shared fields, which the other languages read, and the confirmation SHALL say so.

The restore SHALL be refused, with a message, when the version's document is structurally broken, which saving would refuse too. A restore is then visible in the editor and preview at once, and on the live site after the next publish.

#### Scenario: Restore and undo the restore
- **WHEN** a member restores the version from 13:40, then restores the version that was current before that
- **THEN** the language's current document is the one from before the first restore, and the history lists both restores, each marked "Restored from" its source

#### Scenario: Restore the primary language
- **WHEN** a member restores a Czech version in which the phone number was different
- **THEN** the English editor and preview show that phone number too, and the English document's version is unchanged

#### Scenario: An editor open elsewhere
- **WHEN** a member restores Czech while another member has the Czech editor open with unsaved changes
- **THEN** that member's next save is refused as changed elsewhere, and reloading shows the restored document

### Requirement: Access to history
The history, previews of versions, and restoring SHALL be available to members of the project's workspace, owners and editors alike. Others SHALL get "not found", or 401 (or the sign-in page) when not signed in. Restoring SHALL be refused when the request comes from another site's page.

#### Scenario: Another workspace
- **WHEN** a member of another workspace requests the project's history
- **THEN** the response is "not found"
