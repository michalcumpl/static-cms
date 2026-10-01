# Spec Delta

## ADDED Requirements

### Requirement: Exporting several languages
Export SHALL accept several site documents, one per language, with one of them primary. It SHALL produce one file tree:
- **Pages:** the primary's pages at the base path, and each other language's pages under `<lang>/`, each rendered with the alternates of every language given.
- **Stylesheet:** one `assets/style.css` (from the primary's theme).
- **Shared files:** the primary's `robots.txt`, favicon files and `404.html` at the root.
- **Media:** every media file any language uses, each once, under `assets/images/`.
- **Sitemap:** one `sitemap.xml` that lists every page of every language with its absolute URL, declares the `xhtml` namespace, and gives each URL an `<xhtml:link rel="alternate" hreflang>` for every counterpart, its own language included.
- **Redirects:** the `_redirects` file holds the given redirects of all languages.

When any document has validation errors, export SHALL fail with them, each naming its language. With one document, export SHALL produce the same tree as exporting that document alone.

#### Scenario: Czech and English
- **WHEN** exporting a Czech primary with pages home and `kontakt` and an English document with pages home and `contact`
- **THEN** the tree contains `index.html`, `kontakt/index.html`, `en/index.html`, `en/contact/index.html`, one `404.html`, one `robots.txt` and one `assets/style.css`

#### Scenario: Sitemap alternates
- **WHEN** exporting that site with base URL `https://anideti.cz`
- **THEN** `sitemap.xml` lists `https://anideti.cz/kontakt/` with alternates `cs` → `https://anideti.cz/kontakt/` and `en` → `https://anideti.cz/en/contact/`

#### Scenario: An English error
- **WHEN** the English document has an image without a description
- **THEN** export fails, and the problem says it is in the English version
