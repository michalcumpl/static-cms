# Spec Delta

## ADDED Requirements

### Requirement: Editing a language
When the project has more than one language, the editor SHALL show a language switcher at the top of the left column, listing the project's languages by name, with "(hidden)" for unpublished ones.
- Choosing a language SHALL open that language's document, on the same page when the language has a page with the same translation key, otherwise on its home page.
- Unsaved changes SHALL be handled as when leaving the editor.
- Each language SHALL be edited, undone and saved on its own.
- The preview width and the canvas behave as for one language.

#### Scenario: Switch to English on the same page
- **WHEN** the owner edits the Czech "Kontakt" and chooses English
- **THEN** the editor shows the English page with the same translation key, and saving saves the English document

### Requirement: Shared fields outside the primary language
In a language other than the primary, the Site and Business tabs SHALL show the shared fields (see the languages capability) read-only, with the note "Edited in <primary language name>" and a link to the same tab in the primary language. Translatable fields stay editable:
- the site name and description;
- the default share image's description;
- the business name;
- the note on the opening hours.

#### Scenario: Phone in English
- **WHEN** the owner opens the Business tab in English
- **THEN** the phone field can't be edited and says it is edited in Čeština, and the note on the opening hours can be edited

### Requirement: Translation keys of new pages
Adding a page SHALL give it a translation key of its own, and duplicating a page SHALL give the copy a new translation key, so neither is paired with another language's page.

#### Scenario: Duplicate in English
- **WHEN** the owner duplicates the English "Contact"
- **THEN** the copy's translation key differs from the original's, and the Czech "Kontakt" stays paired with the original
