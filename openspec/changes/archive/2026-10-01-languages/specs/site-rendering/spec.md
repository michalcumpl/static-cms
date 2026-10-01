# Spec Delta

## MODIFIED Requirements

### Requirement: Page not found
Rendering SHALL produce a "page not found" page in addition to the site's pages. It SHALL have:
- the site's header, navigation and footer;
- an `h1` and a short message in the site's language, with a link to the home page;
- the `<title>` of the `h1` and the site name;
- no canonical link, no share metadata and no structured data.

Czech (`cs`), Slovak (`sk`), English (`en`), German (`de`) and Polish (`pl`) SHALL have their own wording, and any other language SHALL use English. All its links SHALL be absolute paths from the base path, so that it works at any address.

#### Scenario: Czech site
- **WHEN** rendering the not-found page of site "Anideti" in language `cs`
- **THEN** its `h1` is "Stránka nenalezena", its `<title>` is `Stránka nenalezena – Anideti`, and it links to the home page

#### Scenario: Other language
- **WHEN** rendering the not-found page of a site in language `fr`
- **THEN** its `h1` is "Page not found"

#### Scenario: German site
- **WHEN** rendering the not-found page of a site in language `de`
- **THEN** its `h1` is "Seite nicht gefunden"

### Requirement: Opening hours table
Opening hours SHALL render as a `<table>` with one row per group of consecutive days that have the same ranges:
- a `<th scope="row">` with the day, or the first and last day of the group joined by an en dash;
- a `<td>` with the ranges, each as `H:MM–H:MM` (hours without a leading zero, an en dash between), separated by a comma and a space, or the word for closed.

Day names and the word for closed come in the site's language: Czech `Po Út St Čt Pá So Ne` and "zavřeno"; Slovak `Po Ut St Št Pi So Ne` and "zatvorené"; German `Mo Di Mi Do Fr Sa So` and "geschlossen"; Polish `Pn Wt Śr Cz Pt Sb Nd` and "zamknięte"; English, the fallback for other languages, `Mon Tue Wed Thu Fri Sat Sun` and "Closed". The note SHALL follow the table in a `<p>` when it isn't empty. When every day is closed, there SHALL be no table, only the note.

#### Scenario: Weekdays grouped
- **WHEN** rendering opening hours with Monday to Friday 06:00–17:00, Saturday 07:00–11:00 and Sunday closed, on a Czech site
- **THEN** the table's rows are "Po–Pá" "6:00–17:00", "So" "7:00–11:00", and "Ne" "zavřeno"

#### Scenario: Lunch break
- **WHEN** Monday alone has 08:00–12:00 and 13:00–17:00, on an English site
- **THEN** Monday's row reads "Mon" "8:00–12:00, 13:00–17:00"

#### Scenario: Only a note
- **WHEN** every day is closed and the note is "Po domluvě"
- **THEN** the hours render as `<p>Po domluvě</p>` without a table

## ADDED Requirements

### Requirement: Language alternates
Rendering SHALL accept, optionally, the site's languages. For each language, it is given:
- the language tag;
- its name in that language (for example "Čeština", "English");
- its base path;
- the address of each of its pages by translation key;
- which language is primary.

When rendering is given two or more languages:
- **Alternates:** every page SHALL have a `<link rel="alternate" hreflang="<lang>">` for each language that has a page with the same translation key, its own language included. There SHALL also be an `hreflang="x-default"` link to the primary language's counterpart, when the primary has one. The links SHALL use absolute URLs when the site's address is known, otherwise paths.
- **Switcher:** the header SHALL contain a language switcher, a `<nav>` with an accessible name, listing every language by its own name. Each language links to its counterpart of the current page, or to its home page when there is none. The current language is marked `aria-current="true"`, and each link has its language's `lang` and `hreflang` attributes.
- **The not-found page** SHALL have the switcher linking to each language's home page, and no alternates.

With one language, or none given, pages SHALL have neither alternates nor a switcher.

#### Scenario: Counterpart in English
- **WHEN** rendering the Czech page "Kontakt" at `/kontakt/`, whose English counterpart is at `/en/contact/`, with site address `https://anideti.cz`
- **THEN** the page has `<link rel="alternate" hreflang="cs" href="https://anideti.cz/kontakt/">`, `<link rel="alternate" hreflang="en" href="https://anideti.cz/en/contact/">` and `<link rel="alternate" hreflang="x-default" href="https://anideti.cz/kontakt/">`
- **AND** its switcher links "English" to `/en/contact/`

#### Scenario: No counterpart
- **WHEN** rendering a Czech page whose translation key has no English page
- **THEN** it has no English alternate, and the switcher links "English" to `/en/`

#### Scenario: One language
- **WHEN** rendering a site given only its own language
- **THEN** no page has an alternate link or a language switcher
