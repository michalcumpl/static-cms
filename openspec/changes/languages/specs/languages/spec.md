# Spec Delta

## Purpose

A project's site in several languages: the primary language and the others added as copies of it, which of them are published, and the business and site settings they share with the primary.

## ADDED Requirements

### Requirement: Primary language
Every project SHALL have a primary language, its first: Czech for existing projects, and for new projects the language they are created with. The primary language SHALL always be published and SHALL NOT be removed or hidden. It is served at the site's root.

#### Scenario: Existing project
- **WHEN** a project created before languages existed is opened
- **THEN** its languages are Czech, primary and published

### Requirement: Languages offered
A project SHALL be able to have, besides its primary language, any of Czech (`cs`), Slovak (`sk`), English (`en`), German (`de`) and Polish (`pl`), each at most once. Each language SHALL be named in its own language: Čeština, Slovenčina, English, Deutsch and Polski.

#### Scenario: Adding a language twice
- **WHEN** a member adds English to a project that already has English
- **THEN** it is refused with a message that the project already has English

### Requirement: Adding a language
A member of the project's workspace SHALL be able to add a language. The new language's document SHALL be a copy of the primary's current document, with:
- the language tag set to the new language;
- the same nodes and node IDs, so its pages keep their translation keys and are paired with the primary's.

The new language SHALL start hidden. Adding SHALL be recorded as the new document's first version.

#### Scenario: Add English
- **WHEN** a member adds English to a Czech project with the pages "Úvod" and "Kontakt"
- **THEN** the project has an English document, hidden, with the pages "Úvod" and "Kontakt" (still in Czech) paired with the Czech ones, and its language tag is `en`

### Requirement: Publishing and hiding a language
A member SHALL be able to publish a hidden language and hide a published one other than the primary. Only published languages SHALL be part of a publish, the ZIP download, alternates and the language switcher. The preview SHALL show all languages, hidden ones included, so they can be checked before publishing. Publishing or hiding a language SHALL take effect on the next publish.

#### Scenario: Hidden in the preview only
- **WHEN** English is hidden
- **THEN** the preview has the English pages at `/en/`, and the next publish and the ZIP download don't

### Requirement: Removing a language
A member SHALL be able to remove a language other than the primary, after confirming. Removing SHALL delete the language's document and its versions. The language's addresses SHALL no longer be part of the next publish, and they SHALL NOT be redirected.

#### Scenario: Remove German
- **WHEN** a member removes German and confirms
- **THEN** the project no longer has a German document, and the next publish has no `/de/` pages

#### Scenario: Primary can't be removed
- **WHEN** a member tries to remove the primary language
- **THEN** it is refused

### Requirement: Shared fields
These fields SHALL be shared, and come from the primary language:
- the theme;
- the favicon;
- the default share image's image (not its description);
- the AI crawler switches;
- the business data: street, postal code, city, country, phone, email, map address, type of business, opening hours and the footer switch.

Whenever a document in another language is read (for the editor, the preview, the ZIP download or a publish), its shared fields SHALL be replaced by the primary's current ones. The primary's changes SHALL apply to every language without saving the other languages. All other fields SHALL be per language:
- the site name and description;
- the default share image's description, while it describes the same image as the primary's; otherwise the primary's description is used, so publishing never waits for a new translation;
- the business name and the note on the opening hours;
- the menu, the pages and their contents.

#### Scenario: Change the phone once
- **WHEN** the Czech phone number is changed and saved
- **THEN** the English editor, preview and the next publish show the new number, while the English document's version is unchanged

#### Scenario: English description of the opening hours
- **WHEN** the English note on the opening hours is "Closed on public holidays" and the Czech one is "Ve svátky zavřeno"
- **THEN** each language's published opening hours show its own note

### Requirement: Access to languages
Managing languages (adding, publishing, hiding, removing) SHALL be available to members of the project's workspace, owners and editors alike. Others SHALL get "not found", or 401 when not signed in. Changes SHALL be refused when the request comes from another site's page.

#### Scenario: Another workspace
- **WHEN** a member of another workspace tries to add a language to the project
- **THEN** the response is "not found"
