# Design

## Context

See proposal.md for the motivation and the specs for the behaviour (`project-page` is new). The current state:

- **The project page** (`/p/<project>/+page.svelte`, 170 lines) is one column: Publishing, Languages, Validation, Pages and the ZIP download. Publishing details and History are separate routes (`publishing/`, `history/`), each with its own header and breadcrumb, reached by links. `+layout.server.ts` checks membership and returns `{ project, workspace, role }`.
- **The editor** is `edit/`, a child of the same route folder, with `ssr = false` and its own layout. A `+layout.svelte` placed in `p/[project]/` would wrap the editor too.
- **Site and Business settings** are `SiteSettings.svelte` and `BusinessSettings.svelte`, driven by an `EditorState` and the operations in `site.ts` and `business.ts`, which run on its Svedit `Session`. The editor layout also supplies what they need around them: the media library (`editor.openLibrary`, the `MediaLibrary` dialog), the unsaved-changes guard (`beforeNavigate`, `beforeunload`), `editor.save()` with its conflict handling, and the phone's draft (`editor.registerDraft`).
- **Problems** are located by `settingsTarget()` and the `*FieldElementId()` helpers in `locate.ts`; the problems panel sets `editor.settingsTab` and focuses the element.
- **Pages list:** `PagesSidebar.svelte` has ↑/↓ buttons for menu entries and dialogs for adding a page and editing a link. `PageSettings.svelte` has the Duplicate, Delete and Set as home buttons, and the delete dialog. `PopoverMenu` (menu button with entries, disabled reasons, keyboard) is used by block handles.
- **Save model:** the editor saves explicitly, as one new version, with `baseVersion` for conflicts (`PUT /api/projects/<id>/site?lang=`).

## Goals / Non-Goals

**Goals:**
- Every tab loads only what it shows, and has its own address.
- The Settings tab behaves like the editor where it edits the same document: explicit save, undo, conflict refusal, unsaved-changes guard, the shared-field rules. It reuses the editor's panels, not copies of them.
- Nothing about the stored document changes.

**Non-Goals:**
- A second way to edit the document. The Settings tab edits the same document through the same session and operations.
- Autosave. The Settings tab saves like the editor does.
- Changing the project's name, or deleting a project.

## Decisions

### 1. A route group for the tabs

The six tab routes live in a route group `p/[project]/(tabs)/`, with a `+layout.svelte` that renders the header (name, breadcrumb, Preview, Open editor) and the tab bar. A group doesn't change addresses, and the editor stays outside it, so it doesn't get the tabs. `+layout.server.ts` and its membership check stay where they are, so every tab and the editor share it.

- `(tabs)/+page.svelte`: Overview;
- `(tabs)/pages/`, `languages/`, `publishing/` (moved), `history/` (moved, with `[version]/` and its tests), `settings/`.

The tab bar uses the `Tabs` component (links, `aria-current="page"`). Links carry `?lang=` on the tabs that take a language (Pages, History, Settings). A language choice (a `Select`, like the editor's switcher) sits at the top of those three tabs; it navigates to the same tab with another `?lang=`.

Alternative: one page with client-side tab panels. Rejected: no addresses, no Back button, and one huge load. Alternative: a layout at `p/[project]/` and an escape for the editor with a `+layout@` reset. Rejected: a group is plainer and keeps the editor from ever depending on the tabs.

### 2. What each tab loads

Each tab has its own `+page.server.ts`, reusing the server functions the old page and the API routes use, so no API changes:

- **Overview:** `publishingState()` (the live address, the last publish), `readSite()` for validity and problems (as the old page did), `projectLanguages()`, and the newest entry of `listVersions()` for "last saved, by whom".
- **Pages:** `renderSite()` for the page list (as now) plus `projectTranslations()` for the not-translated marks; language from `?lang=`. The primary's missing pages come from `projectTranslations()` too.
- **Languages:** `projectLanguages()` and `projectTranslations()`; `LanguagesSection` moves in unchanged.
- **Publishing and History:** unchanged loads, now inside the group. The two pages lose their own headers.
- **Settings:** a client load, like the editor's (decision 3).

The ZIP download moves to a `DownloadZip.svelte` component on the Publishing tab; its code is the old `downloadZip()`, which fetches `export-input` and builds the archive in the browser.

### 3. The Settings tab is a small editor without a canvas

`settings/+page.ts` has `ssr = false` and loads the language's document, the project's languages and `translations` from the same endpoints as `edit/+layout.ts`. The page builds an `EditorState` from them, mounts the existing `SiteSettings`, `BusinessSettings` and `MediaLibrary`, and gives them what the editor layout gives. Operations, undo, `save()`, conflict handling and the phone draft are then the editor's own, which keeps both screens saving the same way.

- **Shared set-up:** the pieces both screens need move out of `edit/+layout.svelte` into small helpers: `useUnsavedGuard(editor)` (`beforeNavigate` + `beforeunload`, with the same wording) and `useMediaLibrary(editor)` (the two `openLibrary` functions and the dialog). The editor layout calls them too.
- **Undo and redo** buttons call `editor.session.undo()` and `redo()`. Svedit's key bindings (Ctrl+Z) are the canvas's and don't exist here; text fields keep the browser's own undo.
- **Problems:** the tab lists `editor.savedProblems` that `settingsTarget()` maps to the site or business tab, each as a button that scrolls to and focuses the field with the `*FieldElementId()` helpers. Other problems (pages, theme) are the editor's.
- **Read-only shared fields:** `editor.sharedReadOnly` and `SharedNote` already do this; `SharedNote` gets a variant that links to the Settings tab of the primary language.
- **Layout of the tab:** two sections, Site and Business, side by side on wide windows and stacked on narrow ones, under the language choice, the problems list and the Save, Undo and Redo bar.

Alternative: a form that posts plain values to a new endpoint. Rejected: a second write path with its own validation and conflict rules, and the settings operations (phone normalising, hours rules, undo) would be written twice. Alternative: keep these panels in the editor and only restyle. That's what the owner asked to change.

The `Session` is created without a canvas. This should work in the browser without a mounted `Svedit` component, but task 3.1 starts by checking this with a throwaway page, because the rest depends on it.

### 4. Leaving the editor for the Settings tab

`ProblemsPanel.show()`, `EditBusinessButton` and the left column's Settings link call `openSettings(editor, t, fieldId?)`:
1. if `editor.dirty`, ask "save now?" (a confirm); declining cancels, accepting saves and stops if saving failed, so the tab shows what the editor shows;
2. `goto(editor.paths.settings + "?focus=<element id>")`, with the language's `?lang=`.

The Settings tab reads `?focus=` once, after mount, and focuses that element. The value is the field's element ID (`business-settings-phone`, `site-settings-name`, …), the same IDs the problems list inside the tab uses, from `settingsFieldId()` in `locate.ts`; only IDs of the tab's own panels are accepted.

The editor's old `?tab=site|business` addresses (bookmarks, and `SharedNote` links from before) redirect to the Settings tab; `?tab=theme` is accepted as `?tab=design`.

### 5. The editor's settings column: Page and Design

`editor.settingsTab` becomes `"page" | "design"`. The tab bar in `edit/+layout.svelte` drops Site and Business, and Theme is renamed Design (the i18n key `editor.tabs.theme` becomes `editor.tabs.design`; the panel's own `editor.theme.*` keys stay). The problems panel opens Design for theme problems as it does Theme now.

### 6. The pages list menu

`PagesSidebar` replaces the ↑/↓ buttons with a "⋯" button per entry that opens a `PopoverMenu` (anchored per entry with a unique anchor name, as block handles do). Its entries come from a function `pageMenuEntries(editor, entry, t)` in a new `page-menu.ts`, which returns `MenuEntry[]` with `run` and `disabledReason`, so the rules (first, last, home, only page) are unit-testable without a DOM.

- Rename opens a small dialog (the add-page dialog's pattern) and calls `setPageTitle()`, which already carries the slug and menu label.
- Duplicate, Show/Remove from menu, Set as home and the moves call `duplicatePage()`, `showInMenu()`, `setHome()` and `moveMenuItem()`.
- Delete opens the confirmation dialog, which moves from `PageSettings.svelte` into a shared `DeletePageDialog.svelte`, with the link count (`countLinksTo()`), and calls `deletePage()`. The layout already switches to the home page when the current page is gone.
- External links: Edit opens the existing link dialog; the others call `moveMenuItem()` and `removeMenuItem()`.

`PageSettings.svelte` loses its three buttons and the delete dialog. Dragging stays as it is.

### 7. The problems panel in the left column

`ProblemsPanel.svelte` moves from the bottom of the details column (`aside.panels`) to `.left-column`, under `PagesSidebar`. The pages list keeps the space it needs; the panel takes what remains and scrolls inside itself (`min-height: 0`, `overflow: auto`), with the heading (with the counts) fixed. The left column goes from `13rem` to `16rem` so messages wrap less; the canvas gives up the difference. `show()` and the panel's props don't change, so locating problems works as before. The left column keeps the window's height (sticky under the bar), the pages above and the problems below with their own scrolling; the editor has no narrow-window layout today, and this change doesn't add one.

Alternative: a collapsible bar under the canvas. Rejected: it takes height from the canvas, which is the scarce dimension.

### 8. Wording in the site package

`packages/site/src/validate/domain.ts` says "fill in the … on the Business tab". It becomes "… in the business settings", and the block picker's descriptions in both catalogues say "from the business settings". The spec's wording ("filled in in the business settings") is the contract; the tests check the message text.

### 9. Overview's problems stay a summary

The Overview lists the saved site's problems as the old page did (severity badge, message, code). Linking each to its place in the editor or the Settings tab is out of scope: the editor's problems panel already does that.

## Risks / Trade-offs

- **A canvas-less `Session` might not behave** (selection, commands, or config that expects the DOM) → task 3.1 proves it first; if it fails, the fallback is a minimal document store over the same operations, which is a larger change and would go back to the owner.
- **Two screens can edit one document at once** (a Settings tab open while the editor saves) → the existing conflict refusal covers it, and "Changed elsewhere" in the spec is tested. The tab says to reload.
- **Editor changes not yet saved are invisible to the Settings tab** → the leave dialog asks to save first when the editor opens it; otherwise the tab shows the saved document, which is what the blocks' warnings and previews use too.
- **Moved pages break bookmarks and tests** → the addresses of Overview, Publishing and History don't change; only the content's place does. Old editor `?tab=` addresses redirect. The e2e specs that used the removed tabs or the old sections are updated in task 6.
- **The "⋯" button is less discoverable than visible buttons for move up and down** → it is one button for everything, and the actions are disabled with reasons rather than hidden. Dragging stays for reordering.
- **Wider i18n surface:** every tab adds Czech texts → the guard test and type check catch gaps.

## Migration Plan

No data, API or document changes, so nothing to migrate. Deploying is a plain release. Rolling back restores the old page and the editor's tabs; settings saved on the new tab are the same documents. Bookmarks to the old project page still open the Overview.

## Open Questions

- Whether the Pages tab should offer Add page and the other page actions outside the editor. It can wait: nothing here depends on the answer.
