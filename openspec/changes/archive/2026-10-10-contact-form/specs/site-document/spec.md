# Spec Delta

## ADDED Requirements

### Requirement: Contact form
A `contact_form` block SHALL hold:
- its kind, `contact` (*Contact us*) or `callback` (*Let us call you back*), `contact` by default;
- a heading (one line), a text above the form (text with bold, italic and link marks, may be
  empty), and its button's label (one line);
- the address messages go to (an email, may be empty for the main location's email).

Like every page block it SHALL be hideable. Validation SHALL report an empty heading
(`empty-heading`, error), an empty button label (`empty-label`, error), an address that isn't an
email (`invalid-email`, error), and a form with no address and no main location's email
(`no-recipient`, warning: messages are only kept in the panel). A page MAY hold several forms,
each with its own kind and address.

#### Scenario: A callback form for a campaign
- **WHEN** a page "Konzultace zdarma" holds a `callback` form headed "Zavoláme vám" with the
  button "Chci zavolat" and the address `kampan@pekarna-ulipy.cz`
- **THEN** the document is valid with no problems

#### Scenario: Nowhere to send
- **WHEN** a contact form has no address and the business has no email
- **THEN** validation reports a `no-recipient` warning naming the page, and the document stays
  valid

#### Scenario: Not an email
- **WHEN** a contact form's address is `kampan`
- **THEN** validation reports `invalid-email`
