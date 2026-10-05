# Spec Delta

## MODIFIED Requirements

### Requirement: Pages not translated yet
In a language other than the primary, a page SHALL count as not translated yet while its title, or (except for the home page, whose slug isn't part of its address) its slug, is the same as its primary counterpart's. The project's Languages tab SHALL list, for each language other than the primary:
- its pages not translated yet;
- the primary's pages that have no counterpart in that language;

each with a link that opens it in the editor (the primary's missing pages open in the primary language). The Pages tab SHALL mark the pages not translated yet in its list. When there is nothing to list, the Languages tab SHALL say the language is fully translated. These are hints: they SHALL NOT be validation problems and SHALL NOT prevent publishing.

#### Scenario: Copied and untouched
- **WHEN** English was added as a copy and the owner has changed only the English home page's title
- **THEN** the Languages tab lists "Kontakt" (title and slug unchanged) as not translated yet in English, and doesn't list the home page
- **AND** English can still be published

#### Scenario: Title translated, slug not
- **WHEN** the English "Kontakt" is retitled "Contact" but keeps the slug `kontakt`
- **THEN** it is still listed as not translated yet

#### Scenario: Missing page
- **WHEN** Czech has the page "Ceník" and English has no counterpart
- **THEN** the Languages tab lists "Ceník" as missing in English, with a link to it in the Czech editor

#### Scenario: Marked in the page list
- **WHEN** the owner opens the Pages tab for English and "Kontakt" isn't translated yet
- **THEN** the list marks "Kontakt" as not translated yet
