# Design

## Context

See proposal.md for the motivation. The current state:

- **`SectionScreen.svelte`** (control-panel decision 2) edits one language's saved document
  through an `EditorState`, without mounting Svedit. It shows `BusinessSettings` or
  `SiteSettings`, which use plain inputs, plus the Save, Undo and Redo bar, the unsaved-changes
  guard, the conflict refusal, the section's problems and `?focus=`. It already owns a
  `MediaLibrary` through `useMediaLibrary`.
- **`EditorState`** creates its `Session` with `createConfig()` (`editor/config.ts`), whose
  `node_components` map renders the canvas: `site` → `Site.svelte` (header, current page,
  footer), items → `ServiceItem`, `Person`, `Testimonial`, `FaqItem`. Svedit's config belongs to
  the session, so another map means another `createConfig`.
- **The editor layout** (`edit/+layout.svelte`) mounts `<Svedit path={[siteId]}>`, sets up a
  `KeyMapper` with the app's shortcuts, and builds the toolbar (bold, italic, link, unlink) from
  `session.commands`. `LinkDialog.svelte` asks for a link's target.
- **`editor/collections.ts`** has the item operations: `addItem`, `moveItem`, `duplicateItem`
  (each takes a `BlockView`; with `mode: "all"` they act on the collection only), `deleteItem`
  (collection-level, also removes the item from blocks that chose it) and `otherPagesShowing`.
- **Item schema:** `description`, `text` and `answer` allow marks and line breaks; the other
  texts are plain, one line. Portraits and photos are `image` nodes in the item's `image` array.
- **Problems:** `settingsTarget` (`locate.ts`) knows the tabs `page`, `site`, `business` and
  `theme`; `problemHref` sends everything else to the editor. The model's item messages end with
  "edit it in a services block on any page" (`validate/domain.ts`, `ITEM_HOMES`).

## Goals / Non-Goals

**Goals:**
- One editing machinery: the forms use the editor's session, operations and commands, so an
  item edited in the panel and on the canvas behaves the same, undo included.
- No duplicated save logic: the two new sections are more cases of `SectionScreen`.

**Non-Goals:**
- Choosing a block's items, or a block's mode, outside the editor.
- A preview of the site beside the forms.
- Drag and drop: move up and down are buttons, as the handles' menu offers them today.

## Decisions

### 1. Routes and paths

```
/p/<id>/offer    What you offer    (panel)/offer/+page    section "offer"
/p/<id>/about    About you         (panel)/about/+page    section "about"
```

Both pages load with `loadSection` and render `SectionScreen` in the browser only, like Business
and Website. `project-paths.ts` gains `offer` and `about` (neither name is taken). The section
bar becomes Overview · Business · What you offer · About you · Website · Publish; both keep
`?lang=` through `keep()`.

### 2. A form configuration for the session

`EditorState` takes an optional view, `"canvas"` (default) or `"form"`, and passes it to
`createConfig(view)`. The form's `node_components` map differs only where the canvas map
renders the site:
- `site` → `FormSite.svelte`, which renders the lists of the current section (read from a
  context the section screen sets): `NodeArrayProperty` of `[siteId, "services"]` and
  `[siteId, "faqs"]`, or of `team` and `testimonials`, each inside a `CollectionForm` frame;
- `service_item`, `faq_item`, `person`, `testimonial` → `FormService`, `FormQuestion`,
  `FormPerson`, `FormTestimonial`: a `fieldset` with a legend ("Service 2: Rohlíky"), a label per
  field and a `TextProperty` styled as an input;
- marks (`strong`, `emphasis`, `link`, `internal_link`) and `image` as on the canvas.

Inserters, commands and the schema are unchanged, so typing, marks, paste and undo are the
editor's. `SectionScreen` mounts `<Svedit path={[siteId]} editable>` for `offer` and `about`,
and keeps the plain-input forms for `business` and `site`.

*Alternative considered:* plain inputs over `TextValue`, as the Business section does. Rejected
at exploration (decision "a"): they lose marks and links, and would need their own undo.

### 3. Item actions on the whole collection

A small `collectionView(doc, siteId, collection)` in `collections.ts` builds a `BlockView` with
`mode: "all"` and every item, so the form calls `addItem`, `moveItem` and `duplicateItem` as the
canvas does for a block showing all items. Delete calls `deleteItem`. Each item's buttons live in
its fieldset's legend row (Move up, Move down, Duplicate, Delete); each list ends with its "Add"
button. The caret lands in the new item's first text, as `addItem` already selects it.

Delete asks first in a `Dialog` (never a browser `confirm`) when `pagesShowing` (decision 5)
counts pages showing the item: "Shown on 2 pages". Without pages it deletes at once; Undo is
there.

### 4. Formatting toolbar, shortcuts and links

The section bar of `offer` and `about` gains Bold, Italic, Link and Unlink, built from
`session.commands` like the editor's toolbar. The editor layout's `KeyMapper` setup moves into a
small `useEditorKeys(editor)` helper so both screens register the same shortcuts. `LinkDialog`
is reused as is.

### 5. Where a list is shown

`pagesShowing(doc, collection)` in `collections.ts` returns the pages with a block showing all
of the collection or chosen items of it, in page order. `otherPagesShowing` becomes a thin call
of the same walk. Links go to `paths.edit(pageId)` and pass through the unsaved-changes guard,
which asks to save first, as leaving any section does.

### 6. Item images

`FormPerson` and `FormTestimonial` use `ImageSetting` (the panel's image control, used for the
share image and favicon) with the item as owner and its `image` array as the slot, and its
description field. `site.ts`'s slot helpers learn the item slot. `SectionScreen`'s media library
serves it as it serves the share image.

### 7. Problems lead to items

`settingsTarget` returns `{ tab: "offer" | "about", nodeId, property }` for an item of a
collection, and `settingsFieldId` gives `offer-<itemId>-<property>`. Because those fields are
Svedit text, not inputs, focusing one sets the session's selection to a caret at the start of
`[siteId, collection, index, property]`, then scrolls it into view. `problemHref` sends item
problems to the section with `?focus=`; the dashboard's two cards link to `paths.offer` and
`paths.about`. Image problems (description, too many) focus the item's image control.

The model's `ITEM_HOMES` become "What you offer" and "About you"; the messages read "Service 3
needs a name; edit it in What you offer."

### 8. Other languages

`EditorState.sharedReadOnly` already tells the canvas the structure is fixed. The forms read it:
the item buttons and "Add" are disabled with the reason the canvas's handle menu gives
("Services are added and removed in Čeština"), and `ImageSetting` gets `locked`. A
`SharedNote`-style line links to the same section in the primary language.

### 9. Changes made while building

- **The spike (task 1.1) worked as planned.** Typing, marks already in the texts, Undo and Save
  behave as in the editor. What Svedit needed:
  - a `KeyMapper` in the `key_mapper` context, which Svedit requires. So `useEditorKeys` (decision
    4) was extracted in the spike, and the editor layout uses it already;
  - the components reach the `EditorState` through context: `provideEditor` sets it without
    making it the open editor, which only the editor layout is;
  - the editable attribute is on Svedit's own wrapper, so the form's titles and labels carry
    `contenteditable="false"`.
- **Svedit's insertion gaps** at the ends of a list reach outward to their containing block and
  covered the list's "Shown on" links. The item container is `position: relative`, which keeps
  them inside it.
- **The "Shown on" links open the editor with a full page load.** Navigating within the app from
  a list form to the editor on a page other than home threw in the canvas (a stale index path
  while the editor switches from home to that page); the same navigation from other panel pages
  doesn't. A full load avoids it, as `SharedNote`'s links already do.
- **Item groups are `div`s with `role="group"`**, not `fieldset`s, which don't behave inside
  editable text. Fields are `role="textbox"` and named by their labels.

- **Images use `FormImage`, not `ImageSetting`.** Portraits and photos follow the canvas's image
  rules: they start decorative (the name beside them describes them), with the decorative switch
  and the description as in the editor's image panel. `ImageSetting` has only a description.
  The control stops `beforeinput` from bubbling: Svedit takes any input inside its editable root
  as typing in its own text.
- **Item problems have their own `listTarget`** in `locate.ts`, next to `settingsTarget`, which
  stays as it was: the editor's problems panel uses `settingsTarget` and keeps selecting items on
  its canvas. `listTargetOfFieldId` reads a `?focus=` ID back, item IDs with dashes included.
- **`openAfterSaving`** (in `screen.svelte.ts`) is the save-first step `openSettings` had, now
  shared with the "Shown on" links.
- **The dashboard's page summary is gone:** `offerPageId` and `aboutPageId` only served the
  cards' editor links, as did the "Edit on the page" text.

## Risks / Trade-offs

- **[Svedit outside the canvas]** Svedit has only rendered the page canvas here; label clicks,
  focus styles and scrolling may surprise. → Task 1 is a spike that mounts the form for
  services only and checks typing, marks, undo, add and delete before the rest is built.
- **[Two lists in one editable root]** The caret can move from one list into the other with the
  arrow keys. → Acceptable; it is one document. The frames are separate `fieldset`s with
  `contenteditable="false"` chrome between them.
- **[Two places to edit an item]** The canvas and the forms edit the same item. → The same
  session and operations, so no divergence; each page saves the whole language with the same
  conflict refusal.
- **[Screen readers and contenteditable fields]** → Each `TextProperty` gets an accessible
  name from its label (`aria-labelledby`), and e2e tests find fields by label.

## Migration Plan

Code only. No document format change; old links keep working.
