# Spec Delta

## Purpose

Defines the choices a site's look is made from: the catalog of fonts a theme can use and the files each brings, the ready-made theme presets, and the contrast rules between the theme's colours that keep every site readable.

## ADDED Requirements

### Requirement: Font catalog
A theme's heading font and body font SHALL each be an ID from a fixed catalog. Every font in it has a display name, a kind (`sans` or `serif`) and a fallback font list for the time before it loads. The catalog SHALL hold:
- **webfonts** shipped with the site: `inter`, `work-sans`, `source-sans`, `nunito` (sans), and `lora`, `source-serif`, `merriweather`, `playfair` (serif);
- **system fonts** that ship no files: `system-sans` (the device's interface font) and `georgia` (Georgia and similar serifs).

Every webfont SHALL cover the characters of the languages offered (Czech, Slovak, English, German, Polish) in upright and italic styles at weights 400 to 700, and SHALL be under the SIL Open Font Licence. IDs SHALL NOT be removed from the catalog once stored documents use them.

#### Scenario: Unknown font
- **WHEN** a theme's heading font is `comic-sans`
- **THEN** validation reports an invalid-theme-value error naming the heading font

#### Scenario: System font
- **WHEN** a theme uses `georgia` for headings and `system-sans` for the body
- **THEN** the theme is valid and needs no font files

### Requirement: Font files of a theme
Each webfont SHALL be shipped as WOFF2 files for two character subsets: `latin`, and `latin-ext` for the remaining characters of the offered languages. The files a theme needs SHALL be:
- for the body font: the upright and the italic file of each subset;
- for the heading font: the upright file of each subset;
- each file once when both use the same font;
- one licence text per webfont used.

Files SHALL be named `<font id>-<subset>-<style>.woff2` (style `normal` or `italic`), and licences `<font id>-OFL.txt`. They SHALL be listed sorted by name (code-point order).

#### Scenario: Lora headings, Inter body
- **WHEN** the files of a theme with heading font `lora` and body font `inter` are listed
- **THEN** they are `inter-OFL.txt`, `inter-latin-ext-italic.woff2`, `inter-latin-ext-normal.woff2`, `inter-latin-italic.woff2`, `inter-latin-normal.woff2`, `lora-OFL.txt`, `lora-latin-ext-normal.woff2` and `lora-latin-normal.woff2`

#### Scenario: Same font for both
- **WHEN** a theme uses `work-sans` for headings and for the body
- **THEN** its files are the four Work Sans WOFF2 files and `work-sans-OFL.txt`, each once

#### Scenario: System fonts only
- **WHEN** a theme uses `system-sans` for both
- **THEN** it needs no files

### Requirement: Theme colour contrast
A theme's colours SHALL be used in these pairs, and each pair SHALL reach a contrast of at least 4.5:1 (WCAG 2.2 AA for body text):
- text on background (body text);
- primary on background (links, and the label of a primary button);
- text on secondary (text in the hero, call-to-action panels and testimonials);
- primary on secondary (links and secondary buttons on those panels).

Each failing pair SHALL be reported as its own low-contrast error with the pair's name and the measured ratio.

#### Scenario: Pale primary colour
- **WHEN** a theme has primary `#7fb2e5` on background `#ffffff`
- **THEN** validation reports a low-contrast error for links and buttons with the ratio 2.23:1

#### Scenario: Dark secondary colour
- **WHEN** a theme has text `#1a1a1a` and secondary `#3b3b3b`
- **THEN** validation reports a low-contrast error for text on panels

#### Scenario: Every pair passes
- **WHEN** a theme has primary `#1f5a8a`, secondary `#e8eef4`, background `#ffffff` and text `#1a1a1a`
- **THEN** validation reports no contrast problem

### Requirement: Theme presets
There SHALL be at least five theme presets, each with a name, its four colours, a heading font, a body font and a corner radius. Every preset SHALL pass all theme validation, contrast included. Applying a preset SHALL set those values and leave the content width unchanged. The first preset SHALL have the values new projects start with.

#### Scenario: Presets are valid
- **WHEN** each preset's values are put into a valid site's theme
- **THEN** validation reports no problem about the theme

#### Scenario: Content width kept
- **WHEN** a preset is applied to a theme with content width `56rem`
- **THEN** the theme has the preset's colours, fonts and radius, and content width `56rem`
