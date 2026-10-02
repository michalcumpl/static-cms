# Tasks

Every task that adds interface text adds it to both catalogues (`en.ts` and `cs.ts`); the type check and the untranslated-text test enforce it.

## 1. Settings without a canvas, and shared set-up

- [x] 1.1 Prove decision 3 first: a throwaway test page (not kept) builds an `EditorState` from a saved document in the browser without mounting Svedit, mounts `SiteSettings` and `BusinessSettings`, edits a field, undoes and saves. Verify it in the browser and by a component test of `site.ts` and `business.ts` operations on such a session; if it fails, stop and report to the owner (see Risks).
- [x] 1.2 Extract `useUnsavedGuard(editor)` and `useMediaLibrary(editor)` from `edit/+layout.svelte` into `src/lib/editor/` (decision 3) and use them there, with no change in behaviour. Verify with the existing e2e specs for unsaved changes and the media library (`editor`, `media`, `image-blocks`) passing unchanged.

## 2. The tabs

- [x] 2.1 Add the route group `p/[project]/(tabs)/` with its layout: header (name, breadcrumb, Preview, Open editor), the `Tabs` bar with the six tabs, `?lang=` carried by Pages, History and Settings, and a language `Select` for those three (decision 1). Move `publishing/` and `history/` (with `[version]/` and its tests) into it and drop their own headers. Verify with "Open a tab", "Not a member" and "Keep the language between tabs" as an e2e spec `project-tabs.spec.ts`, and the old Publishing and History specs passing at the same addresses.
- [x] 2.2 Turn `+page.svelte` into the Overview with its own `+page.server.ts` (decision 2): address, last publish, Publish button or the not-connected note, validity with its problems, languages, last saved by whom. Verify with "Published and valid", "Errors in the saved site" and "Never published" in `project-tabs.spec.ts`, and a unit test of the load in `page.server.test.ts`.
- [x] 2.3 Add the Pages tab (list with Home, menu, not-translated marks, Edit and Preview links, and the primary's missing pages) and the Languages tab (`LanguagesSection` moved, with the translation overview). Verify with "List the pages", "Edit from the list", "Add a language" and "Marked in the page list" in `project-tabs.spec.ts`, and `language-tools.spec.ts` and `languages.spec.ts` updated to the new places.
- [x] 2.4 Move the ZIP download to `DownloadZip.svelte` on the Publishing tab, disabled with a reason while the saved site has errors. Verify with "Download the site" and "Download refused" (the download event's file name and the disabled state), and `publishing.spec.ts` and `walkthrough.spec.ts` updated if they used the old page.
- [x] 2.5 Add the Overview, tab and download texts to both catalogues, translate the page titles (`"{page} – Static CMS"` per tab), and update the README's "Routes" section. Verify with the type check, the untranslated-text test, and reading the README section.

## 3. The Settings tab

- [x] 3.1 Add `(tabs)/settings/` with `ssr = false`: load the language's document, languages and translations, build the `EditorState`, mount `SiteSettings`, `BusinessSettings` and the media library, and add the bar with Save, Undo, Redo and the saved/saving/error status (decision 3). Verify with "Rename the site", "Choose a favicon", "Switch off AI training", "Normalise the phone", "Lunch break", "Copy Monday to the weekdays" and "Save" as e2e tests in `settings.spec.ts` (ported from `metadata.spec.ts` and `business.spec.ts`, which use the editor's tabs today).
- [x] 3.2 Add the unsaved-changes guard, the conflict refusal, the problems list with its focusing buttons, and `?focus=` (decisions 3 and 4). Verify with "Unsaved changes", "Changed elsewhere" and "Go to a problem" in `settings.spec.ts`, and a unit test that every `settingsTarget()` result has a focusable element ID.
- [x] 3.3 Show the shared fields read-only outside the primary language, with the note and the link to the Settings tab in the primary language (`SharedNote` variant). Verify with "Phone in English" in `settings.spec.ts` and the translatable fields (site name and description, share image description, business name, hours note) staying editable.
- [x] 3.4 Add the Settings tab's texts to both catalogues. Verify with the type check and the untranslated-text test.

## 4. The editor without settings

- [x] 4.1 Remove the Site and Business tabs from `edit/+layout.svelte`, rename Theme to Design (`settingsTab: "page" | "design"`, `editor.tabs.design`), make `?tab=theme` work as `?tab=design`, and redirect `?tab=site|business` to the Settings tab (decision 5). Verify with the theme e2e spec updated ("Go to a contrast problem" opens the Design tab) and a test that the old `?tab=business` address lands on the Settings tab.
- [x] 4.2 Add `openSettings(editor, target)` with the leave dialog and `?focus=`, and use it from the problems panel and `EditBusinessButton`; add the Settings link beside History in the left column (decision 4). Verify with "Edit business details", "Unsaved changes on the way" and "Go to a business problem" in `settings.spec.ts`, and the problems panel unit tests for site and business targets.
- [x] 4.3 Update the e2e specs that used the removed tabs (`business`, `metadata`, `theme`, `languages`, `language-tools`, `editor`, `walkthrough`, `content-blocks`, `image-blocks`) and drop the moved tests from them. Verify by running the whole e2e suite.

- [x] 4.4 Move `ProblemsPanel` into the left column under the pages list, widen the column, and let the panel scroll on its own (decision 7). Verify with "Under the pages" and "Long list" in an e2e spec (positions and scrolling), the problems e2e specs passing from the new place, and a screenshot check.

## 5. The pages list menu

- [x] 5.1 Add `page-menu.ts`: `pageMenuEntries()` for pages and for external links, with the disabled reasons (first, last, home, only page) (decision 6). Verify with unit tests for "Home page can't be deleted", "Not in the menu", the first and last menu entries, and external links.
- [x] 5.2 Add the "⋯" button and menu to every entry of `PagesSidebar.svelte`, the Rename dialog and the shared `DeletePageDialog.svelte` (moved from `PageSettings.svelte`), and remove the ↑/↓ buttons and the three buttons of the Page tab. Verify with "Delete from the list", "Move in the menu", "Rename" and "Keyboard" in an e2e spec `page-menu.spec.ts`, each action undone once, and `pages.spec.ts` updated.
- [x] 5.3 Add the menu's texts to both catalogues and update the README's "Editing" section. Verify with the type check, the untranslated-text test, and reading the section.

## 6. Wording and finish

- [x] 6.1 Change the business-block warning in `packages/site/src/validate/domain.ts` and the block picker's descriptions (both catalogues) to name the business settings (decision 8). Verify with the site package's tests updated and passing, and the block illustration test.
- [x] 6.2 Update the roadmap (admin redesign step 2 done; the Pages tab's page actions as a later idea). Verify by reading it.
- [ ] 6.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the whole e2e suite locally, then push and check CI. Verify that all pass.
- [ ] 6.4 Manual check by the owner: open every tab on a project with two languages, edit the settings and save, use the "⋯" menu on pages and links, and open the Settings tab from a problem in the editor. Record the outcome and any changes in design.md.
