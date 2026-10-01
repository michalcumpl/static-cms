# Spec Delta

## ADDED Requirements

### Requirement: Linking a page to another language
In the language being edited, a member SHALL be able to link a page to a page of another language that has no counterpart in this language. Linking SHALL:
- give the page that page's translation key, so the two are counterparts;
- change only the document of the language being edited;
- be one undoable action, saved with the document.

A member SHALL be able to unlink a page from its counterparts. The page then gets a translation key of its own again.

#### Scenario: Link a separately built page
- **WHEN** the owner edits the English page "Our story", which has no Czech counterpart, and links it to the Czech page "O nás"
- **THEN** after saving, "Our story" and "O nás" are counterparts: the published "O nás" has an English alternate pointing at "Our story"

#### Scenario: Only unpaired pages offered
- **WHEN** the owner links an English page to a Czech page
- **THEN** Czech pages that already have an English counterpart aren't offered

#### Scenario: Unlink
- **WHEN** the owner unlinks the English "Contact" from its Czech counterpart
- **THEN** "Contact" has a translation key of its own, and the published Czech "Kontakt" has no English alternate

### Requirement: Copying a page into another language
A member SHALL be able to copy a page, as last saved, into another language that has no counterpart of it. The copy SHALL:
- have the page's blocks, images and texts under new node IDs;
- have the page's translation key, so it is the page's counterpart;
- get a slug that is unique in the target language: the page's slug, with a numeric suffix when it is taken;
- get a menu item at the end of the target language's menu when the page has one in its own menu;
- have links to other pages of the site pointing to their counterparts in the target language, where those exist; links to pages without a counterpart there SHALL stay, and be reported as problems as for a removed page.

Copying SHALL be saved as one new version of the target language's document, and SHALL be refused when the target language already has a counterpart.

#### Scenario: Copy "Ceník" to English
- **WHEN** the owner copies the Czech page "Ceník" (slug `cenik`, in the menu) into English, which doesn't have it
- **THEN** English has a page "Ceník" with slug `cenik`, at the end of its menu, paired with the Czech "Ceník", and its blocks are copies under new IDs

#### Scenario: Slug taken
- **WHEN** the English document already has a page with slug `cenik` and the owner copies the Czech "Ceník" into English
- **THEN** the copy's slug is `cenik-2`

#### Scenario: Links follow the language
- **WHEN** the copied page has a text link to the Czech "Kontakt", whose English counterpart is "Contact"
- **THEN** the link in the English copy points to "Contact"

#### Scenario: Already translated
- **WHEN** the owner tries to copy a page into a language that already has its counterpart
- **THEN** copying is refused with a message naming the counterpart

### Requirement: Pages not translated yet
In a language other than the primary, a page SHALL count as not translated yet while its title, or (except for the home page, whose slug isn't part of its address) its slug, is the same as its primary counterpart's. The project page SHALL list, for each language other than the primary:
- its pages not translated yet;
- the primary's pages that have no counterpart in that language;

each with a link that opens it in the editor (the primary's missing pages open in the primary language). When there is nothing to list, it SHALL say the language is fully translated. These are hints: they SHALL NOT be validation problems and SHALL NOT prevent publishing.

#### Scenario: Copied and untouched
- **WHEN** English was added as a copy and the owner has changed only the English home page's title
- **THEN** the project page lists "Kontakt" (title and slug unchanged) as not translated yet in English, and doesn't list the home page
- **AND** English can still be published

#### Scenario: Title translated, slug not
- **WHEN** the English "Kontakt" is retitled "Contact" but keeps the slug `kontakt`
- **THEN** it is still listed as not translated yet

#### Scenario: Missing page
- **WHEN** Czech has the page "Ceník" and English has no counterpart
- **THEN** the project page lists "Ceník" as missing in English, with a link to it in the Czech editor
