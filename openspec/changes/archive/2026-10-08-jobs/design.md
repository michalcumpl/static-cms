# Design

## Context

See proposal.md for the motivation. The current state:

- **Blocks with their own items** (`cards`, `videos`, `steps`, `figures`): a block node with
  `items: node_array<item>`; items are added, moved, duplicated and deleted with the item
  handles (`ITEM_TYPES`, `ITEM_LISTS`, `itemLimit` in `structure.ts`); an item's extra settings
  live in a panel (`LinkPanel.svelte` for cards and slides, `VideoPanel.svelte`).
- **Rich bodies:** `rich_text` and a project's `body` are `node_array<paragraph | subheading |
  list>`; the canvas edits a `rich_text` body in place.
- **Contact rules:** a location's phone (`PHONE`, international form) and email (`EMAIL`) are
  checked in `checkLocation`; `formatPhone` writes Czech and Slovak numbers in groups. The
  business form normalises a phone typed as `777 294 579` to `+420777294579`.
- **Open/close without script:** the FAQ block renders `<details>`/`<summary>`.
- **Site strings** come in cs, sk, de, pl and en (`strings.ts`).

## Goals / Non-Goals

**Goals:**
- One consistent job ad: title, summary, contact always visible; the long text folded.
- A "no openings" state that keeps the page useful.

**Non-Goals:**
- Shared jobs, a page per job, `JobPosting` markup, application forms, dates.

## Decisions

### 1. Model: `jobs` and `job`, no format change

```
jobs  heading: text (one line), empty_note: text (marks), items: node_array<job> (0–12)
job   title: text (one line), summary: text (one line),
      body: node_array<paragraph | subheading | list>,
      contact_name: text (one line), contact_email: string, contact_phone: string
```

- **Contact as plain fields, not a person reference:** job ads often name someone who isn't
  on the team page (a workshop lead), and the email or phone must be checked; a team reference
  can come later.
- **Empty list allowed:** unlike cards (one to twelve), a jobs block may have no jobs; then its
  note shows. Neither → `no-jobs` warning, block skipped (like `nothing-to-show`).
- **Checks** reuse `PHONE`/`EMAIL` and messages naming the job: "Job 2 on "Kontakty"…";
  `too-many-items` past twelve.

### 2. Rendering

```html
<section class="block jobs">
  <div class="container">
    <h2>Volné pozice</h2>
    <ul class="job-list">
      <li class="job">
        <h3 class="job-title">Zámečník/svářeč</h3>
        <p class="job-summary">Výroba a instalace jeklových konstrukcí.</p>
        <details class="job-details">
          <summary>Celý popis</summary>
          <h4>Co vás čeká</h4><p>…</p><ul><li>…</li></ul>
        </details>
        <p class="job-contact">Kontakt: Matěj Palouš,
          <a href="tel:+420777294579">+420 777 294 579</a></p>
      </li>
    </ul>
  </div>
</section>
```

- **The title stays outside `<summary>`:** a heading inside a summary loses its heading role
  in some screen readers; the ad's title and contact are what most visitors need, so they are
  always visible and only the long text folds.
- **Heading levels:** title `<h3>` under the block's heading, `<h2>` without (as cards do);
  body subheadings render one level below the title regardless of their stored level 2/3, so
  `heading-skip` holds.
- **Contact line:** "Kontakt:" then the parts present, joined by ", ". The phone uses
  `formatPhone`.
- **Styles:** jobs as a stack of cards separated by `--color-secondary` borders, `var(--radius)`;
  the summary marker styled like the FAQ's; theme values only, no comments.
- **Strings:** `jobDetails` ("Celý popis" / "Full description") and `jobContact` ("Kontakt" /
  "Contact") in every site language.

### 3. Editor

- **Picker and inserter:** "Jobs" in the block picker; `insertJobs` creates the block with the
  site-language placeholder heading (as the contact block's), an empty note and one job, caret
  in its title. `insertJob` adds an empty job (Enter and "Add item"), none past twelve.
- **Canvas:** `nodes/Jobs.svelte` renders the heading and either the jobs
  (`NodeArrayProperty`) or, when there are none, the note as an editable text; `nodes/Job.svelte`
  renders title, summary and the body as a `NodeArrayProperty` of paragraphs, subheadings and
  lists (open, no `<details>` on the canvas), and the contact line read-only.
- **Items:** `ITEM_TYPES` + `job`, `ITEM_LISTS.items` learns `jobs`, `itemLimit` jobs 0–12 with
  the reason "A jobs block holds at most twelve jobs". The body's own blocks are not items.
- **Job panel:** `JobPanel.svelte` for a selected job: name, email, phone; email and phone
  checked and the phone normalised as in the business form, refused values not stored (as
  `VideoPanel`'s address). The note is edited on the canvas (see "Changes made while building").

### 4. Builder and examples

`blocks.jobs({ heading?, note?, items: [{ title, summary?, body?, contact?: { name?, email?,
phone? } }] })`, `body` in the builder's markdown-like syntax. Locally, Scénografie's
"Kontakty" gets "Volné pozice" with its two ads, and Mareš's "Kariéra" a jobs block with its
two positions (titles only) before its offer text.

## Risks / Trade-offs

- **[Stale ads]** An owner may leave a filled position up; no dates in this change. → The note
  makes "no openings" easy; dates can come with `JobPosting` later.
- **[Personal contact on a public page]** A named person's phone is published, as the owner
  chooses; nothing is shown unless filled in.

## Migration Plan

None: new node types only; existing documents are unchanged.

## Changes made while building

- **The note is edited on the canvas, not in the block's panel:** it may hold bold and links,
  which a plain panel field would drop. With jobs it shows under them, muted and labelled
  "Shown when there are no openings"; without, in the list's place, as on the page.
- **A new job starts with one empty paragraph** to write its description in; the renderer
  treats a description of blank paragraphs as none (no "Full description"). A job whose
  paragraphs were all deleted shows "Add a description" on the canvas.
- **Phone numbers keep non-breaking spaces**, as the contact block's do (html-validate's rule
  for telephone numbers).
- **The phone typed in the Job panel is normalised for the main location's country**
  (`normalizePhone`), and the email checked with the model's rule, before storing.
- **`jobsHeading`** joined the site strings for the new block's heading.
