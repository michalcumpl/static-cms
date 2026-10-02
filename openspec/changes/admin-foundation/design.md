# Design

## Context

See proposal.md for the motivation. Decisions made with the owner before drafting:
- **The look is "B · Glacier":** DM Sans, rounded (12/18 px, pill buttons and tabs), pale blue-green buttons with deep petrol labels. It was chosen from six directions on the canvas https://claude.ai/artifact/GNqpdt8QsqCufBdEAaPAv5 (A Clear, B Friendly, C Bold; B Sky, B Glacier, B Aqua).
- **The interface is Czech and English, with a switch.**
- **The product name stays "Static CMS"** for now.
- **The site's validation messages stay English** in this change; a follow-up translates them in `@static-cms/site`.

The current state:
- **No shared layout or styles.** `apps/admin` has no root `+layout.svelte`, and `app.html` hard-codes `<html lang="en">`. Each page carries its own `<style>`; most use browser defaults. 65 `.svelte` files, 18 of them editor panels and canvas node components.
- **Text is written inline** in markup, in server messages (about 30 user-facing ones) and in emails. The sign-in email is already bilingual: "Přihlášení / Sign in".
- **The editor route** (`/p/<project>/edit/`) has `ssr = false` and a full-height grid (left column, workspace, settings column). The canvas is styled by `canvasCss()`, scoped to `.site-canvas`. It sets its own fonts and colours and relies on the site's custom properties (`--color-primary`, `--font-body`, …) on `.site-canvas`.
- **People:** the `users` table holds `id`, `email` and `createdAt`. `event.locals.user` is set in `hooks.server.ts`. Membership in several workspaces exists (`/w/<workspace>/…`).
- **Dates** are formatted with hard-coded `Intl.DateTimeFormat("en-GB", …)` in several pages.
- **The e2e suite** runs Chromium with its default `en-US` locale, and its tests select elements by English text.

## Goals / Non-Goals

**Goals:**
- One look, defined once: tokens plus a handful of components that every page uses.
- The admin's styles never reach the site canvas, and the canvas's never reach the admin.
- Translations are a build-time guarantee, not a hope: a missing message or stray English text fails CI.
- No translation framework or runtime dependency; the needs are small (two languages, plurals, dates).

**Non-Goals:**
- Restructuring pages: tabs, dashboard cards and the public page are later changes.
- Dark mode.
- Translating `@static-cms/site` validation messages and site-rendering strings (the site's own language already covers those).
- A third language.

## Decisions

### 1. Tokens as `--ui-*` custom properties, with no element-level global styles

`src/lib/ui/tokens.css` defines the tokens on `:root` with a `--ui-` prefix (`--ui-ground`, `--ui-ink`, `--ui-button`, `--ui-button-label`, `--ui-link`, `--ui-radius-field`, `--ui-radius-card`, the type scale, spacing, focus ring). It is imported once by the root layout.

Beyond the tokens it styles only `body` (ground, font, ink) and `:focus-visible`. It sets **no** rules on `button`, `input`, `a`, `h1` or other elements. Those belong to components, so the site canvas, which renders real headings, links and buttons, is never restyled by the admin.

The prefix avoids colliding with the site theme's `--color-*` and `--font-*` properties, which live on `.site-canvas`.

*Alternative:* a CSS reset plus element styles. That's simpler for pages, but it would leak into the canvas, which has to look exactly like the published site.

### 2. Components in `src/lib/ui/`

Plain Svelte 5 components, each with its own scoped styles and taking the tokens through `var(--ui-…)`:
- `Button` (`kind`: primary, secondary, danger; `href` renders a link styled as a button; optional icon);
- `TextField`, `Select`, `Checkbox`, `Switch`;
- `Badge` (`status`: success, attention, problem, neutral; always with a dot);
- `Card`, `Tabs`, `Dialog` (wrapping `<dialog>`), `Notice`, `EmptyState`;
- `PageHeader` (title, breadcrumb, actions slot);
- `Icon` (a map of about 20 inline stroke SVG paths: plus, pencil, eye, globe, upload, chevron, user, log-out, check, alert, trash, history, settings, languages, image, external link, …).

The editor's toolbar and panels use the same components, in a compact size variant (`size="sm"`: 32 px controls on pointer devices, 44 px on coarse pointers).

*Why not a component library:* the set is small and the look specific, and the project avoids dependencies for UI (the editor's popovers and menus are hand-written already).

### 3. The font: `@fontsource-variable/dm-sans`

It's imported in the root layout, so Vite serves the WOFF2 files from the admin itself, with no Google Fonts request. It's OFL like the site fonts, and pinned in the pnpm catalog.

### 4. The app shell in a root `+layout.svelte`

There's a new `src/routes/+layout.server.ts` and `+layout.svelte`:
- `load` returns `{ user, workspaces, locale }`: the person's workspaces for the switcher, and the resolved locale (decision 6).
- The layout renders `<AppBar>`, then `children`.
  - **Signed-in pages:** the mark, the workspace switcher (a menu of the person's workspaces; the current one comes from the route's `workspace` or project's workspace) and the account menu, which holds the interface language (Čeština / English, the current one checked) above Sign out. The language has no control of its own in the bar: people choose it once, and a permanent switch is clutter (changed after review by the owner).
  - **Signed-out pages:** the mark only. The sign-in and invitation panels end with "Čeština · English" links, for a browser that sends the wrong language.
- **Editor:** `/p/<project>/edit/` has its own layout. It passes `compact` to the bar (44 px tall), and the editor grid's height becomes `calc(100vh - var(--ui-bar-height))`.

Account and workspace menus reuse the menu-button behaviour of `PopoverMenu.svelte`, generalised in `src/lib/ui/`: anchor positioning, arrow keys, Escape.

### 5. Messages: typed catalogues and a tiny `t()`

Files under `src/lib/i18n/`:
- `en.ts` exports `const en = { … } as const`: nested by area (`common`, `shell`, `signin`, `projects`, `project`, `publishing`, `history`, `members`, `hosting`, `editor.toolbar`, `editor.page`, `editor.site`, `editor.business`, `editor.theme`, `editor.handles`, `editor.picker`, `editor.problems`, `errors`, `email`, …).
- `cs.ts` exports `const cs: Messages = { … }`, where `Messages` is derived from `en`'s shape with string leaves. A key missing in Czech, or present only in Czech, is a TypeScript error. That covers the spec's "Complete translations", through `pnpm typecheck` in CI.
- **Message values:**
  - a string with `{name}` placeholders: `"Edited in {language}"`;
  - or, for counts, a plural object `{ one, few, other }` (Czech) or `{ one, other }` (English), chosen with `Intl.PluralRules`.
- **`t(key, params?)`:** keys are typed dotted paths (`t("projects.count", { count: 3 })`), so a typo is a type error.
- **Helpers:** `formatDate(date, style)` and `formatNumber(n)` use `Intl` with the locale, replacing the hard-coded `"en-GB"` formatters.
- **Client side,** `setI18n(locale)` in the root layout puts `{ locale, t, formatDate }` into Svelte context, and `getI18n()` reads it in components. **Server side,** `i18n(locale)` gives the same object, for server messages and emails.

*Alternative:* Paraglide or another i18n library. That's capable, but a compiler step and a dependency for two languages and about 600 strings; the typed object gives the same compile-time guarantee.

### 6. Choosing and storing the language

In `hooks.server.ts`, `event.locals.locale` is resolved per request:
1. the signed-in user's `ui_language`;
2. the `ui_lang` cookie;
3. the first `cs` or `en` in `Accept-Language`;
4. `en`.

- `transformPageChunk` replaces a `%lang%` placeholder in `app.html`, so `<html lang>` is right before hydration.
- `POST /api/ui-language { language }` sets the cookie (1 year, `SameSite=Lax`) and, when signed in, `users.ui_language`. The account menu and the sign-in links call it, then `invalidateAll()`, so the page re-renders in the new language without a reload. The CSRF check for API writes in `hooks.server.ts` already covers it.
- **Migration:** add a nullable `ui_language` text column to `users`, generated by drizzle-kit. `null` means "not chosen yet": fall back to the cookie and the browser.

### 7. Server messages and emails

- **Messages the server sends to the browser** (refused uploads, publish failures, invitation errors) become keys plus parameters at the source, translated with `i18n(event.locals.locale)` before responding. JSON error bodies keep their `message` field, now in the person's language, so the client code doesn't change. Codes stay as they are, for tests.
- **Sign-in email:** the account's `ui_language`, else the request's locale.
- **Invitation email:** the inviting owner's locale.
- The subject lines are no longer two languages in one.

### 8. Guarding against stray text: a markup test

A Vitest test parses every `src/**/*.svelte` with `svelte/compiler`'s `parse`, walks the template, and fails on:
- **text nodes** containing letters, outside `{…}` expressions;
- **static values** of `aria-label`, `title`, `placeholder`, `alt` and `label`.

A short allow-list covers "Static CMS", "CS", "EN" and symbols. A similar check over `src/lib/server` and `src/routes/**/+server.ts` for `message: "…"` literals catches server messages.

This is what makes "no interface text outside the catalogues" checkable. Canvas node components (`lib/editor/nodes/`) render site content and site strings. They're checked too, but most of their text comes from the document.

### 9. Restyling the existing pages

Each page moves to the shell and the components, keeping its sections and order:
- projects, project, publishing, history (and version preview banner), members, hosting, new project, sign-in, sign-in link page and invitation;
- the editor: toolbar, left column, settings tabs (Page, Site, Business, Theme), panels, dialogs (link, media library, remove), handles, menus and picker.

Section headings become `Card`s with titles, link lists become buttons where they are actions, and status lines become `Badge`s.

### 10. Tests and the e2e suite

- **English stays the default for the tests:** Chromium sends `en-US` and test accounts have `ui_language = null`, so existing e2e tests keep selecting by English text. Where restyling changes an accessible name, for example "Edit" becoming a button with an icon and the same name, the test is adjusted.
- **A new Czech spec** (`e2e/interface-language.spec.ts`, `locale: "cs-CZ"`) covers:
  - "Czech browser, first visit";
  - switching to English and back;
  - the choice following the person to a new browser context;
  - a Czech date in History;
  - Czech plurals on the projects page.
- **Unit tests** cover:
  - the language resolution order;
  - `t()` with parameters and plurals in both languages;
  - `formatDate`;
  - the markup guard (decision 8);
  - the sign-in email's language.
- **A contrast test** checks each token pair the components use against 4.5:1, reusing `contrastRatio` from `@static-cms/site`.

## Risks / Trade-offs

- **[Large diff touching every page]** → Grouped by area in the tasks: foundation, then shell, then i18n plumbing, then page by page. Each group leaves the app working and the suites green.
- **[Czech translations' quality]** → Written for owners (informal "vy", short labels), and reviewed by the owner in the manual check task. Strings with a different word order use named parameters, never concatenation.
- **[Admin styles leaking into the canvas, or the reverse]** → No element-level global rules (decision 1). An e2e check compares a canvas heading's computed font and colour with the site theme, in the editor.
- **[The markup guard's false positives]** → A narrow allow-list, plus a `data-i18n-ignore` attribute for the rare legitimate literal, such as an example code.
- **[A `%lang%` placeholder in `app.html` breaks without the hook]** → The hook always runs for page requests; a unit test of `handle` asserts the replacement.

## Migration Plan

- The database migration (`users.ui_language`) runs on start, as earlier migrations do. Rolling back to an older build ignores the column.
- Existing accounts have no language chosen, so they get their browser's language. Czech owners see Czech automatically after the deploy. A note in the README says how to switch.
- No document format change.
