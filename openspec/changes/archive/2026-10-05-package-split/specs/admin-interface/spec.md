# Spec Delta

## MODIFIED Requirements

### Requirement: App shell
Every signed-in page SHALL show a top bar with:
- the product mark and name "Webmio", linking to the project list;
- the current workspace, with a switcher when the person belongs to several;
- an account menu with the person's email address, the interface language (Čeština or English) and Sign out.

The editor SHALL show the same bar in a compact height above its toolbar. Pages a person sees before signing in (sign-in, invitation) SHALL show the product mark only, without workspace or account, and a language choice ("Čeština · English") below their form. The language SHALL NOT have a control of its own in the top bar.

#### Scenario: Switch workspace
- **WHEN** a person who belongs to "Studio Kolín" and "Pekárna U Lípy" opens the switcher on a page of Studio Kolín and chooses Pekárna U Lípy
- **THEN** the project list of Pekárna U Lípy opens

#### Scenario: Sign out from the account menu
- **WHEN** a signed-in person opens the account menu and chooses Sign out
- **THEN** their session ends and the sign-in page opens

#### Scenario: Editor keeps its space
- **WHEN** the editor is open
- **THEN** the top bar is shown above the editor's toolbar, and the canvas still fills the rest of the window

#### Scenario: Product name
- **WHEN** a signed-in person opens the project list in Czech
- **THEN** the top bar's mark is the link "Webmio, vaše projekty", and the page title is "Projekty – Webmio"
