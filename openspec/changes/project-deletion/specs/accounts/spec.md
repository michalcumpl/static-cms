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
For 30 days after a project was deleted, the workspace's owners SHALL see it in the project list under "Deleted websites", with the date it will be removed for good, **Restore** and **Delete now**. Restoring SHALL bring the project back as it was when deleted, with its languages, versions and images, and unpublished. Editors SHALL NOT see deleted projects.

#### Scenario: Restore by mistake
- **WHEN** an owner deletes a website and restores it the next day
- **THEN** it is back in the project list with its pages, versions and images, and it isn't published

#### Scenario: Days left
- **WHEN** an owner opens the project list 10 days after deleting a website
- **THEN** "Deleted websites" lists it with the date it goes for good, 20 days later

### Requirement: Removing a deleted project
A project deleted 30 days ago or more SHALL be removed for good: the project, its languages, versions, publishes and images, including the image files. The server SHALL remove such projects when it starts and at least once a day. **Delete now**, after a confirmation, SHALL remove a deleted project for good at once. A removed project SHALL NOT be restorable.

#### Scenario: After 30 days
- **WHEN** a project was deleted 31 days ago and the server runs its daily removal
- **THEN** the project, its versions and its image files are gone, and it is no longer listed under "Deleted websites"

#### Scenario: Delete now
- **WHEN** an owner chooses Delete now on a deleted website and confirms
- **THEN** it is removed for good at once

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
