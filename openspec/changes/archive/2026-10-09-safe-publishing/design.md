# Design

## Context

See proposal.md for why. Today `runPublish` in `apps/admin/src/lib/server/publishing/publish.ts`
runs these steps:

1. `ensureSite`: on a first publish the hosting creates the site, which gives it its address.
2. Export with that address.
3. `target.deploy`. On Webmio hosting this uploads and switches `s:<siteId>`; on Netlify it
   waits until the deploy is live.
4. Record `ready` and set `livePublishId`.
5. On Webmio hosting, `prunePublishes`.

Any exception records `failed` with a message. Publishes run one at a time per server, through
a single promise chain (`queue`).

What the code gives us to build on:
- **Links:** the exported files are a `Map<path, bytes>`. Pages link root-relative (`/kontakt/`,
  `/assets/style.css`, `srcset="/assets/images/x-320.webp 320w"`), and the stylesheet loads
  fonts relative to itself (`url("fonts/x.woff2")`). Redirects are in `_redirects`.
- **Rollback:** both targets already make an earlier deploy live without uploading
  (`restore`). Webmio hosting deletes a deploy's files through `prune`, and `serveFake` serves
  the folder fake through the edge's own router. The fake Netlify serves sites at
  `<apiUrl>/sites/<name>/<path>`.
- **Measured switch times** (`own-hosting` design.md, Risks): 21 to 40 seconds for a switch,
  and up to a minute before a new website first shows.

## Goals / Non-Goals

**Goals:**
- **One pipeline for both targets:** the steps, rollback and messages are shared. Each target
  supplies only how to fetch its live website and how to take a first publish offline.
- **Testable without a network:** verification fetches through the target, so vitest and
  Playwright verify against the fakes.
- **No long wait for other projects:** a publish waiting for the edge doesn't hold up other
  projects' publishes.

**Non-Goals:**
- Comparing the HTTP headers of live files beyond their size (content type and caching stay
  `own-hosting`'s concern).
- Verifying from several places in the world. The admin fetches from wherever it runs.

## Decisions

### 1. The pipeline and its steps

`runPublish` becomes the following steps. `publishes.step` is updated at each one, and the UI
reads it (decision 7).

| Step | What happens | On failure |
| --- | --- | --- |
| `checking` | `ensureSite`, export, the site's own links (decision 2); outside links start in the background (decision 3) | `failed`; nothing uploaded; whatever was live stays |
| `uploading` | `target.deploy` (uploads and switches) | `failed`; the target already left the previous deploy live |
| `verifying` | live check (decision 4) | rollback (decision 5), then `failed` |
| — | record `ready`, the warnings, `livePublishId`; prune on Webmio hosting | — |

- **Why `ensureSite` stays in `checking`:** the export needs the address, and a first publish
  only gets its name when the hosting creates the site. The spec therefore promises "before
  anything is uploaded", not "before the hosting is touched".
- **A failed check on a first publish** leaves a site with nothing live. On Webmio hosting that
  means an `h:` key and no `s:`, which answers "No website here". On Netlify it is an empty
  site. Either way it is what a first publish that fails at verification ends as.

### 2. The site's own links: a pure check in `@webmio/export`

`checkSiteLinks(files, { siteUrl })` returns `{ broken: { page, address }[], outside: { page,
url }[] }`. It covers these files:

- **Pages:** `*.html`. It reads the attributes `href`, `src`, `srcset` (every candidate) and
  `poster`. The export writes them with double quotes, so a strict regex over our own output is
  enough; no HTML parser is needed.
- **Stylesheets:** `*.css`. It reads `url(...)`, resolved relative to the stylesheet.
- **`_redirects`:** every target must exist.

Each value is classified as follows:

| Value | Treated as |
| --- | --- |
| `#…`, `mailto:`, `tel:`, `data:`, `javascript:` | ignored |
| `/…`, relative, or `https://<siteUrl host>/…` | internal: strip the query and fragment, decode, append `index.html` after a trailing `/`; it must be a key of `files` |
| other `http(s)://…` | outside, kept per page for decision 3 |

A broken reference throws `PublishError("failed")`. Its message lists up to five
`page → address` pairs and "and N more".

*Alternative:* checking links in the rendered document before export. That misses what the
export itself adds (image sizes, fonts, `_redirects`), and those come from our own code, which
is exactly what this check guards. Rejected.

### 3. Outside links: warnings, checked in the background, with a budget

`checkOutsideLinks(links, { fetch, timeoutMs: 5000, concurrency: 8, max: 100 })` lives in the
admin (`publishing/outside-links.ts`):

- **Requests:** each unique URL gets one `HEAD` that follows redirects. A `405` or `501` is
  retried as a `GET`, cancelled after the headers arrive.
- **Answered:** any response below 400, and also 401, 403 and 429, since sites often refuse
  bots, which still means they're there.
- **Warning:** no answer within the timeout, a network error, `404`, `410`, or any `5xx`.
- **Budget:** at most 100 URLs per publish; the rest are skipped, and the warning says so.
- **Timing:** the check starts as soon as the export exists and runs during upload and
  verification. The publish awaits it only after verification, so it adds no time to a normal
  publish.
- **Storage:** warnings are stored as JSON in `publishes.warnings`:
  `[{ kind: "outside-link", page, url, status? }]`.
- **Switch:** `PUBLISH_CHECK_OUTSIDE_LINKS=false` turns the check off. The end-to-end
  environment sets it, because the e2e runs have no internet.

### 4. Verifying the live website through the target

`PublishTarget` gains `fetchLive?(url, init)`, which falls back to the global `fetch`:

| Target | How `fetchLive` reaches the website |
| --- | --- |
| Webmio hosting | `HostingBackend.fetchSite`: AWS uses `fetch`; the folder fake answers through `serveFake` without HTTP |
| Netlify | `fetch`; with a non-default `apiUrl` (the fake), `https://<name>.netlify.app/<path>` is rewritten to `<apiUrl>/sites/<name>/<path>` |

`verifyLive(files, address, fetchLive, { deadlineMs: 120_000 })`:

1. **The home page first.** It polls `/` every 3 seconds until its bytes equal the exported
   `index.html`, which shows the switch has reached the edge.
2. **Every file once, eight at a time:**
   - text files (`.html`, `.css`, `.js`, `.xml`, `.txt`, `.json`, `.webmanifest`) are fetched
     with `GET` and compared by SHA-256;
   - other files are checked with `HEAD`, whose `content-length` must equal the file's size;
     without the header, a `GET` and its byte length decide.
   - Page paths are fetched as their address (`kontakt/index.html` → `/kontakt/`), so the
     router and redirects are part of what is verified.
   - `_redirects` and the manifest are skipped.
3. **Retries:** a mismatch is retried every 5 seconds until the deadline.

The failure names the first few addresses that never matched, in the same message form as
decision 2.

- **The address:** `siteAddress(hosting)`, the ready custom domain or else the free address,
  so a domain's tenant and certificate are part of what is verified.
- **Caching:** requests carry `cache: "no-store"`. The edge's cache key includes the deploy, so
  a stale answer means the switch hasn't arrived, never an old cache entry.

*Alternative:* checking only the home page, or a marker file. The spec asks for every page and
file; the cost is one request per file once the home page matches. Rejected.

### 5. Rollback after a failed verification

`publish.ts` remembers the live publish before deploying (`livePublishId` and its `deployId`):

- **There was one:** `target.restore(siteId, previousDeployId)`. On Webmio hosting it then
  calls `prune` with the kept set, which no longer includes the failed deploy (it isn't
  `ready`), so the failed deploy's files go.
- **First publish:** the new optional `target.takeOffline(site)`:

  | Target | Taking a first publish offline |
  | --- | --- |
  | Webmio hosting | deletes `s:<siteId>`. The `h:` keys stay, so the address answers "No website here", and the name stays reserved for the next try. |
  | Netlify | has no "unpublish", so it deletes the new site, and `publish.ts` deletes the `project_hosting` row. The next publish creates a site again. |

- **A failed rollback** (the hosting unreachable at that moment) is reported in the message:
  "and the previous version couldn't be put back". The publish is recorded as failed either
  way.

### 6. Running publishes beside each other

The single `queue` becomes a chain per project, with at most three projects publishing at once
on a server (a small semaphore). `publishesSettled()` waits for all of them.

- **Why it's safe:** KVS writes retry on ETag conflicts (`own-hosting` decision 2), S3 and
  Netlify calls don't interfere across sites, and SQLite writes are synchronous.
- **What it fixes:** a verification can wait up to two minutes, which must not hold up other
  workspaces.

### 7. What the owner sees

Two columns are added in migration `0005_safe_publishing.sql`: `publishes.step` (text, null when
done) and `publishes.warnings` (JSON text, null when there are none).

- **The publishing state API** returns `step` and `warnings` for each publish. Whether the
  previous version is still online is part of the stored failure message, so it needs no field
  of its own.
- **Messages:** the failure is stored as one localized message, as today, composed from the
  reason and the outcome:
  - `server.publishing.failedKept`: "Publishing failed: {reason} Your previous version is still
    online."
  - `server.publishing.failedFirst`: "Publishing failed: {reason} The website isn't online
    yet."
  - The reasons are the check failure, "the website didn't show the new version", and the
    existing hosting errors. A failed rollback uses its own variant.
- **Publish button:** it shows the step while running ("Checking the site…", "Uploading…",
  "Verifying the website…"). After a failure it shows the message and **Try again**, the same
  action as Publish.
- **Publish page history:**
  - a failed publish shows its message, and **Try again** on the newest one;
  - a published one with warnings shows "N links to other websites didn't answer" with the
    list folded open.

### 8. Tests

- **`@webmio/export`:** unit tests for `checkSiteLinks` (srcset, fonts relative to the
  stylesheet, `_redirects`, full own-address links, outside links, ignored schemes).
- **Admin units:** `checkOutsideLinks` and `verifyLive` with an injected `fetch` and short
  deadlines.
- **Admin routes against the fakes:** both targets, with a `HostingEnv.fetchLive` override to
  simulate a stale or broken edge. They cover the spec's scenarios: steps, a broken internal
  link, outside warnings, verification failure with and without a previous publish, Netlify
  rollback, and Try again.
- **Playwright:** with Webmio hosting on, a publish shows its steps, a forced verification
  failure shows the message and Try again, and Try again publishes. The failure is forced by a
  fake switch, `serveStale`.

## Risks / Trade-offs

- **[A CDN or Netlify rewrites what it serves, so bytes differ]** → Webmio hosting serves the
  bytes it stored; compression is undone by `fetch`. Netlify's asset optimisation is off by
  default for new sites, but if it rewrites pages, verification fails on every publish. The
  `dev` check in tasks includes a Netlify site. If that happens, Netlify pages are compared
  ignoring whitespace and injected snippets, which would be an amendment here.
- **[The admin's own network is down]** → Verification fails and rolls back a good publish. The
  message says the website couldn't be checked, and Try again works once the network is back.
  Publishing never leaves a website in an unknown state.
- **[Two minutes of waiting]** → Only when the edge is slow. Decision 6 keeps other projects
  moving. Measured on the `dev` stack (2026-10-09), publishing through the admin's own code:
  - a new website's first publish: verified and ready in 65 seconds, most of it waiting for its
    address to reach the edge;
  - a change to it: ready in 32 seconds;
  - a forced failure (a 2-second deadline): failed in 4 seconds. The previous version was back at
    once and stayed for the minute watched, and the failed publish's files were deleted.

  Netlify wasn't checked: there was no token for a test team. Its fake verifies in every test.
- **[A restart during verification]** → The interrupted publish is marked failed on startup, but
  its deploy may already be live while the history marks the previous one live. Publishing
  again settles it. Resuming the rollback on startup is left to `scheduled-jobs`.
- **[Outside-link checks look like a bot to other websites]** → One `HEAD` per unique URL per
  publish, at most 100, with a `User-Agent` naming Webmio.
- **[Netlify first publish deletes the site]** → Its `sc-<id>` name may be taken by another
  site in between; `ensureSite` already tries `-2`, `-3` and so on.
