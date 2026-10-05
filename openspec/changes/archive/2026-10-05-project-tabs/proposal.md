# Proposal

## Why

The project page is one long column. Publishing, languages, translation status, validation, the page list and the ZIP download all sit on top of each other, and History and Publishing details are separate pages reached by buttons and links. Owners have to scroll to find anything.

The editor also holds settings that have nothing to do with the page on the canvas. The Site tab holds the name, description, favicon, share image and AI switches. The Business tab holds the address, phone, opening hours and so on. Owners set these once, yet they share the narrow settings column with the page and the theme.

Deleting a page is hard to find: it's a button at the bottom of the Page tab. The pages list on the left offers only ↑/↓ buttons.

This is step 2 of the admin redesign. Step 1, admin-foundation, gave the admin its look, its shell and two languages.

## What Changes

- **The project page becomes tabs:** Overview, Pages, Languages, Publishing, History and Settings. Each tab is its own address under `/p/<project>/`, under a shared header with the project's name, Preview and Open editor.
  - **Overview:** the live site with its address, the last publish and the Publish button; problems at a glance; the languages; the last saved version.
  - **Pages:** the pages of a language, with home, menu and translation status, each with Edit and Preview.
  - **Languages:** what the project page's Languages section does today.
  - **Publishing:** today's publishing page, plus the ZIP download.
  - **History:** today's history page.
  - **Settings:** the site and business settings, moved out of the editor.
- **Site and Business settings leave the editor.** The Settings tab edits them for one language at a time:
  - with Save and the same unsaved-changes guard as the editor;
  - with the shared fields read-only outside the primary language, as now;
  - listing the problems that concern them.

  In the editor, problems about these fields, "Edit business details" on business blocks, and a new Settings link in the left column all lead to the Settings tab.
- **The problems panel moves to the editor's left column,** under the pages list, which the settings column no longer needs the room for.
- **The editor's settings column keeps Page and Design.** Design is the Theme tab under a new name, with the same content.
- **A "⋯" menu for each entry in the editor's pages list:**
  - for pages: Rename, Duplicate, Move up and Move down (in the menu), Show in menu or Remove from menu, Set as home, and Delete;
  - for external links: Edit, Move up and Move down, and Remove from menu.

  It replaces the ↑/↓ buttons, and the page actions move out of the bottom of the Page tab. Unavailable actions say why, as block handles do.
- **The site's validation messages** say "in the business settings" instead of "on the Business tab".
- **Out of scope:**
  - renaming or deleting a project, and project-level settings beyond the site and business;
  - links from the Overview's problems straight to each problem;
  - the projects dashboard and the presentation site, which are steps 3 and 4.

## Capabilities

### New Capabilities

- `project-page`: the project's tabs and what each one shows, including the Settings tab that edits the site and business settings outside the editor.

### Modified Capabilities

- `site-editing`:
  - the Site settings panel and the Business tab are removed (they become `project-page`'s Site settings and Business settings);
  - the Theme tab is renamed Design;
  - business blocks link to the Settings tab, and so do problems about site and business fields;
  - the page actions move from the Page tab into a new "⋯" menu in the pages list;
  - the shared-fields rule is split: Design here, the Settings tab in `project-page`;
  - the block picker's description of Opening hours names the business settings.
- `languages`: the translation status moves from "the project page" to its Languages tab, and the Pages tab marks untranslated pages.
- `site-document`: business messages and the empty-block warning name the business settings instead of the Business tab.

## Impact

- **Routes** (`apps/admin/src/routes/p/[project]/`):
  - a tab layout for the project's pages;
  - new `pages/`, `languages/` and `settings/` routes;
  - `+page.svelte` becomes the Overview;
  - `publishing/` and `history/` move under the tab layout;
  - the editor (`edit/`) and the preview stay outside it.
- **Editor:**
  - `edit/+layout.svelte` (tabs);
  - `PagesSidebar.svelte` (the "⋯" menu, reusing `PopoverMenu`);
  - `PageSettings.svelte` (its actions move);
  - `ProblemsPanel.svelte` and `locate.ts` (settings targets);
  - `EditBusinessButton.svelte`, `SharedNote.svelte`;
  - `state.svelte.ts` (`settingsTab` becomes `"page" | "design"`).
- **Reused in the Settings tab:** `SiteSettings.svelte`, `BusinessSettings.svelte`, `ImageSetting.svelte` and `MediaLibrary.svelte`, on an `EditorState` without a canvas. Saving uses the existing `PUT /api/projects/<id>/site`.
- **`@static-cms/site`:** the wording of the business-block warning in `validate/domain.ts`.
- **i18n:** new and changed keys in both catalogues.
- **Tests:** e2e specs that use the editor's Site or Business tabs, the project page's sections or the ↑/↓ buttons (`business`, `metadata`, `languages`, `language-tools`, `pages`, `publishing`, `walkthrough` and others) need to follow the new places. No data or API changes.
