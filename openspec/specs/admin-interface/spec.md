# admin-interface Specification

## Purpose

Defines how the admin application looks and which language it speaks: its design system, the shell around every signed-in page, and the Czech and English interface with how a person's language is chosen and remembered.

## Requirements

### Requirement: Design tokens
The admin SHALL take its colours, type, spacing, radii and shadows from one set of tokens, applied on every admin page and nowhere in the site canvas. The tokens SHALL be:
- **ground** `#F3F8F9`, **surface** `#FFFFFF`, **ink** `#18292D`, **muted** `#4F6266`, **border** `#D9E7EA`;
- **button** `#B5E4EC` with **button label** `#0A3C47`, **link** `#0E6475`, **soft** `#E3F4F7`;
- **status** colours: success `#136C3A` on `#E7F6EC`, attention `#8A4B00` on `#FFF1DC`, problem `#B42318` on `#FDECEA`;
- the **DM Sans** font, served by the admin itself;
- **radii**: 12 px for fields and small surfaces, 18 px for cards, fully round for buttons and tabs.

Every text and background pair the tokens are used in SHALL reach WCAG 2.2 AA (4.5:1). Text on a button SHALL use the button label colour, never white. The editor's canvas SHALL keep the site's own stylesheet and theme, unaffected by the admin's tokens.

#### Scenario: Readable buttons
- **WHEN** a primary button is shown
- **THEN** its label is `#0A3C47` on `#B5E4EC`, a contrast of at least 4.5:1

#### Scenario: The canvas keeps the site's look
- **WHEN** the editor shows a site whose theme uses Lora headings and a brown primary colour
- **THEN** the canvas shows Lora and brown, while the toolbar and panels use DM Sans and the admin's colours

### Requirement: Shared interface components
Admin pages SHALL build their controls from shared components, so the same control looks and behaves the same everywhere:
- buttons in three kinds: primary, secondary and danger;
- text fields, selects, checkboxes, switches;
- status badges;
- cards, tabs, dialogs, notices and empty states;
- a page header with a title, an optional breadcrumb and actions.

Every control SHALL have a visible label or an accessible name, a visible focus ring, and at least a 44 × 44 px target on touch screens. Status SHALL never be shown by colour alone: every badge has a word and an icon or dot.

#### Scenario: One kind of button
- **WHEN** the members page and the publishing page each show a primary action
- **THEN** both are the same pill-shaped button in the button colour, with the same height and focus ring

#### Scenario: Status in words
- **WHEN** a project has unpublished changes
- **THEN** its badge says "Unpublished changes" in the attention colours, with a dot

### Requirement: App shell
Every signed-in page SHALL show a top bar with:
- the product mark and name "Static CMS", linking to the project list;
- the current workspace, with a switcher when the person belongs to several;
- an account menu with the person's email address, the interface language (Čeština or English) and Sign out.

The editor SHALL show the same bar in a compact height above its toolbar. Pages a person sees before signing in (sign-in, invitation) SHALL show the product mark only, without workspace or account, and a language choice ("Čeština · English") below their form. The language SHALL NOT have a control of its own in the top bar.

#### Scenario: Switch workspace
- **WHEN** a person who belongs to "Studio Kolín" and "Pekárna U Lípy" opens the switcher on a page of Studio Kolín and chooses Pekárna U Lípy
- **THEN** the project list of Pekárna U Lípy opens

#### Scenario: Sign out from the account menu
- **WHEN** a signed-in person opens the account menu and chooses Sign out
- **THEN** their session ends and the sign-in page opens

#### Scenario: Editor keeps its space
- **WHEN** the editor is open
- **THEN** the top bar is shown above the editor's toolbar, and the canvas still fills the rest of the window

### Requirement: Interface language
The admin's interface SHALL be available in Czech and English, covering every page, the editor's toolbars, panels and dialogs, and messages from the server. The site's validation messages are excepted for now and stay in English. The language SHALL be chosen in this order:
1. for a signed-in person, the language stored on their account;
2. otherwise, the language chosen on this device before signing in;
3. otherwise, the first of Czech or English in the browser's preferred languages;
4. otherwise, English.

Choosing a language (in the account menu, or below the sign-in and invitation forms) SHALL apply it at once, store it on the account when signed in, and remember it on the device. The page's `lang` attribute SHALL be the interface language. Dates, times and numbers SHALL be formatted for the interface language. Words that depend on a count SHALL use the language's plural forms (Czech: one, few and other, as `Intl.PluralRules` gives them).

#### Scenario: Czech browser, first visit
- **WHEN** a person whose browser prefers `cs-CZ` opens the sign-in page for the first time
- **THEN** the page is in Czech, with `<html lang="cs">`

#### Scenario: Language in the account menu
- **WHEN** a signed-in person opens the account menu and chooses English
- **THEN** the page re-renders in English, and the top bar has no language control besides the menu

#### Scenario: The choice follows the person
- **WHEN** a person switches to English on their laptop, then signs in on a phone whose browser prefers Czech
- **THEN** the admin is in English on the phone

#### Scenario: Plural forms
- **WHEN** the projects page counts 1, 3 and 5 websites in Czech
- **THEN** it says "1 web", "3 weby" and "5 webů"

#### Scenario: Dates
- **WHEN** a version saved on 1 October 2026 at 14:05 is listed in Czech
- **THEN** its date reads "1. 10. 2026 14:05"

#### Scenario: Site content stays in its own language
- **WHEN** the interface is in English and the site is Czech
- **THEN** the canvas shows the site's Czech text, and only the editor's chrome is in English

### Requirement: Complete translations
Every message SHALL exist in both languages. A message missing in either language SHALL fail the build's type check or tests, so it can't be shipped. Messages SHALL be looked up by key, with named parameters for variable parts, and no interface text SHALL be written outside the catalogues.

#### Scenario: A missing Czech message
- **WHEN** a developer adds a message in English only
- **THEN** the type check fails, naming the missing key

### Requirement: Emails in the recipient's language
Sign-in emails SHALL be written in the language of the person they are sent to: their account's language, else the language of the page the link was requested from. Invitation emails SHALL be in the language of the owner sending the invitation, since the invited person has no account yet.

#### Scenario: Czech sign-in email
- **WHEN** a person whose account language is Czech requests a sign-in link
- **THEN** the email's subject and text are in Czech
