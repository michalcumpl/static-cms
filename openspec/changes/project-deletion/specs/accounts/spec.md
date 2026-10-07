## ADDED Requirements

### Requirement: Deleting a project
An owner of a workspace SHALL be able to delete one of its projects (see "Delete website" in the project-page capability), confirming with the project's name; editors SHALL NOT. A deleted project SHALL leave the project list at once, and its pages and API routes SHALL answer "not found" to everyone, as a project of another workspace does. Deleting SHALL keep the project's languages, versions, publishes and images until the project is removed for good.

#### Scenario: Delete a website
- **WHEN** an owner deletes "Kadeřnictví Eva", typing its name
- **THEN** the project list no longer shows it, and opening its editor answers "not found"

#### Scenario: Editor can't delete
- **WHEN** an editor of the workspace sends the request to delete a project
- **THEN** the request is refused and the project stays

#### Scenario: Wrong name
- **WHEN** an owner confirms the deletion with a name that isn't the project's
- **THEN** nothing is deleted

### Requirement: Restoring a deleted project
The workspace's owners SHALL see its deleted projects in the project list under "Deleted websites", each with when it was deleted, **Restore** and **Delete now**. Restoring SHALL bring the project back as it was when deleted, with its languages, versions and images, and unpublished. Editors SHALL NOT see deleted projects. A deleted project SHALL stay restorable until it is removed for good.

#### Scenario: Restore by mistake
- **WHEN** an owner deletes a website and restores it the next day
- **THEN** it is back in the project list with its pages, versions and images, and it isn't published

#### Scenario: Deleted websites
- **WHEN** an owner opens the project list after deleting a website
- **THEN** "Deleted websites" lists it with the date it was deleted, Restore and Delete now

#### Scenario: Editor doesn't see them
- **WHEN** an editor of the workspace opens the project list
- **THEN** there is no "Deleted websites" list

### Requirement: Removing a deleted project
**Delete now**, after a confirmation that says it can't be undone, SHALL remove a deleted project for good: the project, its languages, versions, publishes and images, including the image files. A removed project SHALL NOT be restorable.

#### Scenario: Delete now
- **WHEN** an owner chooses Delete now on a deleted website and confirms
- **THEN** it is removed for good: no longer listed, and its versions and image files are gone

## MODIFIED Requirements

### Requirement: Workspaces and roles
A workspace SHALL have members, each with the role `owner` or `editor`, and projects. Members SHALL see only the workspaces they belong to and those workspaces' projects. Both roles SHALL be able to edit and save the workspace's projects. Only owners SHALL be able to invite and remove members, change roles, create projects, and delete, restore and remove them. A workspace SHALL always keep at least one owner.

#### Scenario: Only your own workspaces
- **WHEN** a member of workspace A opens the project list
- **THEN** it shows workspace A's projects and nothing from workspaces they don't belong to

#### Scenario: Editor can't manage members
- **WHEN** an editor tries to invite someone
- **THEN** the request is refused

#### Scenario: Last owner
- **WHEN** the only owner of a workspace tries to remove themselves or become an editor
- **THEN** the change is refused
