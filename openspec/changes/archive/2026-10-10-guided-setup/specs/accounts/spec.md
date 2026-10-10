# Spec Delta

## MODIFIED Requirements

### Requirement: Projects
An owner SHALL be able to create a project in their workspace in one of three ways, offered on the
"New website" page:
- **Tell us about your business**, first and main: the guided setup (see the guided-setup
  capability) asks about the business and builds the site from the answers;
- **Start from your current website**, beside it, with a public website's address: an import makes
  the project from that site (see the site-import capability), named after it;
- **Start empty**, as a smaller link, with a name: the project starts from the starter site, a
  valid one-page site, in Czech until languages exist.

The projects page SHALL show "Finish setting up" on a project whose guided setup isn't finished.
Members SHALL be able to open any project of their workspaces.

#### Scenario: New project
- **WHEN** an owner creates a project named "Kadeřnictví Eva" with "Start empty"
- **THEN** it appears in the workspace's project list and its editor opens a valid starter site

#### Scenario: New project from a website
- **WHEN** an owner starts from their current website `pekarna-ulipy.cz` and the import finishes
- **THEN** the workspace's project list has the imported project, and its import review opens

#### Scenario: New project from the guided setup
- **WHEN** an owner chooses "Tell us about your business", gives the type and name, and leaves
  before finishing
- **THEN** the project list has the project with "Finish setting up", leading to the next step
