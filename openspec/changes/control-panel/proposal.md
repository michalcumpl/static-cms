# Proposal

## Why

The strategy says the admin is a **business control panel**: owners maintain the facts of their
business, not pages (`docs/strategy.md`, principle 1). Today a project opens as six tabs shaped
like a tool: Overview, Pages, Languages, Publishing, History and Settings. The business's facts
sit in one long Settings tab next to the site's SEO settings. This change gives each website a
home organised the way an owner thinks: **Your website**, **Business**, **What you offer**,
**About you**, **Website**, **Publish**. Milestone B's later changes (`offer-and-about`, guided
setup, photos) build on this structure.

## What Changes

- **A dashboard replaces the Overview tab** at `/p/<project>/`:
  - **"Your website":** the site's name, its live state (● Live / Not published yet), its address
    and the Publish button;
  - **the problems of the saved site:** a count, each problem leading to where it's fixed;
  - **one card per section**, with a short summary and a link:
    - **Business:** the business name and its locations;
    - **What you offer:** the number of services and questions;
    - **About you:** the number of people and testimonials;
    - **Website:** pages, languages, the domain, and the design (colours, fonts, logo);
    - **Publish:** the last publish.

  Until `offer-and-about`, the What you offer and About you cards lead to the editor, on the
  first page that shows those items.
- **Section pages replace the other tabs**, under a section bar (Your website · Business ·
  Website · Publish):
  - **Business** (`/p/<project>/business`): the business settings that were on the Settings tab,
    with its explicit Save, Undo and Redo, and the conflict refusal.
  - **Website** (`/p/<project>/website`) and its subpages:
    - **Site and search engines:** the site settings that were on the Settings tab, saved the
      same way;
    - **Design:** a card showing the colours, fonts and logo, with "Change design" opening the
      editor's Design tab;
    - **Pages and menu** (`/website/pages`): the former Pages tab;
    - **Languages** (`/website/languages`): the former Languages tab;
    - **Domain** (`/website/domain`): the address and custom domain, moved out of the
      Publishing tab.
  - **Publish** (`/p/<project>/publish`): the Publish button, the publish history with "Make live
    again", the ZIP download, and **Versions** (`/publish/versions`), the former History tab.
- **Old addresses redirect** to their new places: `/settings`, `/pages`, `/languages`,
  `/publishing` and `/history`, keeping `?lang=` and `?focus=`. A settings field in `?focus=` goes
  to the section that now holds it.
- **The editor leads to the sections:**
  - problems about the business, and "Edit business details" on a business block, open the
    Business section;
  - problems about the site's settings open the Website section;
  - the editor's left column links back to the dashboard.
- **Languages.** Business and Website keep the language choice (`?lang=`) that the tabs had. The
  shared fields stay read-only outside the primary language.

### Non-goals

- **Forms for services, FAQs, team and testimonials:** `offer-and-about`, the next change.
- **Design in the panel:** it stays in the editor until templates (milestone C) make design a
  choice of template.
- **A photos page:** it comes with image cropping.
- **Changes to the project list, the editor's canvas, publishing behaviour or version history
  behaviour.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-page`: the tabs become a dashboard and section pages. The Overview, Pages, Languages,
  Publishing and History tab requirements are replaced by Dashboard, Section navigation, Pages
  and menu, Languages page, Domain page, Publish section and Versions page. Site and business
  settings move to the Website and Business sections, and old addresses redirect.
- `site-editing`: the problems panel, "Edit business details" and the Design tab outside the
  primary language point to the new sections instead of the Settings tab.
- `languages`: a scenario mentions the English Settings tab, which is now the Business section.

## Impact

- **`apps/admin/src/routes/p/[project]/(tabs)/`** becomes `(panel)/`, with:
  - the dashboard (`+page`);
  - `business/`;
  - `website/` with `pages/`, `languages/` and `domain/`;
  - `publish/` with `versions/` and `versions/[version]/`;
  - redirect routes for the old addresses.
- **Components:**
  - `SettingsScreen.svelte` split into a reusable section screen (session, Save bar, guard,
    problems) used by Business and by Website's site settings;
  - the layout's tabs replaced by the section bar;
  - Publishing's domain part extracted into the Domain page.
- **`lib/project-paths.ts`:** new paths (`business`, `website`, `websitePages`,
  `websiteLanguages`, `domain`, `publish`, `versions`), with the old names removed.
- **`lib/editor/locate.ts`** (`settingsTarget` tabs), the editor's left column, and the
  problems panel.
- **i18n catalogues**, unit tests and e2e specs (`project-tabs.spec.ts`, `settings.spec.ts`,
  `publishing.spec.ts`, `history.spec.ts`, `languages.spec.ts`, …) move to the new addresses.
- **`docs/roadmap.md`:** milestone B's table splits into `control-panel` and `offer-and-about`.
- No data, format or API changes.
