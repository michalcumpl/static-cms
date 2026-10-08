# Proposal

## Why

Two of our examples hire through their sites: Mareš Partners has a career page listing its
open positions, and Scénografie lists two full job ads (what the job is, what you need, what
they offer, whom to call) on its contact page (`docs/layouts.md`, item 20). Today an owner can
only write them as text, so every ad looks different, and there's no tidy way to say "no
openings right now" (`docs/roadmap.md`, row 9h).

## What Changes

- **A jobs block** (chosen 2026-10-08 over a site-wide collection with a page per job): an
  optional heading and an ordered list of up to twelve jobs. Each job has a title, an optional
  one-line summary, an optional full description (paragraphs, subheadings and lists, with
  bold, italic and links), and an optional contact: a name, an email and a phone.
- **When there are no openings**, the block shows its "no openings" note (such as "Right now
  we aren't hiring, but send us your CV any time") instead of the list; a block with neither
  jobs nor a note isn't shown, with a warning.
- **On the site**, each job shows its title, summary and contact; a full description opens in
  place under "Full description" (a `<details>` element, no JavaScript), so a page of several
  long ads stays short. Email and phone are links.
- **Validation:** a job needs a title; contact emails and phones follow the business details'
  rules; at most twelve jobs.
- **No format change:** the block and its items are new node types.
- **In the editor:** the block picker offers "Jobs". The canvas shows the jobs with their
  descriptions open, their texts editable in place; jobs are added, moved, duplicated and
  deleted with the item handles. A Job panel sets the contact; the block's panel sets the
  "no openings" note.
- **The builder** writes jobs blocks; locally, Scénografie's contact page gets its two job ads
  and Mareš's career page its two positions.

Not in this change: jobs shared across pages, a page per job, Google's job posting markup
(`JobPosting`), application forms, and dates or closing dates.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `site-document`: Content blocks (the `jobs` block) and a new "Jobs" requirement.
- `site-rendering`: a new "Jobs rendering" requirement.
- `site-editing`: Block structure (inserting jobs) and a new "Jobs in the editor" requirement.

## Impact

- `@webmio/model`: `jobs` and `job` types, `JobsNode`/`JobNode`, validation (`empty-title`,
  `invalid-email`, `invalid-phone`, `too-many-items`, a new `no-jobs` warning), the builder's
  `blocks.jobs`.
- `@webmio/render`: `renderJobs`, styles, site strings ("Full description", "Contact") in every
  site language.
- Admin: block picker and inserter, `nodes/Jobs.svelte` and `nodes/Job.svelte`, item handles
  and limits, a Job panel and the block panel's note, i18n.
- Local only: Scénografie's and Mareš Partners' `build.ts`.
