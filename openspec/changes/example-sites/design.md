# Design

## Context

See proposal.md for the motivation. The current state:

- **Documents are flat node maps** (`{ document_id, nodes }`, format 8): every text is a
  `{ content, marks, annotations }` value, every list a `node_array`, every node needs an ID. The
  fixtures (`packages/model/fixtures/*.json`) are written by hand; the demo has 46 nodes for two
  pages. Each example site will have several hundred.
- **Creating a project:** `createProject(db, workspaceId, name, document, createdBy)` in
  `site-documents.ts` stores the document in `DEFAULT_LANG` ("cs"); `projects.primary_lang`
  defaults to "cs". `addLanguage` copies the primary document into another language; `saveSite`
  saves a language, and for languages other than the primary takes the shared fields (business
  data, collection structure, images, theme) from the primary (`applySharedFields`).
- **Images:** `uploadImage(db, projectId, userId, { name, bytes })` (`media.ts`) checks, strips,
  stores variants and returns the media key (`<name>-<hash>`), width and height. Documents point
  at images by key in `image.src`.
- **Validation:** `validateSite` in `@webmio/model` returns problems with severities.
- **Admin commands:** `scripts/admin.ts` (`pnpm admin create-user`, `media-cleanup`), using the
  app's database and media settings.
- **Deleting:** `deleteProject` and `purgeProject` (`project-deletion.ts`) remove a project with
  its rows and files.

## Goals / Non-Goals

**Goals:**
- A repeatable path from content to a stored project, with the site's own validation as the
  gate.
- Nothing of the businesses in the repository.
- What we learn while migrating becomes reusable: the builder, the layouts, the mapping rules.

**Non-Goals:**
- Publishing the examples, or loading sites from the admin's interface.
- Fetching or parsing other websites in code (that is `site-import`). The examples' content is
  read from the live sites by hand and written with the builder.
- New block types or theme features: the examples use what exists, and the gaps are noted for
  the templates.

## Decisions

### 1. A site builder in `@webmio/model`

`packages/model/src/builder.ts`, exported from the package:

```ts
const site = siteBuilder({ name: "Aniděti", lang: "cs" });
site.theme({ preset: "…", color_primary: "#…" });
site.business({ name, type: "EducationalOrganization", social: ["https://…"] });
site.location({ name: "Atelier Hanspaulka", street, city, postal_code, phone, email,
  hours: { mon: [["14:00", "18:00"]] } });
const courses = site.services([{ name, description: "…", price: "4 500 Kč / pololetí" }]);
site.page({ title: "Kroužky", slug: "krouzky", menu: true }, [
  hero({ heading, text, image: "dilna.jpg" }),
  servicesBlock({ heading: "Nabídka", show: "all" }),
  callToAction({ heading, actions: [pageLink("kontakt", "Napište nám")] }),
]);
const doc = site.build();
```

- **Texts** accept a small inline syntax: `**bold**`, `*italic*`, `[words](https://…)` and
  `[words](page:slug)`, turned into marks; paragraphs and lists from blank lines and `- `.
- **IDs are deterministic** (`service_1`, `page_kontakt`, …, in build order), and pages get
  `translation_key` from their ID. Building the same site with another language's texts gives
  the same IDs, so a second language pairs with the first: same items, same pages.
- **Images** are file names in `image.src` until loaded (decision 2); `alt` and `decorative` are
  given with them.
- `build()` returns the document; the builder doesn't validate, the caller does.

*Alternative considered:* writing JSON as the fixtures do. Rejected for hundreds of nodes, and
because the templates' test sites and the importer need the same thing.

### 2. The folder and `load-site`

```
<folder>/
  project.json   { "name": "Mareš Partners", "primaryLang": "cs", "languages": { "cs": "cs.json", "en": "en.json" } }
  cs.json, en.json   site documents; image.src names a file of images/
  images/        the image files
```

`server/load-site.ts` exports `loadSite(db, folder, workspaceId, userId)`:
1. **Check before creating:** the workspace exists; every language is offered; every document
   parses; every named image file exists; each document has no validation errors (images still
   named by file, which validation accepts as `src`). All problems are collected and returned.
2. **Create** the project with the primary document (`createProject` with `primaryLang`).
3. **Upload** each distinct image once (`uploadImage`), and rewrite every document's
   `image.src`, `width` and `height` from the results.
4. **Store** the primary with `saveSite`, then each other language with `addLanguage` and
   `saveSite(…, lang)`, so the shared fields follow the primary as for any language.
5. **On any failure after step 2,** the project is deleted and removed (`deleteProject`,
   `purgeProject`), so no rows or files remain, and the problem is returned.

`scripts/admin.ts` gains `load-site <folder> --workspace <id>`, printing the problems (exit 1)
or the project's panel address. The owner of the workspace is the user recorded as creator.

### 3. `createProject` takes a primary language

`createProject(db, workspaceId, name, document, createdBy, primaryLang = DEFAULT_LANG)` writes
`projects.primary_lang` and the document's language. Only `loadSite` passes another language;
the admin's "New project" stays Czech.

### 4. The examples live in `apps/admin/data/examples/`

```
data/examples/
  anideti/        build.ts, images/, project.json, cs.json
  mares-partners/ build.ts, images/, project.json, cs.json, en.json
  mortgage-specialist/ build.ts, images/, project.json, en.json
  fond10x/        build.ts, images/, project.json, cs.json, en.json
  roubenka-svitavka/ build.ts, images/, project.json, cs.json
```

`build.ts` imports the builder, holds the texts read from the live site, and writes the
documents and `project.json`; images are downloaded from the live sites into `images/`. All of
it is ignored by git (`apps/admin/data/` already is). Running `build.ts` and then `load-site`
recreates an example; deleting the project first, with Delete website, replaces it.

How each site maps:

| Site | Primary | Pages (layouts) | Collections and business |
| --- | --- | --- | --- |
| Aniděti | cs | Úvod, O nás, Lektorky, Jak pracujeme, Kroužky, Filmy, Kontakt | services: courses with prices; team: the two teachers; locations: Atelier Hanspaulka, ZŠ Dlouhý Lán |
| Mareš Partners | cs (+ en) | Firma, Expertíza, Kariéra, Kontakt | services: the eight practice areas; logos: the three awards |
| Mortgage Specialist | en | Home, Services, About, Contact | services; testimonials: the reviews; a call to action for the free consultation |
| Fond 10X | cs (+ en) | Úvod, Jak investujeme, Tým, Pro investory, Kontakt | team: the founder, the committee and advisers; faqs; logos: portfolio companies |
| Roubenka Svitávka | cs | Úvod, Ubytování, Dostupnost, Kontakt | services: the cottage and the chalets with capacities; a gallery; the booking service as a call to action's link |

The exact pages follow what each site has; the table is the plan, and the notes (decision 5)
record where it changed. What the examples need and we lack (key figures, documents to
download, a booking embed, a newsletter signup) is written with existing blocks (a text block
for figures, links for documents and booking) and listed in `docs/layouts.md` as gaps for the
templates.

### 5. Committed notes: layouts and mapping rules

- **`docs/layouts.md`:** each page recipe the examples use, as an ordered list of blocks with
  their settings and which collections they read (for example "Courses: hero, services (all),
  FAQ, call to action"), marked shared or template-specific. No content. Input for
  `template-system`.
- **`docs/import-mapping.md`:** for each kind of source content, where it went (navigation →
  pages and menu; a list of items with prices → services; staff photos with names and roles →
  team; reviews → testimonials; award logos → a logos block; contact details → the business's
  locations), with the signals that recognise it. Input for `site-import` v1; the parts that
  need AI are marked.

Both name the sites only by their public addresses.

### 6. Changes made while building

- **Two fixes the examples found:**
  - long email addresses widened team cards; `.person` in the site stylesheet now wraps long
    words (`min-width: 0; overflow-wrap: anywhere`), with the stylesheet snapshot updated;
  - a logo that shows the name made the header repeat it; `site.logo(image, { showName: false })`
    sets `header_show_name`.
- **The builder lists all seven days, pads times to `HH:MM` and strips spaces from phones,** which
  validation requires.
- **`loadSite` checks documents with stand-in image sizes** (sizes come with the upload), and
  writes the uploaded document into the project's first version instead of saving a second, so
  version history doesn't start with broken images.
- **Local helpers next to the examples** (ignored by git): `validate.ts` checks a built folder,
  `check.ts` validates and renders a loaded project, `shots.ts` screenshots its preview, and
  `remove.ts` removes it (Delete website, Delete now) so an example can be rebuilt.
- **An empty database re-imports the old working copy:** with no projects, the server's startup
  imported `data/site.json` as "Default" into a new workspace; both were removed again.
- **Exhibitions** waits for its example site.

## Risks / Trade-offs

- **[The builder drifts from the schema]** → it is typed against `@webmio/model`'s node types,
  and its tests build a site with every block type and require `validateSite` to report no
  errors.
- **[A half-loaded project after a crash]** (power loss between upload and save) → `loadSite`
  cleans up on failures it sees; for a crash, Delete website removes the leftover project.
- **[Copyrighted content on our disk]** → it stays local, isn't published by this change, and
  is used as the businesses' presentation examples with the owner's decision recorded in the
  strategy.
- **[The sites change]** → the examples are snapshots; `build.ts` is rerun by hand when wanted.

## Migration Plan

Code only for the repository. The examples are created in the development database by running
the command; nothing changes for existing projects.
