# guided-setup Specification

## Purpose

Lets an owner without a website of their own build a first one by answering a few questions about
their business (its type, contact, hours, services, photos and pages); the site is made from the
template's layouts, previewed, and then taken over by the control panel and the editor.

## Requirements

### Requirement: Setup steps
The guided setup SHALL ask, one step per page, in this order: the business (its type, name and
one sentence about it), the design, the contact details and opening hours, the services, the
photos, the pages, and a preview. Each step SHALL have Back (except the first) and Continue, and
SHALL say which step of how many it is. Only the business's type and name SHALL be required;
every other answer MAY be left empty, and Continue SHALL then move on without it. Answers SHALL be
checked as the control panel checks them (a phone in international form, an email address, times
as `HH:MM` with closing after opening), and a step with a wrong answer SHALL stay open with the
answer marked and its message.

The business types SHALL be café, bakery, restaurant, shop, hair salon, beauty salon,
professional services, healthcare, sports, and other, stored as the business's type.

#### Scenario: The first step
- **WHEN** an owner starts the guided setup, chooses "Café", enters the name "Kavárna U Mostu"
  and the sentence "Výběrová káva a domácí dorty u Karlova mostu.", and continues
- **THEN** the workspace has the project "Kavárna U Mostu" and the design step opens, as step 2
  of 7

#### Scenario: A step left empty
- **WHEN** the owner continues from the services step without any service
- **THEN** the photos step opens, and the finished site has no services block

#### Scenario: A wrong answer
- **WHEN** the owner enters the opening hours 18:00–09:00 for Monday and continues
- **THEN** the contact step stays open with Monday's hours marked and a message that closing must
  come after opening

### Requirement: Design step
The design step SHALL show the templates whose trades suit the business's type first, with the
suggested one chosen, each with its name and one-line description; with one template it SHALL show
that one, chosen.

#### Scenario: One template
- **WHEN** the café's owner reaches the design step
- **THEN** it shows Standard, chosen, with its description

### Requirement: Contact step
The contact step SHALL offer the phone as a country (a flag and its prefix; Czechia only for now)
and the number after it; a number given with its own prefix SHALL keep it. Until the owner gives
their opening hours, the step SHALL show the typical hours of the business's type (a café Monday
to Friday 7:00–19:00 and weekends 8:00–18:00, a bakery 6:00–18:00 and Saturday 7:00–12:00,
professional services Monday to Friday 9:00–17:00, and so on), and SHALL offer copying Monday's
hours to Tuesday to Friday.

#### Scenario: Typical hours
- **WHEN** a café's owner reaches the contact step
- **THEN** Monday to Friday show 07:00–19:00 and Saturday and Sunday 08:00–18:00, ready to adjust

#### Scenario: Copying Monday
- **WHEN** the owner sets Monday to 08:00–17:00 and copies it
- **THEN** Tuesday to Friday show 08:00–17:00

### Requirement: Services and photos steps
The services step SHALL take up to 12 services, each a name, a short description and an
optional price; it SHALL show one service to start with (or those saved) and "Add a service" for
another. The photos step SHALL take a logo and up to 12 photos, each uploaded into the project's
media library at once (with the library's checks) and marked decorative to start with; unticking
it SHALL ask for the photo's description. The first photo SHALL be marked as the main photo,
which the owner can change.

#### Scenario: Photos
- **WHEN** the owner uploads a logo and three photos, unticks "decorative" on one and describes
  it, and continues
- **THEN** the project's media library has the four images, the described photo has its
  description, the others are decorative, and the pages step opens

### Requirement: Pages step
The pages step SHALL list the template's layouts as checkboxes, those the business's type suggests
already ticked, Home always ticked and unchangeable: café, bakery and restaurant suggest Home,
Services, About us and Contact; shop and other suggest Home, Services, About us and Contact; hair
salon and beauty salon suggest Home, Services, Team and Contact; professional services suggest
Home, Services, About us, Team, Contact and FAQ; healthcare suggests Home, Services, Team, Contact
and FAQ; sports suggests Home, Services, About us, Contact and FAQ.

#### Scenario: A salon's pages
- **WHEN** a hair salon's owner reaches the pages step
- **THEN** Home, Services, Team and Contact are ticked, About us, FAQ and Careers aren't, and Home
  can't be unticked

### Requirement: Preview and finishing
The preview step SHALL show the site the answers make, as it would be published, with its pages
navigable, without saving it. "Create my website" SHALL save the site as one new version of the
project and open its Overview:
- the business with its name, type and main location (address, phone, email, opening hours);
- the site's name, its description from the sentence, the template chosen, and the logo;
- the services collection with the services, in their order;
- the pages ticked, in the layouts' order, each made from its layout as adding a page does, in the
  menu; the home page's hero showing the main photo, and the other photos in a gallery at the end
  of About us (or of Home without it), in their order;
- blocks showing a collection the answers leave empty (testimonials, team, questions) hidden from
  the website, so the owner finds them in the editor to fill and show;
- the site's language, the owner's interface language.

The site SHALL be valid as far as the answers allow; what the owner must still do SHALL be
validation problems shown on the Overview. Finishing SHALL never publish.

#### Scenario: Finishing the café
- **WHEN** the café's owner gave a phone, an address, hours for Monday to Saturday, three services
  and three photos, kept the suggested pages, and chooses "Create my website"
- **THEN** the project has one new version with the pages Home, Services, About us and Contact in
  the menu, the three services, the business's hours, the main photo in the home page's hero, and
  the Overview opens

#### Scenario: Preview without saving
- **WHEN** the owner opens the preview and goes back to change the services
- **THEN** the project's versions are unchanged

### Requirement: Resuming a setup
Each step's answers SHALL be saved with the project when the owner continues. Until the setup is
finished, the project SHALL hold the starter site, opening the project (its Overview) SHALL lead
to the next unfinished step, and the projects page SHALL show "Finish setting up" on the project,
leading there. The editor and the panel's other sections SHALL stay open during the setup. A finished setup SHALL not be offered again, and its steps SHALL lead to the Overview.

#### Scenario: Coming back
- **WHEN** the owner leaves after the contact step and later opens the project from the projects
  page
- **THEN** the services step opens with nothing lost from the earlier steps

#### Scenario: After finishing
- **WHEN** the owner opens a setup step's address of a finished project
- **THEN** the Overview opens
