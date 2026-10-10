# Import fixtures

Invented websites the importer is tested on (site-import design decision 12). The content is
made up; the example sites' real content stays out of the repository.

- **`bakery/`**: a Czech bakery at `https://pekarna-ulipy.cz/`, with most of the rules of
  [`docs/import-mapping.md`](../../../docs/import-mapping.md): JSON-LD in an `@graph`, a menu
  with a group, a page disallowed by `robots.txt` and one only in `sitemap.xml`, lazy and
  `srcset` images with size suffixes, a CSS background photo, an SVG logo and a touch icon, a
  gallery, a row of linked logos, a YouTube embed, `<details>` questions, a form, a map, an email
  hidden by Cloudflare, literal `*` and `[` in a text, and a skipped heading level. Its contact
  page shows opening hours in a table (as its structured data gives them), its story three key
  figures, and its bread page "Jak to funguje" as an ordered list of bold-titled steps.
  Its English version under `/en/` (import-languages) isn't in the sitemap: a home page with its
  own business name and phone and the home's three questions in English, "Our bread" (named as
  the alternate of "Naše pečivo"), "Contact" (naming "Kontakt" as its alternate, with two
  questions "Kontakt" doesn't have) and "Wholesale" (no Czech counterpart, with a photo of its
  own and a Czech photo without a description); the last two link the Czech home in their
  switcher. "O nás" and "Akce" have no English counterpart.
- **`studio/`**: a one-page English site in minified, unquoted HTML, with inline styles, a
  percent-encoded email and a link to a Czech version.
- **`agency/`**: a small Czech travel agency at `https://cestovka-vlna.example/`
  (import-existing-blocks): a home page with a grid of six article cards (four linking to its trip
  pages, two to articles it doesn't serve), a Lodgify booking widget under "Rezervace", and three
  award logos with their names in the footer; a contact page with a Google map naming its address
  and no address of its own.
- **`spa/`**: a page built by a script, with an empty `<div id="app">`.

The bakery's files name its address, `https://pekarna-ulipy.cz`, in absolute links. Tests that
serve the fixtures over HTTP replace it with the test server's origin in text files.
