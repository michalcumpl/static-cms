# Spec Delta

## ADDED Requirements

### Requirement: Contact form
A contact form block SHALL render as an HTML form, under its heading and text, posting to the
form endpoint the site is rendered with (`<endpoint>/<project>/<block>`), with:
- for *Contact us*: name, email, phone and message fields, each with a visible label; name and
  message required, and a note that an email or a phone is needed to answer;
- for *Let us call you back*: name and phone, required; when to call (morning, afternoon, any
  time); and an optional note;
- a hidden field holding the page's own path, and a hidden field people don't fill, kept out of
  sight and of assistive technology;
- a line saying the details are used only to answer the message, in the site's language;
- the button with the block's label.

It SHALL work without JavaScript. After a message is sent, the page SHALL open at the form showing
its confirmation in place of the fields ("Děkujeme, ozveme se vám." / "Thank you, we'll be in
touch."), announced to assistive technology; after a refused message, the form SHALL show the
reason. Fields SHALL use the site's tokens, meet the contrast and target-size rules of the other
blocks, and pass `html-validate`. Without a form endpoint (a site exported for elsewhere without
one), the block SHALL render its heading and text with the business's email and phone instead of
a form.

#### Scenario: A Contact us form
- **WHEN** rendering a contact form "Napište nám" for the bakery
- **THEN** the page has a form posting to `https://app.webmio.eu/forms/<project>/<block>` with
  labelled name, email, phone and message fields, the hidden fields, and the button "Odeslat"

#### Scenario: After sending
- **WHEN** a visitor comes back from the endpoint at the form's confirmation
- **THEN** the form shows "Děkujeme, ozveme se vám." instead of its fields, and a screen reader
  announces it

#### Scenario: No endpoint
- **WHEN** a site is rendered without a form endpoint
- **THEN** the contact form block shows its heading, its text and the business's email and phone
