# Design

## Context

See proposal.md for the motivation. Decisions from the exploration with the owner (2026-10-06):

- **Shape:** panel first, tools behind. The panel replaces Overview and Settings; Pages,
  Languages and History move one level down; Publishing becomes Publish.
- **Pages:** a dashboard plus section pages, not one long page.
- **Design:** stays in the editor until templates arrive.
- **Split:** the forms for services, FAQs, team and testimonials are the next change,
  `offer-and-about`, and photos come with image cropping.

The current state:

- **`apps/admin/src/routes/p/[project]/(tabs)/`** holds the six tabs:
  - `+layout.svelte` with `Tabs`, the language select, and the header with Preview and Open
    editor;
  - `+page.svelte` (Overview), `pages/`, `languages/`, `publishing/`, `history/` (with
    `[version]/`) and `settings/`.
- **`settings/+page.svelte`** mounts `SettingsScreen.svelte`, which:
  - builds an `EditorState` from the saved document without mounting Svedit;
  - shows `SiteSettings` and `BusinessSettings`;
  - provides the Save, Undo and Redo bar, the unsaved-changes guard, the conflict refusal, the
    problems list, and `?focus=` through `settingsTarget` and `settingsFieldId` in
    `locate.ts`.
- **`publishing/+page.svelte`** shows the Publish button, the address and domain (with DNS
  records), the publish history and `DownloadZip`.
- **`lib/project-paths.ts`** names every URL (`overview`, `pagesTab`, `languagesTab`,
  `settings`, `publishing`, `history`, `version`). The editor's left column links to `settings`.
  `openSettings` (editor) navigates there, with `?focus=` and the save-first question.

## Goals / Non-Goals

**Goals:**
- Every function of the six tabs is still there, in its new place, with its tests moved, not
  rewritten.
- The Settings tab's save machinery is reused for two sections, not duplicated.
- No behaviour changes inside the moved screens.

**Non-Goals:**
- Forms for the collections, design in the panel, a photos page, a new project list.

## Decisions

### 1. Routes: a `(panel)` group with nested sections

```
/p/<id>/                    dashboard              (panel)/+page
/p/<id>/business            Business               (panel)/business/+page
/p/<id>/website             Website main           (panel)/website/+page
/p/<id>/website/pages       Pages and menu         (panel)/website/pages/+page
/p/<id>/website/languages   Languages              (panel)/website/languages/+page
/p/<id>/website/domain      Domain                 (panel)/website/domain/+page
/p/<id>/publish             Publish                (panel)/publish/+page
/p/<id>/publish/versions    Versions               (panel)/publish/versions/+page
/p/<id>/publish/versions/<v>  version preview      (panel)/publish/versions/[version]/
```

- `(tabs)/` is renamed `(panel)/` with `git mv`, so each moved page keeps its history.
- The layout keeps the header and the membership check. `Tabs` is replaced by a section bar
  (Overview · Business · Website · Publish), with a second row of subpage links on Website
  and Publish.
- What you offer and About you get no bar entries until `offer-and-about` gives them pages.
  Their dashboard cards lead to the editor.

### 2. A reusable section screen

`SettingsScreen.svelte` becomes `SectionScreen.svelte`. It keeps the `EditorState`, the Save
bar, the guard, the conflict handling, the problems and `?focus=`, and takes the section's form
and which problems belong to it:
- **Business:** problems whose `settingsTarget` tab is `business`.
- **Website:** problems whose tab is `site`.

Business renders `BusinessSettings`. The Website main page renders `SiteSettings` inside it, with
the Design card and the subpage links outside the Save bar's scope, since they save nothing.
Both sections load the document the same way the Settings tab did (`ssr = false`, one language).

### 3. The dashboard's data comes from one server load

`(panel)/+page.server.ts` returns, for the primary language:
- the publishing status, which the Overview already loaded;
- the problems of the saved document;
- the summaries the cards need: the business name, locations, the counts of services, FAQ items,
  people, testimonials and pages, the languages, the domain, the theme's four colours and two
  font IDs, the logo's thumbnail, and the first page with a services/faq or team/testimonials
  block.

These come from the saved document through `@webmio/model` (`blockItems` isn't needed: counts
are collection sizes). Font names come from `FONTS`.

### 4. Problems lead to the right place

`settingsTarget` keeps its tabs (`page`, `site`, `business`, `theme`):
- `site` maps to the Website section;
- `business` maps to the Business section.

A new `problemHref(paths, target, nodeId)` builds the dashboard's links:
- a settings field gets the section with `?focus=`;
- anything else gets the editor at the node, on the page that holds it (`locate.ts` already
  finds it).

The editor's `openSettings` takes the target and goes to the right section.

### 5. Paths and redirects

`project-paths.ts` replaces `overview`, `pagesTab`, `languagesTab`, `settings`, `publishing`,
`history` and `version` with `dashboard`, `business`, `website`, `websitePages`,
`websiteLanguages`, `domain`, `publish`, `versions` and `version`. The old routes become small
`+server.ts` handlers that return `308` redirects with the query kept. `/settings` reads
`?focus=`: `site-settings-*` goes to Website, anything else to Business.

### 6. Domain moves out of Publishing

The address and domain part of `publishing/+page.svelte` (state, form, DNS records, check)
becomes `DomainPanel.svelte`, used by the Domain page. The Publish page keeps the Publish
button, the publish history, "Make live again" and the ZIP download, with links to Domain and
Versions.

### 7. Design card and "Change design"

The card renders the four colours as swatches and the fonts by catalogue name, from the
dashboard's and Website page's loads. "Change design" links to `edit()` with `?tab=theme`, which
the editor already accepts.

### 8. Changes made while building

- **Path names:** the page paths are `publishPage`, `domainPage` and `versionsPage`, because
  `publish`, `domain` and `versions` already name API endpoints in `project-paths.ts`.
- **Section pages render on the server:** Business and Website don't set `ssr = false`. The
  server renders the frame, so the project's access check answers "not found" to non-members
  (the Settings tab returned an empty 200 page to them). The section screen itself appears in the
  browser only.
- **The editor opens at a problem:** `?problem=<node>&property=<prop>` makes the editor's
  problems panel show that problem when it opens. This is how dashboard links lead "to the editor
  at the node".
- **The language survives detours:** panel links carry `?lang=`, so going through Publish, which
  shows no language, keeps it.
- **"Overview", not "Your website":** "Your website" next to "Website" in the section bar read
  as the same thing twice.
- **The cards in two stacks:** Business, What you offer and About you on the left; Website and
  Publish on the right. In grid rows, the tall Website card (with the design) left gaps.
- **Tests:** the settings scenarios live in `e2e/sections.spec.ts`. `business.spec.ts` already
  holds the editor's business-block tests.

## Risks / Trade-offs

- **[Many e2e specs use the old tab addresses]** → the redirects keep old links working, but
  the specs move to the new paths (via `projectPaths`), so they test the new structure. The
  redirects get their own small spec.
- **[Two sections editing one language's document at once in two windows]** → each section
  saves the whole document like the Settings tab did, with the same conflict refusal, so
  nothing is overwritten silently.
- **[An empty-looking panel before `offer-and-about`]** → the two cards are on the dashboard
  from the start, with counts, and lead to where those items are edited today.

## Migration Plan

Code only. Old addresses redirect permanently. No data changes.
