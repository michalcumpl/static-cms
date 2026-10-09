# Import fixtures

Invented websites the importer is tested on (site-import design decision 12). The content is
made up; the example sites' real content stays out of the repository.

- **`bakery/`**: a Czech bakery at `https://pekarna-ulipy.cz/`, with most of the rules of
  [`docs/import-mapping.md`](../../../docs/import-mapping.md): JSON-LD in an `@graph`, a menu
  with a group, a page disallowed by `robots.txt` and one only in `sitemap.xml`, lazy and
  `srcset` images with size suffixes, a CSS background photo, an SVG logo and a touch icon, a
  gallery, a row of linked logos, a YouTube embed, `<details>` questions, a form, a map, an email
  hidden by Cloudflare, literal `*` and `[` in a text, and a skipped heading level.
- **`studio/`**: a one-page English site in minified, unquoted HTML, with inline styles, a
  percent-encoded email and a link to a Czech version.
- **`spa/`**: a page built by a script, with an empty `<div id="app">`.

The bakery's files name its address, `https://pekarna-ulipy.cz`, in absolute links. Tests that
serve the fixtures over HTTP replace it with the test server's origin in text files.
