# Spec Delta

## MODIFIED Requirements

### Requirement: Page document structure
Each page SHALL render as a complete HTML5 document with `<!doctype html>`, `<html lang>` set from the site language, a UTF-8 charset declaration, a responsive viewport meta tag, a `<title>` combining the page title and site name, a meta description when the page has SEO description text, and a link to the site stylesheet. The body SHALL contain a `<header>` with the site name, linking to the home page, and navigation in a `<nav>`, a single `<main>` holding the page's blocks, and a `<footer>`. The home page is the page named by the site's home page ID, wherever it is in the list of pages.

#### Scenario: Language and landmarks
- **WHEN** rendering a page of a site whose language is `cs`
- **THEN** the output starts with `<!doctype html>`, has `<html lang="cs">`, and contains exactly one `<header>`, `<nav>`, `<main>` and `<footer>`

#### Scenario: Title
- **WHEN** rendering page "Kontakt" of site "Anideti"
- **THEN** the `<title>` is `Kontakt – Anideti`

#### Scenario: Home page title
- **WHEN** rendering the home page of site "Anideti"
- **THEN** the `<title>` is `Anideti`

#### Scenario: Home page not first in the list
- **WHEN** a site lists pages "Kontakt", "Úvod" and its home page ID names "Úvod"
- **THEN** "Úvod" renders with the `<title>` `Anideti`, and the site name in every page's header links to the base path

### Requirement: Navigation rendering
The navigation SHALL render as a list of links in document order. A link to the home page SHALL point to the base path, and a link to another page SHALL point to `<base path><slug>/`. The home page's own slug SHALL NOT appear in any link. The link to the page being rendered SHALL carry `aria-current="page"`.

#### Scenario: Current page marked
- **WHEN** rendering page `kontakt` with the default base path, and its navigation includes it
- **THEN** its navigation link has `href="/kontakt/"` and `aria-current="page"`, and no other link has `aria-current`

#### Scenario: Link to the home page
- **WHEN** the home page has slug `uvod` and a navigation item, a text link and a call to action point to it
- **THEN** all of them link to the base path, and no link is `/uvod/`
