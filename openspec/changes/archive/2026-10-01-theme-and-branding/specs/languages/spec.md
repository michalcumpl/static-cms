# Spec Delta

## MODIFIED Requirements

### Requirement: Shared fields
These fields SHALL be shared, and come from the primary language:
- the theme, fonts included;
- the logo and the switch "show the site name in the header";
- the favicon;
- the default share image's image (not its description);
- the AI crawler switches;
- the business data: street, postal code, city, country, phone, email, map address, type of business, opening hours and the footer switch.

Whenever a document in another language is read (for the editor, the preview, the ZIP download or a publish), its shared fields SHALL be replaced by the primary's current ones. The primary's changes SHALL apply to every language without saving the other languages. All other fields SHALL be per language:
- the site name and description (the site name is also the logo's description when the name is hidden);
- the default share image's description, while it describes the same image as the primary's; otherwise the primary's description is used, so publishing never waits for a new translation;
- the business name and the note on the opening hours;
- the menu, the pages and their contents.

#### Scenario: Change the phone once
- **WHEN** the Czech phone number is changed and saved
- **THEN** the English editor, preview and the next publish show the new number, while the English document's version is unchanged

#### Scenario: English description of the opening hours
- **WHEN** the English note on the opening hours is "Closed on public holidays" and the Czech one is "Ve svátky zavřeno"
- **THEN** each language's published opening hours show its own note

#### Scenario: Logo in every language
- **WHEN** the Czech site "Pekárna Kolín" gets a logo with the name hidden and is saved, and the English site is named "Kolín Bakery"
- **THEN** the English editor, preview and next publish show the same logo, described as "Kolín Bakery", while the English document's version is unchanged
