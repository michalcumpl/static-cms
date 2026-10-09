# Spec Delta

## MODIFIED Requirements

### Requirement: Overview
The dashboard, "Overview", SHALL show at the top:
- the site's name;
- its state: "Live" with the site's address as a link, or "Not published yet";
- the Publish button, or, when the workspace isn't connected to hosting, the note and link the Publish section gives;
- the problems of the saved site: the number of errors and warnings, and each problem's message as a link to where it is fixed (a section field, an item's field in What you offer or About you, or the editor at the node);
- for a project made by an import whose review hasn't been dismissed, a link to the import review (see "Import review" in the site-import capability).

Below it, the dashboard SHALL show one card per section, each with a short summary and a link to it:
- **Business:** the business name (or the site name), the main location's city, and the number of locations when there are several;
- **What you offer:** the number of services and of questions;
- **About you:** the number of people and of testimonials;
- **Website:** the number of pages, the languages, the domain (or the address without one), and the design: its colours as swatches, the heading and body fonts by name, and the logo when there is one;
- **Publish:** the last publish, its state and when it happened, or "Not published yet".

The dashboard SHALL show the primary language.

#### Scenario: Published and valid
- **WHEN** the project has been published and its saved site has no errors
- **THEN** the dashboard shows "Live" with the address, the Publish button enabled, no problems, and the Publish card with the last publish

#### Scenario: A problem leads to its field
- **WHEN** the saved site has an error about the main location's phone and the owner chooses it on the dashboard
- **THEN** the Business section opens with that location's phone field focused

#### Scenario: An item's problem leads to its field
- **WHEN** the saved site's second question has no answer and the owner chooses the problem on the dashboard
- **THEN** What you offer opens with the caret in the second question's answer

#### Scenario: Errors disable publishing
- **WHEN** the saved site has two errors
- **THEN** the dashboard says so, lists them, and the Publish button is disabled

#### Scenario: Offer card
- **WHEN** the site has five services and the owner chooses the What you offer card
- **THEN** the What you offer section opens

#### Scenario: Imported project
- **WHEN** the owner opens the Overview of a project made by an import, before dismissing its review
- **THEN** the dashboard links to the import review
