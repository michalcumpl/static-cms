# Spec Delta

## ADDED Requirements

### Requirement: Page in other languages
When the project has more than one language, the page settings panel SHALL have an "In other languages" part. It lists every other language of the project, with the current page's state there:
- **Counterpart:** its title, and a link that opens it in that language's editor.
- **No counterpart:**
  - in the language being edited, the actions "Copy here" (copy this page into that language) and "Link to an existing page" (choose one of that language's pages without a counterpart in the language being edited);
  - "Not translated".
- **Unlink:** an action on a page that has counterparts.

The part SHALL reflect the other languages' saved documents and the editor's current document. Copying SHALL require the page to be saved first, and the editor SHALL say so when it isn't.

#### Scenario: Copy from the editor
- **WHEN** the owner edits the saved Czech "Ceník" and chooses "Copy here" for English
- **THEN** English gets the copy, and the part shows English: "Ceník" with a link to open it

#### Scenario: Unsaved page
- **WHEN** the owner added "Ceník" without saving and chooses "Copy here" for English
- **THEN** nothing is copied, and the editor asks to save first

### Requirement: Untranslated pages in the page list
In a language other than the primary, the editor's page list SHALL mark pages that aren't translated yet (see the languages capability) with "Not translated", and the mark SHALL go as soon as the page no longer counts as not translated, as the owner types.

#### Scenario: Mark goes away
- **WHEN** the English page "Kontakt" (not translated yet) is renamed "Contact" with slug `contact`
- **THEN** its "Not translated" mark goes away
