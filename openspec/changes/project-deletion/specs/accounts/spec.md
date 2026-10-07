## ADDED Requirements

### Requirement: Deleting a project
An owner of a workspace SHALL be able to delete one of its projects (see "Delete website" in the project-page capability), confirming with the project's name; editors SHALL NOT. Deleting SHALL remove the project for good: its languages, versions, publishes and images, including the image files. It SHALL leave the project list at once, and its pages and API routes SHALL answer "not found" to everyone. A deleted project SHALL NOT be restorable.

#### Scenario: Delete a website
- **WHEN** an owner deletes "Kadeřnictví Eva", typing its name
- **THEN** the project list no longer shows it, opening its editor answers "not found", and its image files are gone

#### Scenario: Editor can't delete
- **WHEN** an editor of the workspace sends the request to delete a project
- **THEN** the request is refused and the project stays

#### Scenario: Wrong name
- **WHEN** an owner confirms the deletion with a name that isn't the project's
- **THEN** nothing is deleted

## MODIFIED Requirements

### Requirement: Workspaces and roles
A workspace SHALL have members, each with the role `owner` or `editor`, and projects. Members SHALL see only the workspaces they belong to and those workspaces' projects. Both roles SHALL be able to edit and save the workspace's projects. Only owners SHALL be able to invite and remove members, change roles, and create and delete projects. A workspace SHALL always keep at least one owner.

#### Scenario: Only your own workspaces
- **WHEN** a member of workspace A opens the project list
- **THEN** it shows workspace A's projects and nothing from workspaces they don't belong to

#### Scenario: Editor can't manage members
- **WHEN** an editor tries to invite someone
- **THEN** the request is refused

#### Scenario: Last owner
- **WHEN** the only owner of a workspace tries to remove themselves or become an editor
- **THEN** the change is refused
