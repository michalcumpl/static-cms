# Proposal

## Why

The admin has no visual design. Every page uses the browser's default styles, so it looks unfinished:
- the project list is a single bullet line;
- the project page is one long column of headings;
- signed-in pages don't share a header (the project page has none at all);
- buttons, inputs and status look different on every page.

The owners it's for are Czech, and the admin speaks only English.

Three more changes are planned on top of this one: project tabs, a projects dashboard and a public page. Each restructures screens. Doing the look, the shell and the translations first means each screen is rebuilt once, not three times.

The look was chosen with the owner from a comparison of six directions: **"B · Glacier"**. It's rounded and friendly, with pale blue-green pill buttons and deep petrol labels. The canvas is linked in design.md.

## What Changes

- **A design system for the admin:**
  - tokens: colours, type scale, spacing, radii, shadows and focus rings, all reaching WCAG AA;
  - shared components: buttons (primary, secondary, danger), text fields, selects, checkboxes, status badges, cards, tabs, dialogs, empty states, notices and page headers;
  - a self-hosted UI font (DM Sans) and a small icon set.

  The site canvas in the editor keeps the site's own theme, untouched.
- **An app shell on every signed-in page:**
  - a top bar with the product mark ("Static CMS");
  - a switcher for people in several workspaces;
  - the interface language (Čeština / English) in the account menu, and below the sign-in and invitation forms;
  - an account menu with the email address and Sign out.

  The editor keeps its full-height layout, with the same top bar in a compact form.
- **Czech and English.** All text in the admin app is in a message catalogue per language: pages, editor chrome and panels, dialogs, messages from the server, and the sign-in and invitation emails.
  - The language follows a signed-in person's choice, stored on their account. Before signing in it follows the switch (remembered in a cookie), then the browser's language, then English.
  - Dates, times and numbers use the chosen language's format.
- **Every existing page restyled** with the system and the shell, keeping its structure and content: projects, project, editor, publishing, history, members, hosting, new project, sign-in and invitations. Project tabs, the dashboard and the public page are later changes.
- **Out of scope:** the site's validation messages (the problems panel) stay in English for now. They are written in `@static-cms/site` and need message codes there, which is a separate change.

## Capabilities

### New Capabilities

- `admin-interface`: the admin's look and its language, covering:
  - the design system's tokens and components, and their accessibility;
  - the app shell;
  - the interface language: choice, storage, fallback, formats, completeness;
  - emails in the recipient's language.

### Modified Capabilities

None. Existing requirements quote English interface text, which stays as it is in English. Translations add a Czech version without changing behaviour.

## Impact

- **`apps/admin`:**
  - `src/lib/ui/`: tokens as CSS custom properties in one global stylesheet, Svelte components and icons;
  - `src/lib/i18n/`: English and Czech catalogues, `t()`, plural and date helpers;
  - a root `+layout` with the shell;
  - a `users.ui_language` column with a migration;
  - a language endpoint;
  - every `.svelte` page and editor panel changed to use the components and `t()`;
  - server-side messages and emails translated;
  - e2e tests that select by visible text keep using English, which stays the default for the test browser.
- **New dependency:** `@fontsource-variable/dm-sans` (OFL), like the site fonts. Icons are inline SVG, with no icon library.
- **`packages/site`:** unchanged.
- **Docs:** README (the interface language, adding a string) and the roadmap.
