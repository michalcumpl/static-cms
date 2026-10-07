## ADDED Requirements

### Requirement: Delete website
For workspace owners, the Website section's main page SHALL end with a "Delete website" area, apart from the settings and not part of what Save saves. Choosing **Delete website** SHALL open a confirmation that:
- says the website and its pages, versions and images can be restored for 30 days and are then removed for good;
- when the website is published, says it goes offline at once, and names its address and custom domain;
- when it was published but the workspace is no longer connected to Netlify, says the old site stays on Netlify until it is removed there;
- enables its Delete button only once the website's name has been typed exactly.

When the website has unsaved changes, deleting SHALL discard them without asking to save. After deleting, the owner SHALL see the project list with a note that the website was deleted and can be restored there. Editors SHALL NOT see the area.

#### Scenario: Confirm with the name
- **WHEN** an owner chooses Delete website on "Pekárna U Lípy" and types "Pekárna U Lípy"
- **THEN** the Delete button is enabled, and choosing it deletes the website and shows the project list with the note

#### Scenario: Published website
- **WHEN** an owner opens the confirmation for a website published at `pekarna-u-lipy.netlify.app`
- **THEN** it says the website goes offline at once at that address

#### Scenario: Editor
- **WHEN** an editor opens the Website section
- **THEN** there is no Delete website area
