## ADDED Requirements

### Requirement: Jobs rendering
A `jobs` block SHALL render as a `<section>` with its heading (when present) and a `<ul>` of jobs. Each job SHALL be an `<li>` with its title as a heading one level below the block's heading (`<h3>` under a heading, `<h2>` without one), its summary as a paragraph when present, its description when present inside a `<details>` element whose `<summary>` reads "Full description" in the site's language (closed at first, opening without JavaScript, subheadings one level below the job's title), and its contact when present as a paragraph starting with "Contact" in the site's language: the name, the email as a `mailto:` link and the phone as a `tel:` link, formatted as the business details' phone is. A block without jobs SHALL render its note in place of the list, and SHALL NOT render when the note is empty too.

#### Scenario: A full job ad
- **WHEN** a Czech site's jobs block "Volné pozice" holds "Zámečník/svářeč" with a summary, a description and the contact "Matěj Palouš", `+420777294579`
- **THEN** the job is an `<h3>` "Zámečník/svářeč", then its summary, then a closed `<details>` with the summary "Celý popis" holding the description with `<h4>` subheadings, then "Kontakt: Matěj Palouš, <a href="tel:+420777294579">+420 777 294 579</a>"

#### Scenario: Titles only
- **WHEN** Mareš Partners' jobs block holds "Advokátní koncipient/ka" and "Advokát/ka" with nothing else
- **THEN** each job is only its title, with no `<details>` and no contact line

#### Scenario: No openings
- **WHEN** a jobs block has no jobs and the note "Momentálně nikoho nehledáme."
- **THEN** the section shows its heading and the note, and no list
