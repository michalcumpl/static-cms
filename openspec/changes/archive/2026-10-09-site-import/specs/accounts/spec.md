# Spec Delta

## MODIFIED Requirements

### Requirement: Projects
An owner SHALL be able to create a project in their workspace in one of two ways, offered side by side on the "New website" page:
- **Start empty**, with a name: the project starts from the starter site, a valid one-page site, in Czech until languages exist;
- **Start from your current website**, with a public website's address: an import makes the project from that site (see the site-import capability), named after it.

Members SHALL be able to open any project of their workspaces.

#### Scenario: New project
- **WHEN** an owner creates a project named "Kadeřnictví Eva"
- **THEN** it appears in the workspace's project list and its editor opens a valid starter site

#### Scenario: New project from a website
- **WHEN** an owner starts from their current website `pekarna-ulipy.cz` and the import finishes
- **THEN** the workspace's project list has the imported project, and its import review opens
