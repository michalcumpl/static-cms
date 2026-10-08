## MODIFIED Requirements

### Requirement: Copying a page into another language
A member SHALL be able to copy a page, as last saved, into another language that has no counterpart of it. The copy SHALL:
- have the page's blocks, images and texts under new node IDs;
- have the page's translation key, so it is the page's counterpart;
- get a slug that is unique in the target language: the page's slug, with a numeric suffix when it is taken;
- get a menu item at the end of the target language's menu, outside any group, when the page has one in its own menu, inside a group or not;
- have links to other pages of the site pointing to their counterparts in the target language, where those exist; links to pages without a counterpart there SHALL stay, and be reported as problems as for a removed page.

Copying SHALL be saved as one new version of the target language's document, and SHALL be refused when the target language already has a counterpart.

#### Scenario: Copy "Ceník" to English
- **WHEN** the owner copies the Czech page "Ceník" (slug `cenik`, in the menu) into English, which doesn't have it
- **THEN** English has a page "Ceník" with slug `cenik`, at the end of its menu, paired with the Czech "Ceník", and its blocks are copies under new IDs

#### Scenario: Copy a page from a menu group
- **WHEN** the owner copies the Czech page "Eventy", which is in the Czech menu's group "Projekty", into English
- **THEN** the English menu ends with a link to the copy, outside any group

#### Scenario: Slug taken
- **WHEN** the English document already has a page with slug `cenik` and the owner copies the Czech "Ceník" into English
- **THEN** the copy's slug is `cenik-2`

#### Scenario: Links follow the language
- **WHEN** the copied page has a text link to the Czech "Kontakt", whose English counterpart is "Contact"
- **THEN** the link in the English copy points to "Contact"

#### Scenario: Already translated
- **WHEN** the owner tries to copy a page into a language that already has its counterpart
- **THEN** copying is refused with a message naming the counterpart
