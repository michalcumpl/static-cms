# Spec Delta

## MODIFIED Requirements

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
- **Contact:** contact (all locations) · opening hours (all locations) · contact form (*Contact us*,
  to the main location's email) · text;
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

#### Scenario: A Contact page with a form
- **WHEN** a Czech site makes a page from the Contact layout
- **THEN** it has a *Contact us* form headed "Napište nám" with the button "Odeslat", after the
  opening hours
