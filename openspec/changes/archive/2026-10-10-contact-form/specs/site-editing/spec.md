# Spec Delta

## ADDED Requirements

### Requirement: Contact form in the editor
The block picker SHALL offer a contact form ("Contact form": "A form visitors send you messages
or callback requests with"). On the canvas the block SHALL show its heading and text editable in
place, and its fields as the website shows them but not usable. Selecting it SHALL show a Contact
form panel with:
- its kind, *Contact us* or *Let us call you back*, which changes the fields shown;
- its button's label;
- where messages go: "Business email (<address>)" by default, or another address, with
  "Waiting for confirmation" until that address confirms; an address that isn't an email SHALL
  be refused with the reason, keeping the last valid one;
- a link to the Messages section.

Every change SHALL be one undoable step.

#### Scenario: Insert a callback form
- **WHEN** the owner inserts a contact form on "Konzultace zdarma", chooses *Let us call you
  back* and types the heading "Zavoláme vám"
- **THEN** the canvas shows the name, phone and when-to-call fields under "Zavoláme vám", and the
  preview has a working form

#### Scenario: A campaign address
- **WHEN** the owner sets the form's address to `kampan@pekarna-ulipy.cz`
- **THEN** the panel says the address is waiting for confirmation, and a confirmation email is
  sent to it once the site is saved
