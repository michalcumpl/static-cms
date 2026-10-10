# Contact Messages

## ADDED Requirements

### Requirement: Form endpoint
The admin SHALL accept a contact form block's messages at `/forms/<project>/<block>`, posted as a
plain HTML form from any website, without signing in. A message SHALL be accepted only when the
project exists, isn't deleted, its published or previewed site has that block, and the message
passes the block's checks: the fields of its kind, a name, an email address or a phone number
for *Contact us* (a phone for *Let us call you back*), a valid email address and phone number
when given, and lengths (a name up to 100 characters, a message up to 3,000). The endpoint SHALL
then send the visitor back to the page the form was on, at the form, which shows its
confirmation; a page not on one of the project's own addresses (its Webmio address, custom
domain, Netlify site or preview) SHALL get the admin's own short confirmation page instead. A
message that fails a check SHALL send the visitor back to the form with the reason; the page
SHALL say that Back returns what they wrote, since a static page can't fill the form in again.

#### Scenario: A message sent
- **WHEN** a visitor fills in "Jana Nováková", `jana@example.cz` and "Máte bezlepkový chléb?" on
  the bakery's Contact page and sends it
- **THEN** the message is stored for the bakery, emailed to its address, and the visitor is back
  on the Contact page seeing "Děkujeme, ozveme se vám."

#### Scenario: No way to answer
- **WHEN** a visitor sends *Contact us* with a name and a message but no email or phone
- **THEN** nothing is stored or sent, and the visitor is back at the form with "Fill in your email
  or phone so we can answer." and a note that Back returns their message

#### Scenario: A block that isn't there
- **WHEN** a form posts to a block the project's site doesn't have, or to a deleted project
- **THEN** the endpoint answers 404 and stores nothing

### Requirement: Spam protection
The endpoint SHALL stop spam without third-party scripts or CAPTCHAs: a hidden field people
don't fill (a message with it filled SHALL be dropped while the visitor sees the usual
confirmation), at most 5 messages an hour from one sender's address and 50 an hour for one
website (more SHALL be refused with "Too many messages; try again later."), and a message with
more than 3 links SHALL be refused.

#### Scenario: A bot fills every field
- **WHEN** a post fills the hidden field
- **THEN** nothing is stored or sent, and the response looks like a confirmation

#### Scenario: Flooding
- **WHEN** one address sends a sixth message within an hour
- **THEN** it is refused, and nothing is stored or sent

### Requirement: Delivery by email
Each accepted message SHALL be emailed to the block's address, with the website's name, the form's
kind and heading, the page, the visitor's details and message, and when to call for a callback;
its Reply-To SHALL be the visitor's email when given, so the owner can answer from their inbox. A
message that can't be emailed SHALL stay stored and listed, marked "not delivered".

#### Scenario: Answering from the inbox
- **WHEN** the owner gets Jana's message and chooses Reply in their email
- **THEN** the reply is addressed to `jana@example.cz`

### Requirement: Recipient address
A contact form block's messages SHALL go to the main location's email unless the block names
another address. Another address SHALL first get an email with a confirmation link; until it is
confirmed, messages SHALL go to the main location's email, and the editor SHALL say the address is
waiting for confirmation. A confirmed address SHALL stay confirmed for the project. With no
address at all, messages SHALL only be stored, and validation SHALL warn about it.

#### Scenario: Another address
- **WHEN** the owner sets a campaign form's address to `kampan@pekarna-ulipy.cz`
- **THEN** that address gets a confirmation email, and messages go to the business email until
  the link is followed

### Requirement: Messages section
The panel SHALL have a Messages section listing the project's messages, newest first, each with
when it came, the form's kind and heading, the page, the visitor's details and message, and
whether it was delivered. The owner SHALL be able to mark a message handled (and back), filter
by form and by unhandled, delete one, and export the listed messages as CSV (UTF-8, with a
header row). The Overview SHALL show how many messages are unhandled, linking to the section.
Members of the workspace SHALL see the section; only they can.

#### Scenario: A campaign's leads
- **WHEN** the owner filters by the form "Zavoláme vám" and exports
- **THEN** the CSV has a row per callback request with the name, phone, when to call, page and
  date

#### Scenario: Handled
- **WHEN** the owner marks Jana's message handled
- **THEN** it leaves the unhandled filter and the Overview's count drops by one

### Requirement: Keeping messages
Messages SHALL be deleted 12 months after they arrived, and with their project when it is
purged. The section SHALL say how long messages are kept.

#### Scenario: A year later
- **WHEN** a message is 12 months old
- **THEN** it is deleted the next time the admin cleans up, and no longer listed

### Requirement: Origin check
The admin's own forms and API SHALL keep refusing cross-site posts (a form post whose Origin
isn't the admin's own); only the form endpoint SHALL accept posts from other origins.

#### Scenario: Cross-site post to the admin
- **WHEN** another website posts a form to `/w/<workspace>/new`
- **THEN** the admin answers 403, as before
