# Spec Delta

## MODIFIED Requirements

### Requirement: Business settings
The Settings tab SHALL show the business the site is for, with:
- the business name, with the site name shown as the placeholder;
- the street, postal code, city and country;
- the phone and email;
- the map address;
- the type of business, as a list of names owners understand (such as "Bakery" and "Café");
- the weekly opening hours, and the note;
- the social profiles;
- the "Show contact details in the footer" switch.

Text fields SHALL be applied when typed, except the phone. The phone SHALL be applied when the owner leaves the field, normalised to international form:
- spaces, dashes and brackets are removed;
- a leading `00` becomes `+`;
- a number without a country code gets the country's code (`+420` for `CZ`, `+421` for `SK`).

A number that can't be normalised SHALL be kept as typed and reported as a problem.

The opening hours SHALL list Monday to Sunday. Each day shows its ranges as pairs of time fields, with buttons to add and remove a range. A day without ranges SHALL read "Closed". An action SHALL copy Monday's hours to Tuesday to Friday.

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
