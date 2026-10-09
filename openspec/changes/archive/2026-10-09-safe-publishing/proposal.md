# Proposal

## Why

The strategy promises that "nothing can break": every publish checks links, deploys, **verifies
the deployment** and keeps the previous version, and when anything fails the owner reads
*"Publishing failed. We kept your previous version online. Try again."*
(`docs/strategy.md`, principle 6). Today a publish is marked live as soon as the hosting
accepts it. Nobody checks that the website then serves the new pages, broken links inside the
exported site go out unnoticed, and a failure shows a technical message with no way forward
but pressing Publish again. `safe-publishing` is the last change of phase 5 (`docs/roadmap.md`)
and builds on `own-hosting`'s per-publish folders and one-step switch.

## What Changes

- **Checking the site's own links before anything is uploaded.** Every link, image, stylesheet
  and font reference in the exported pages and stylesheets must lead to a file of the same
  publish. A broken one fails the publish before the hosting is touched, naming the page and
  the address.
- **Checking links to other websites, as warnings.** Each outside address is asked once, with a
  short timeout. The ones that don't answer are listed with the publish's result, but never
  stop it. Another website being down is not the owner's fault.
- **Verifying the live website after the switch.** The admin fetches every page and file of the
  publish at the website's address until the new version is served, for up to about two
  minutes. Pages, stylesheets, scripts, the sitemap and `robots.txt` must match exactly; images,
  fonts and other files must be there with the right size.
- **Keeping the previous version when anything fails.** If verification fails, the website
  switches back to the publish that was live before, without re-uploading, and the failed
  publish's files are deleted. A website's first publish has nothing to go back to, so it is
  taken offline again, as before the publish. This works on Webmio hosting and on Netlify.
- **The owner's view of a publish.** While it runs, the publish shows its step: checking,
  uploading, verifying. A failure reads in plain words: what went wrong, that the previous
  version is still online (or that the website isn't online yet), and a **Try again** button.
  Outside links that didn't answer are listed with a successful publish.

### Non-goals

- A daily check of the live website (`website-health`, phase 6). This change checks once per
  publish.
- Checking `#fragment` anchors inside pages, and links inside PDFs or other documents.
- Retrying a failed publish automatically. *Try again* is the owner's choice.
- Moving Netlify websites to Webmio hosting.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `publishing`:
  - publish status: steps while running, plain failure messages with *Try again*, warnings
    with a successful publish;
  - new requirements: checking the site's own links, checking outside links as warnings,
    verifying the live website, keeping the previous version when a publish fails.

## Impact

- **`packages/export`:** a link check over the exported files. It is pure: the pages,
  stylesheets and their references against the file list, plus the outside addresses found.
- **`apps/admin` publishing:**
  - the publish job becomes a pipeline of steps (`publish.ts`), with outside-link checks and
    verification;
  - a way to fetch the live website per hosting: the AWS backend fetches it over the internet,
    and the fakes serve it directly, so tests and end-to-end runs need no real DNS;
  - going back after a failed verification: restoring the previous deploy, or taking a first
    publish offline;
  - a migration: `publishes.step` and `publishes.warnings`;
  - the Publish button, the Publish page's history, Czech and English messages.
- **Configuration:** `PUBLISH_CHECK_OUTSIDE_LINKS`, on by default, off in the end-to-end
  runs, which have no internet to ask.
- **Docs:** the roadmap's phase 5.
