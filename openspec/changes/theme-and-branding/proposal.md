# Proposal

## Why

Every site made so far looks the same: blue links, Georgia headings, system body text. The site document has had a theme since Milestone 1, with colours, fonts, radius and content width, but nothing in the editor can change it (`edit/+layout.svelte` still builds the canvas stylesheet once, "the theme can't change in M2"). The header shows the site name as text only; there is no logo. The roadmap's goal is a site the owner can publish as *theirs*. A bakery and a physiotherapist need to look different, and to look like their sign and their business cards, before most other features matter.

## What Changes

- **A Theme tab** in the editor's settings column, next to Page, Site and Business. It edits:
  - **Presets:** about five complete, accessible looks (colours, fonts, corner radius), applied in one undoable step as a starting point.
  - **Colours:** primary, secondary, background and text, each with a colour picker and a hex field. Each colour pair the site actually uses shows its contrast and whether it passes.
  - **Fonts:** a heading font and a body font, chosen from a curated catalog of about ten open-licence fonts with Czech, Slovak and Polish characters, plus two system fonts. Each option is shown in its own typeface.
  - **Corner radius** (square, soft, round) and **content width** (narrow, standard, wide) as named choices.
  - **Logo:** an image from the media library, shown in the site header, with a switch "Show the site name next to the logo".
- **Live canvas.** The editor's canvas restyles as the theme changes; undo restores it.
- **Self-hosted webfonts.** The chosen fonts ship with the site as WOFF2 files under `assets/fonts/`, with their licence. Nothing loads from Google or any other third party. System fonts add no files.
- **Logo in the header.** The header link to the home page shows the logo, the logo and name, or the name alone. A logo shown without the name gets the site name as its description, per language. The home page's structured data uses the logo as the organisation's logo when there is one.
- **More contrast checks.** Today only text on background is checked. Links and buttons (primary on background) and text on secondary-coloured panels must also reach WCAG AA (4.5:1). These are errors, like the existing check.
- **Shared across languages.** The logo and the header switch join the theme as shared fields: edited in the primary language, read-only elsewhere.
- **Document format 6.** Theme fonts become catalog IDs instead of free CSS font lists. The site gains a logo and the header switch. Stored documents are upgraded: known font lists map to the matching system font, there is no logo, and the name is shown.

### Non-goals (this change)

- Uploading custom font files, or Google Fonts outside the catalog.
- SVG logos (the media library accepts JPEG, PNG and WebP only), and a separate logo for dark backgrounds.
- More colour roles (accent, footer background), per-block colours, dark mode for published sites.
- Cropping or a focal point for the logo.
- Font sizes, spacing scales or other layout controls. The renderer's layout stays fixed by design.

## Capabilities

### New Capabilities

- `theming`: the font catalog (IDs, families, fallbacks, files, licences), theme presets, and the contrast rules between theme colours.

### Modified Capabilities

- `site-document`:
  - the theme's fonts as catalog IDs, and the added contrast pairs;
  - the site's logo and header-name switch;
  - schema version 6 and its upgrade.
- `site-rendering`:
  - the header with a logo;
  - `@font-face` rules in the theme stylesheet;
  - logo variants in the media files a document uses;
  - the organisation's logo in structured data.
- `site-export`:
  - font files and their licences under `assets/fonts/`;
  - font bytes supplied by the caller, like media.
- `site-editing`:
  - the Theme tab and presets;
  - a live canvas stylesheet;
  - problems about the theme leading to its fields.
- `languages`: the logo and header switch become shared fields.

## Impact

- **`packages/site`:**
  - the font catalog and presets (data only, no font bytes);
  - the theme and site schema;
  - schema version 6 and the migration from 5;
  - validation (font IDs, contrast pairs, logo);
  - `@font-face` CSS;
  - header rendering;
  - `usedMediaFiles` and a new `usedFontFiles`;
  - export of font files;
  - shared fields;
  - tests and snapshots.
- **`apps/admin`:**
  - the Theme tab (`ThemeSettings.svelte`) and its operations;
  - the canvas stylesheet rebuilt from the theme, with fonts;
  - a route serving font files;
  - font bytes in the preview, the ZIP download and publishing;
  - `locate.ts` targets;
  - the canvas header with the logo;
  - unit and e2e tests.
- **New dependencies:** one `@fontsource-variable/*` package per webfont in the catalog (in `apps/admin`, for the WOFF2 files and licences). All are SIL Open Font Licence.
- **Docs:** the roadmap (Milestone 3: theme and branding) and a README note on document format 6.
