# accounts Specification

## Purpose

Lets people sign in without passwords, and organises who can reach which sites: workspaces (a business), their members and roles, invitations, and projects (websites).

## Requirements

### Requirement: Magic-link sign-in
A person SHALL sign in by entering their email address and following a link sent to it. The link SHALL work once and expire 15 minutes after it was sent. Following a valid link SHALL start a session and open the page they were trying to reach, or the project list. The sign-in form SHALL give the same response whether or not the address belongs to an account, and SHALL only send email to existing accounts.

#### Scenario: Sign in
- **WHEN** a member enters their address and follows the link from the email within 15 minutes
- **THEN** they are signed in and see their projects

#### Scenario: Link used twice
- **WHEN** a sign-in link is followed a second time
- **THEN** it is refused as used and the person is asked to request a new one

#### Scenario: Expired link
- **WHEN** a sign-in link is followed after 15 minutes
- **THEN** it is refused as expired

#### Scenario: Unknown address
- **WHEN** someone enters an address that has no account
- **THEN** the form shows the same "check your email" message and no email is sent

### Requirement: Sign-in rate limits
Requests for sign-in links SHALL be limited per email address and per client address, so the form can't be used to flood an inbox or probe for accounts.

#### Scenario: Too many requests
- **WHEN** more than 5 sign-in links are requested for one address within 15 minutes
- **THEN** further requests are refused with a "try again later" message and no email is sent

### Requirement: Sessions
A session SHALL be kept in an HTTP-only, `SameSite=Lax` cookie (also `Secure` when served over HTTPS) and SHALL expire after 30 days without use. Signing out SHALL end the session on the server.

#### Scenario: Sign out
- **WHEN** a member signs out
- **THEN** their session no longer grants access, even if the old cookie is sent again

### Requirement: Invite-only accounts
Accounts SHALL only be created by an invitation or by the admin command. There SHALL be no public sign-up.

#### Scenario: No sign-up
- **WHEN** someone without an account tries to sign in
- **THEN** no account is created

### Requirement: Admin command
An admin command on the server SHALL create a user with a new workspace in which they are the owner, and print a sign-in link. It SHALL refuse to create a second account for an existing address.

#### Scenario: First user
- **WHEN** the command runs with an email address and a workspace name on a new installation
- **THEN** the user, the workspace and their owner membership exist, and a sign-in link is printed

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

### Requirement: Invitations
An owner SHALL be able to invite an email address to their workspace with a role. The invitation SHALL be sent by email as a link that works once and expires after 7 days. Following it SHALL create the account if needed, add the membership, and sign the person in. An owner SHALL be able to cancel an invitation that hasn't been used.

#### Scenario: Invite a client
- **WHEN** an owner invites `jana@example.cz` as owner and Jana follows the link
- **THEN** Jana has an account, is an owner of that workspace, and is signed in

#### Scenario: Existing account
- **WHEN** someone who already has an account for another workspace accepts an invitation
- **THEN** they become a member of both workspaces with one account

### Requirement: Projects
An owner SHALL be able to create a project in their workspace, with a name. A new project SHALL start from the starter site: a valid one-page site, in Czech until languages exist. Members SHALL be able to open any project of their workspaces.

#### Scenario: New project
- **WHEN** an owner creates a project named "Kadeřnictví Eva"
- **THEN** it appears in the workspace's project list and its editor opens a valid starter site

### Requirement: Access to projects
Pages and API routes of a project SHALL require a signed-in member of the project's workspace. A person who isn't signed in SHALL be sent to sign in (pages) or get 401 (API). A signed-in person who isn't a member SHALL get "not found", so they can't learn which projects exist.

#### Scenario: Not signed in
- **WHEN** someone opens a project's editor without a session
- **THEN** they are sent to the sign-in page and return to the editor after signing in

#### Scenario: Not a member
- **WHEN** a signed-in member of workspace A requests a project of workspace B
- **THEN** the response is "not found"

### Requirement: Cross-site requests
Requests that change data SHALL be refused when they come from another site's page.

#### Scenario: Forged save
- **WHEN** a page on another origin sends a save request with the member's cookie
- **THEN** the request is refused and nothing is changed

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

### Requirement: Loading a site
An admin command on the server SHALL create a project in a given workspace from a folder holding:
- `project.json` with the project's name, its primary language, and its languages, each naming its site document;
- one site document per language, whose images name files of the folder instead of library keys;
- those image files.

The command SHALL upload the images into the new project's library, point the documents at the uploaded images, and check every language with the site document's validation. A folder with errors (a missing file, an image that can't be uploaded, a document with validation errors, a language that isn't offered, an unknown workspace) SHALL be refused with each problem printed, and SHALL leave no project, version or image behind. Languages other than the primary SHALL be stored as languages of the project, sharing the primary's shared fields as any language does. On success the command SHALL print the project's address in the admin.

#### Scenario: Load an English site
- **WHEN** the command loads a folder whose `project.json` names "Mortgage Specialist" with English as its only language
- **THEN** the workspace has the project "Mortgage Specialist", its primary language is English, its pages show the folder's images from the library, and its address is printed

#### Scenario: Two languages
- **WHEN** the folder names Czech as the primary language and English as a second one
- **THEN** the project has both languages, and the English pages share the Czech pages' images and business details

#### Scenario: Broken folder
- **WHEN** the Czech document names an image file the folder doesn't have, and a page with an empty address (slug)
- **THEN** the command prints both problems, exits with an error, and the workspace has no new project and its media folder no new files
