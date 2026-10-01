# Spec Delta

## MODIFIED Requirements

### Requirement: File layout
Export SHALL produce a file tree in which:
- the home page (the page named by the site's home page ID) is `index.html`;
- every other page is `<slug>/index.html`;
- the not-found page is `404.html`;
- the stylesheet is `assets/style.css`;
- `robots.txt` is at the root;
- every image variant and share file used by the site is under `assets/images/`;
- every font file and font licence the theme needs is under `assets/fonts/`;
- when the site has a favicon, `favicon.ico`, `icon-512.png` and `apple-touch-icon.png` are at the root.

The home page SHALL NOT also be written under its slug. Export SHALL accept the same optional base path as rendering (default `/`). Rendered links SHALL resolve correctly when the tree is served at that path.

#### Scenario: Two-page site
- **WHEN** exporting a site with the home page and a page with slug `kontakt`
- **THEN** the tree contains `index.html`, `kontakt/index.html`, `404.html`, `robots.txt` and `assets/style.css`

#### Scenario: Home page listed second
- **WHEN** exporting a site whose pages are `kontakt` and `uvod`, with `uvod` as the home page
- **THEN** the tree contains `index.html` (the `uvod` page) and `kontakt/index.html`, and no `uvod/index.html`

#### Scenario: Export for a subdirectory
- **WHEN** exporting with base path `/web/`
- **THEN** the file layout is unchanged and `index.html` links the stylesheet as `/web/assets/style.css`

## ADDED Requirements

### Requirement: Font files
Rendering SHALL be able to report the font files a document's theme needs (see "Font files of a theme" in the theming capability). The caller SHALL supply their bytes, keyed by file name, separately from media. Export SHALL place each under `assets/fonts/` with its own name, include no other font files, and fail with an error naming the missing file if a needed file's bytes were not supplied. With several languages, the fonts SHALL be the primary's.

#### Scenario: Webfonts exported
- **WHEN** exporting a site whose theme uses `lora` for headings and `system-sans` for the body, with the Lora files supplied
- **THEN** the tree contains `assets/fonts/lora-latin-normal.woff2`, `assets/fonts/lora-latin-ext-normal.woff2` and `assets/fonts/lora-OFL.txt`, and no other file under `assets/fonts/`

#### Scenario: Missing font file
- **WHEN** exporting a site whose body font is `inter`, and no bytes were supplied for `inter-latin-italic.woff2`
- **THEN** export fails with an error naming `inter-latin-italic.woff2`

#### Scenario: System fonts only
- **WHEN** exporting a site that uses only system fonts
- **THEN** the tree has no `assets/fonts/` files
