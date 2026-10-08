## MODIFIED Requirements

### Requirement: File layout
Export SHALL produce a file tree in which:
- the home page (the page named by the site's home page ID) is `index.html`;
- every other page is `<slug>/index.html`;
- the not-found page is `404.html`;
- the stylesheet is `assets/style.css`;
- when a page shows a video (a videos block, or a project page with a YouTube or Vimeo video), the video script is `assets/video.js`;
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

#### Scenario: Video script only when needed
- **WHEN** exporting a site without videos, and then the same site with a videos block on one page
- **THEN** the first tree has no `assets/video.js`, and the second has it once

