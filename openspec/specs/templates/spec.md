# templates Specification

## Purpose

Defines templates: the website systems we own and ship, each a complete set of design tokens,
styles, default block looks and layouts. It also covers how sites follow a template's releases and
how a page is made from a layout.

## Requirements

### Requirement: Template contract
A template SHALL be data shipped with the code, never stored in a site document. Each template
SHALL have:
- an ID: lowercase letters, digits and dashes, never changed or reused once a site uses it;
- a name and a one-line description, each in Czech and English;
- the trades it suits, as a list of short names in Czech and English, for suggesting it;
- a release number, a positive whole number;
- a value for every design token (see "Design tokens");
- its own styles, added after the shared block styles;
- a default look for every block that has a look (`hero`, `services`, `team`, `gallery`, `cards`);
- its layouts (see "Layouts").

A template SHALL NOT set the owner's design (colours, fonts, logo, corner radius, content width):
those stay in the site's theme.

#### Scenario: Template described
- **WHEN** the admin lists the templates
- **THEN** each has its ID, its name and description in the interface language, its trades and
  its release number

#### Scenario: Default look outside the block's looks
- **WHEN** a template gives the hero the default look `split`
- **THEN** the template check fails, naming the template and the block

### Requirement: Template registry
The code SHALL hold a registry of the templates, looked up by ID. The registry SHALL hold the
Standard template (ID `standard`), which every site created before templates existed uses, and
which new sites get unless another template is chosen. Each template SHALL be in the registry at
its current release only.

#### Scenario: Standard is there
- **WHEN** looking up the template `standard`
- **THEN** the registry returns the Standard template

#### Scenario: Unknown ID
- **WHEN** looking up the template `bakery`
- **THEN** the registry returns nothing

### Requirement: Design tokens
Every template SHALL give a value to the same fixed set of design tokens, each a CSS length or a
unitless line height:
- a type scale: the sizes of small text, body text, and headings at three levels, and the size of
  the page's main heading;
- line heights for body text and headings;
- a spacing scale of five steps, from the smallest gap to the largest;
- the vertical padding of a block, on narrow and on wide screens.

The shared block styles SHALL use these tokens for the sizes of body text, headings and the main
heading, for line heights, for the gaps between a block's items and for a block's padding. Small
details (labels, captions, badges) MAY keep fixed sizes. Values SHALL be validated as CSS lengths or numbers, so they can't break out
of their declaration.

#### Scenario: Larger headings
- **WHEN** a template sets a larger main heading size and is rendered with the same document
- **THEN** only the stylesheet differs, and the main heading's size in it is the template's value

### Requirement: The Standard template
The Standard template SHALL hold today's styles. At release 1, rendering any valid document with
it SHALL produce exactly the pages the renderer produced before templates existed, and a
stylesheet that, with every token reference replaced by Standard's value for it and the token
declarations left out, is exactly the stylesheet produced before. Standard SHALL add no styles of
its own. Its default looks SHALL be the blocks' first looks (`beside`, `cards`, `cards`, `fill`,
`below`), and its layouts SHALL be the shared layouts only.

#### Scenario: Demo site unchanged
- **WHEN** the demo site is rendered with Standard, release 1
- **THEN** every page is byte-identical to the output before this change, and so is the
  stylesheet once Standard's token values are put in place of the token references

### Requirement: Template releases
A site SHALL record the release of its template it was last upgraded to. Whenever schema upgrades
run on a stored document (when it is read: by the editor, the panel, previews, publishing and
version history), the template's upgrade SHALL run right after them:
- the recorded release equals the current release: nothing changes;
- the recorded release is older: the template's upgrade steps for each later release SHALL run in
  order, each changing the document as that release needs (for example, giving a block a new
  look), and the recorded release SHALL become the current one. A release without document
  changes has no step, and only the recorded number changes.

Rendering SHALL always use the template's current release, also for a document that records an
older one. Upgrade steps SHALL NOT change the owner's texts, images, collections or theme. A newer release
SHALL reach a published site the next time it is published; publishing is never started by a
release. Stored documents SHALL be stored upgraded at their next save, as schema upgrades are.

#### Scenario: Release without document changes
- **WHEN** a site records Standard release 1 and the current release is 2, with no upgrade step
- **THEN** reading it gives release 2 and the same content, and its next preview uses release 2's
  styles

#### Scenario: Release with an upgrade step
- **WHEN** a template's release 3 changes its default hero look to `cover` with a step that
  turns every `beside` hero into `cover`, and a site records release 2
- **THEN** after the upgrade its heroes are `cover` and it records release 3

#### Scenario: Published site waits for publishing
- **WHEN** a new release of a site's template is deployed and the owner doesn't publish
- **THEN** the live site stays as it was published

### Requirement: Layouts
A layout SHALL be a page recipe: an ID unique within its template, a name and a one-line
description in Czech and English, and an ordered list of blocks, each with its settings (a look,
which collection items it shows, its switches) and its starting texts. A layout SHALL carry no
styling. Starting texts SHALL be given in Czech and English; a site in another language gets the
English ones.

Every template SHALL offer the shared layouts, in this order, with these blocks:
- **Home:** hero (the site name as heading, the site description as text) · text · services (all)
  · testimonials (all) · call to action;
- **Services:** text · services (all) · call to action;
- **About:** text · team (all) · call to action;
- **Team:** text · team (all);
- **Contact:** contact (all locations) · opening hours (all locations) · text;
- **FAQ:** questions (all) · text;
- **Careers:** text · jobs (no jobs yet, with a "no openings" note) · call to action.

A template's own layouts SHALL come after the shared ones.

#### Scenario: Shared layouts offered
- **WHEN** listing the layouts of the Standard template
- **THEN** they are Home, Services, About, Team, Contact, FAQ and Careers, in that order

#### Scenario: Czech starting texts
- **WHEN** a Czech site makes a page from the Contact layout
- **THEN** the text block's starting texts are in Czech

#### Scenario: German site
- **WHEN** a German site makes a page from the Careers layout
- **THEN** the starting texts are the English ones

### Requirement: Making a page from a layout
Making a page from a layout SHALL give it a title and slug as adding a page does, and blocks
created from the layout's recipe under new node IDs:
- each block that has a look gets the look the recipe names, or else the template's default look;
- collection blocks show all of their collection, so the page is filled from the site's data;
- the hero's heading and text are the site name and the site description, when the recipe says so;
- each call to action gets one button: an email link to the business's email, or else a phone
  link to its phone, or else no button;
- the other texts are the layout's starting texts in the site's language.

The page SHALL record nothing about the layout it came from: after it is made it is the owner's.

#### Scenario: Services page filled in
- **WHEN** a site with three services makes a page from the Services layout
- **THEN** the page has a text block, a services block showing all three services and a call to
  action

#### Scenario: Call to action without email
- **WHEN** a business has no email but a phone `+420 321 123 456`, and a page is made from the
  About layout
- **THEN** the call to action's button links to `tel:+420321123456`

#### Scenario: No link back
- **WHEN** a page made from the Home layout is edited and the template's Home layout later changes
- **THEN** the page doesn't change

### Requirement: Template checks
The tests SHALL check every template in the registry, at its current release:
- its default looks and token values are valid;
- every fixture site, given the template, renders without errors, and every rendered page passes
  `html-validate`;
- every layout, made into a page on every fixture site, gives a document without errors.

A template that fails a check SHALL fail the build.

#### Scenario: Layout makes an invalid page
- **WHEN** a template's layout has a call to action with an empty heading
- **THEN** the template check fails, naming the template and the layout
