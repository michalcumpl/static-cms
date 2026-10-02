# Tasks

## 1. Tokens, font and components

- [x] 1.1 Add `@fontsource-variable/dm-sans` to the pnpm catalog and `apps/admin`, and `src/lib/ui/tokens.css` with the `--ui-*` tokens, `body` and `:focus-visible` only (design.md decisions 1 and 3). Verify with a unit test that every text/background token pair the components use reaches 4.5:1 (`contrastRatio`), including "Readable buttons".
- [x] 1.2 Add the components in `src/lib/ui/` (decision 2): Button, TextField, Select, Checkbox, Switch, Badge, Card, Tabs, Dialog, Notice, EmptyState, PageHeader, Icon, and the menu-button popover moved from the editor. Verify with unit tests that render each with `svelte/server`'s `render()` (the suite runs in Node, without a DOM) and check its markup: labels and accessible names, `aria-*` states, the badge's dot and word ("Status in words"), button kinds sharing one class ("One kind of button"); focus rings and touch sizes are checked in group 3's e2e tests.

## 2. Language plumbing

- [x] 2.1 Add `src/lib/i18n/` (decision 5): typed `en` and `cs` catalogues starting with `common` and `shell`, `t()` with parameters and plurals, `formatDate`/`formatNumber`, `setI18n`/`getI18n` and the server-side `i18n()`. Verify with unit tests for parameters, "Plural forms" (1/3/5 websites in both languages) and "Dates", and a deliberately incomplete catalogue failing `tsc` (as a type test).
- [x] 2.2 Resolve the locale in `hooks.server.ts`, add `users.ui_language` (drizzle migration), `POST /api/ui-language`, and `%lang%` in `app.html` (decision 6). Verify with unit tests for the resolution order (account, cookie, `Accept-Language`, English) and the endpoint (cookie set, account updated when signed in, refused cross-site), and that `handle` writes `<html lang>`.
- [x] 2.3 Add the markup guard test (decision 8), with its allow-list and `data-i18n-ignore`, run it against the current code to list every string to move, and keep the list as the checklist for group 4.

## 3. App shell

- [x] 3.1 Add the root `+layout.server.ts`/`+layout.svelte` with the AppBar: mark, workspace switcher, language switch and account menu with Sign out; signed-out variant; compact variant in the editor layout (decision 4). Verify with e2e tests for "Switch workspace", "Sign out from the account menu" and "Editor keeps its space", and that "The canvas keeps the site's look" (computed font and colour of a canvas heading in the editor).

- [x] 3.2 Move the language choice out of the top bar (decision 4, after review): signed in, an "Interface language" group in the account menu (Čeština / English, current one checked); on the sign-in and invitation pages, "Čeština · English" below the form. Verify with e2e tests for "Language in the account menu" and the existing switching tests updated, and that the bar has no CS/EN buttons.

## 4. Pages and editor in the new look, in both languages

Each task moves the area's text into the catalogues (en and cs), uses the components, and keeps the area's structure; the markup guard must pass for the area's files afterwards, and the existing unit and e2e tests for the area must still pass, adjusted only where an accessible name changed.

- [x] 4.1 Sign-in, sign-in link page and invitation pages (signed-out shell).
- [x] 4.2 Projects list, new project, members and hosting pages.
- [x] 4.3 Project page (including `LanguagesSection`), publishing page and `PublishButton`.
- [x] 4.4 History page and the version preview banner; dates through `formatDate`.
- [x] 4.5 Editor chrome: toolbar, status texts, left column (language switcher, pages sidebar), unsaved-changes prompt, the problems panel's own texts (not the messages).
- [x] 4.6 Editor settings: Page, Site, Business (with opening hours) and Theme tabs, shared-field notes.
- [x] 4.7 Editor panels and dialogs: block, button and image panels, link dialog, media library (including HEIC conversion messages), handles, handle menus and the block picker (names and descriptions).
- [x] 4.8 Server messages (decision 7): upload refusals, publishing and domain errors, invitation and membership errors, language API errors, translated with the request's locale. Verify with unit tests for one message per area in Czech.
- [x] 4.9 Emails (decision 7): sign-in in the account's or the request's language, invitation in the owner's. Verify with unit tests for "Czech sign-in email" and an English invitation from an English-speaking owner.

## 5. End to end and docs

- [x] 5.1 Add `e2e/interface-language.spec.ts` (Chromium with `locale: "cs-CZ"`): "Czech browser, first visit", switching to English and back, "The choice follows the person" (a second browser context), a Czech date in History, and Czech plurals on the projects page.
- [x] 5.2 Update the README (interface language, how a person switches it, how to add a message in both catalogues) and the roadmap (admin redesign step 1 done; problem messages' translation as a follow-up). Verify by reading both.
- [x] 5.3 Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and the e2e suite locally, then push and check CI. Verify that all pass.
- [ ] 5.4 Manual check by the owner: use the admin in Czech and English on a laptop and a phone, read the Czech texts for tone and mistakes, and record the outcome and any wording changes in design.md.
