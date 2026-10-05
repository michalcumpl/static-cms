# Spec Delta

## MODIFIED Requirements

### Requirement: Business settings
The Settings tab SHALL show the business the site is for, with:
- the business name, with the site name shown as the placeholder;
- the type of business, as a list of names owners understand (such as "Bakery" and "Café");
- its locations, in order, each with:
  - its name;
  - the street, postal code, city and country;
  - the phone and email;
  - the map address;
  - the weekly opening hours, and the note;
- the social profiles;
- the "Show contact details in the footer" switch.

Locations SHALL be added with "Add a location", which adds an empty one at the end, and SHALL have buttons to remove one and to move one up or down, each one undoable step. The first location SHALL be marked as the main one. The only location SHALL NOT be removable, and its name field SHALL say that a name is needed once there are several. Removing a location that a contact or opening hours block chose SHALL say so first ("Shown on Kontakt") and set those blocks to all locations.

Text fields SHALL be applied when typed, except the phone. The phone SHALL be applied when the owner leaves the field, normalised to international form:
- spaces, dashes and brackets are removed;
- a leading `00` becomes `+`;
- a number without a country code gets the country's code (`+420` for `CZ`, `+421` for `SK`).

A number that can't be normalised SHALL be kept as typed and reported as a problem.

The opening hours SHALL list Monday to Sunday. Each day shows its ranges as pairs of time fields, with buttons to add and remove a range. A day without ranges SHALL read "Closed". An action SHALL copy Monday's hours to Tuesday to Friday, within one location.

The social profiles SHALL be a list of address fields, with buttons to add a profile, remove one, and move one up or down. Each filled-in field SHALL show the kind of profile it recognises ("Instagram"), or the host for other addresses. An address typed without a scheme (`instagram.com/pekarna`) SHALL get `https://` when the owner leaves the field.

#### Scenario: Normalise the phone
- **WHEN** the owner types `321 123 456` into the phone field of a business in `CZ` and leaves the field
- **THEN** the business's phone is `+420321123456`, and the field shows `+420 321 123 456`

#### Scenario: Lunch break
- **WHEN** the owner sets Monday to 08:00–12:00 and adds a range 13:00–17:00
- **THEN** Monday has two ranges, and after saving the editor's opening hours block shows "8:00–12:00, 13:00–17:00"

#### Scenario: Copy Monday to the weekdays
- **WHEN** Monday is 06:00–17:00 and the owner copies Monday's hours to Tuesday to Friday
- **THEN** Tuesday to Friday have one range 06:00–17:00 each, and one undo restores their previous hours

#### Scenario: Add an Instagram profile
- **WHEN** the owner adds a profile, types `instagram.com/pekarnaulipy` and leaves the field
- **THEN** the profile is `https://instagram.com/pekarnaulipy`, the field says "Instagram", and after saving the published footer links to it

#### Scenario: Add a second shop
- **WHEN** the owner adds a location, names it "Kutná Hora", fills in its address and opening hours, and saves
- **THEN** the business has two locations, the first marked as the main one, and the published footer shows both

#### Scenario: Remove a chosen location
- **WHEN** a contact block on "Kontakt" chose "Kutná Hora" and the owner removes "Kutná Hora"
- **THEN** the settings say it is shown on "Kontakt", and after removing it that block shows all locations

### Requirement: Shared settings outside the primary language
In a language other than the primary, the shared fields of the Settings tab (see "Shared fields" in the languages capability) SHALL be read-only, with the note "Edited in <primary language name>" and a link to the Settings tab in the primary language. Translatable fields stay editable:
- the site name and description;
- the default share image's description;
- the business name;
- each location's name and the note on its opening hours.

#### Scenario: Phone in English
- **WHEN** the owner opens the Settings tab in English
- **THEN** the phone field can't be edited and says it is edited in Čeština, and the note on the opening hours can be edited
