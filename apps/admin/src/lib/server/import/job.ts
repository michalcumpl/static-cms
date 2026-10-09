import { type ImportReport, type LeftOut, readSite } from "@webmio/import";
import { LANGUAGES } from "@webmio/render";
import { and, eq } from "drizzle-orm";
import { sayIn } from "../../i18n/translate";
import { type Locale, type Said, said } from "../../i18n/types";
import type { Db } from "../db/index";
import { type ImportProgress, imports, pageOrigins } from "../db/schema";
import { newId } from "../ids";
import { createSiteProject } from "../load-site";
import { type CrawlFailure, crawl } from "./crawl";
import { fetchImages } from "./images";
import { isPublicAddress, type SafeFetchOptions } from "./safe-fetch";

// The import as a background job (site-import spec, "Import progress"; design decision 9): one
// at a time on the server, its progress and outcome in the `imports` table.

/** How long a whole import may take. */
export const IMPORT_DEADLINE_MS = 5 * 60_000;

export interface StartImport {
  workspaceId: string;
  userId: string;
  address: string;
  /** The owner confirmed they may use the site's content. */
  confirmed: boolean;
  /** The interface language: the language of messages, and of a site whose own isn't offered. */
  locale: Locale;
}

export type StartResult = { ok: true; importId: string } | { ok: false; message: Said };

const FAILURES: Record<CrawlFailure, Said> = {
  blocked: said("server.import.blocked"),
  unreachable: said("server.import.unreachable"),
  "not-html": said("server.import.notHtml"),
  disallowed: said("server.import.disallowed"),
  "script-built": said("server.import.scriptBuilt"),
};

let queue: Promise<unknown> = Promise.resolve();

/** Resolves when every import started so far has finished (tests). */
export function importsSettled(): Promise<unknown> {
  return queue;
}

/**
 * The address to import: `https://` added when it has no scheme; undefined unless it is an
 * `http` or `https` address of a domain name or a public IP address.
 */
export function importAddress(
  input: string,
  allowHosts: ReadonlySet<string> = new Set(),
): URL | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  let url: URL;
  try {
    // A scheme is letters then a colon and two slashes; `pekarna.cz:8080` has none.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  if (url.username || url.password) return undefined;
  url.hash = "";
  // The tests' local server.
  if (allowHosts.has(url.host)) return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (/^[\d.]+$/.test(host) || host.includes(":")) return isPublicAddress(host) ? url : undefined;
  // A domain name: at least one dot, and not a name only a local network knows.
  if (!host.includes(".") || /\.(local|localhost|internal|lan|home|corp)$/i.test(host)) {
    return undefined;
  }
  return url;
}

/** Starts an import, or says why it can't. */
export function startImport(
  db: Db,
  start: StartImport,
  options: SafeFetchOptions = {},
): StartResult {
  if (!start.confirmed) return { ok: false, message: said("server.import.confirm") };
  const url = importAddress(start.address, options.allowHosts);
  if (!url) return { ok: false, message: said("server.import.notAddress") };
  const running = db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.userId, start.userId), eq(imports.state, "running")))
    .get();
  if (running) return { ok: false, message: said("server.import.running") };

  const importId = newId("im");
  db.insert(imports)
    .values({
      id: importId,
      workspaceId: start.workspaceId,
      userId: start.userId,
      address: url.href,
      state: "running",
      progress: { phase: "pages", done: 0, total: 1 },
      startedAt: new Date(),
    })
    .run();
  const run = () => runImport(db, importId, url.href, start, options);
  queue = queue.then(run, run);
  return { ok: true, importId };
}

/** Imports still running when the server starts again were interrupted: they fail. */
export function failInterruptedImports(db: Db, locale: Locale = "en"): number {
  const result = db
    .update(imports)
    .set({
      state: "failed",
      error: sayIn(locale, said("server.import.interrupted")),
      finishedAt: new Date(),
    })
    .where(eq(imports.state, "running"))
    .run();
  return result.changes;
}

async function runImport(
  db: Db,
  importId: string,
  address: string,
  start: StartImport,
  options: SafeFetchOptions,
): Promise<void> {
  const progress = (value: ImportProgress) =>
    db.update(imports).set({ progress: value }).where(eq(imports.id, importId)).run();
  const fail = (message: Said) =>
    db
      .update(imports)
      .set({ state: "failed", error: sayIn(start.locale, message), finishedAt: new Date() })
      .where(eq(imports.id, importId))
      .run();
  const deadline = AbortSignal.timeout(IMPORT_DEADLINE_MS);
  const signal = options.signal ? AbortSignal.any([deadline, options.signal]) : deadline;
  const fetching = { ...options, signal };
  try {
    const crawled = await crawl(address, {
      ...fetching,
      onProgress: (done, total) => progress({ phase: "pages", done, total }),
    });
    if (!crawled.ok) {
      fail(FAILURES[crawled.failure]);
      return;
    }
    const readOptions = {
      languages: Object.keys(LANGUAGES),
      fallbackLanguage: start.locale,
      leftOut: crawled.leftOut,
    };
    const references = readSite(crawled.pages, readOptions).images;
    const fetched = await fetchImages(references, {
      ...fetching,
      onProgress: (done, total) => progress({ phase: "images", done, total }),
    });
    progress({ phase: "building", done: 0, total: 1 });
    const site = readSite(crawled.pages, { ...readOptions, images: fetched.byReference });
    const report = withImageLimit(
      site.report,
      references.slice(references.length - fetched.overLimit),
      fetched.overLimit,
    );

    const created = await createSiteProject(
      db,
      start.workspaceId,
      start.userId,
      {
        name: site.name || new URL(address).hostname,
        primaryLang: site.lang,
        source: address,
        languages: new Map([[site.lang, { label: site.lang, doc: site.document as never }]]),
        files: fetched.files,
      },
      { allowSiteProblems: true },
    );
    if (!created.ok) {
      fail(said("server.import.failed", { error: created.problems.join(" ") }));
      return;
    }
    const origins = site.origins.filter((o) => o.pageId !== "");
    if (origins.length > 0) {
      db.insert(pageOrigins)
        .values(
          origins.map((o) => ({
            projectId: created.projectId,
            lang: site.lang,
            pageId: o.pageId,
            path: o.path,
          })),
        )
        .run();
    }
    db.update(imports)
      .set({
        state: "done",
        projectId: created.projectId,
        report,
        progress: { phase: "building", done: 1, total: 1 },
        finishedAt: new Date(),
      })
      .where(eq(imports.id, importId))
      .run();
  } catch (error) {
    fail(said("server.import.failed", { error: String(error) }));
  }
}

/** The report with images over the limit counted once, not each as an image that failed. */
function withImageLimit(
  report: ImportReport,
  over: readonly { id: string; candidates: string[] }[],
  count: number,
): ImportReport {
  if (count === 0) return report;
  const skipped = new Set(over.map((r) => r.candidates[0] ?? r.id));
  const leftOut: LeftOut[] = report.leftOut.filter(
    (l) => !(l.reason === "image" && skipped.has(l.detail ?? "")),
  );
  leftOut.push({ reason: "images-over-limit", detail: String(count) });
  return { ...report, leftOut };
}

export interface ImportRow {
  id: string;
  workspaceId: string;
  userId: string | null;
  address: string;
  state: "running" | "done" | "failed";
  progress: ImportProgress | null;
  error: string | null;
  projectId: string | null;
  report: ImportReport | null;
  reviewDismissed: boolean;
}

/** An import by its ID, for the person who started it. */
export function readImport(db: Db, importId: string, userId: string): ImportRow | undefined {
  const row = db
    .select()
    .from(imports)
    .where(and(eq(imports.id, importId), eq(imports.userId, userId)))
    .get();
  return row ? { ...row, report: row.report as ImportReport | null } : undefined;
}

/** The import that made a project, if any. */
export function projectImport(db: Db, projectId: string): ImportRow | undefined {
  const row = db.select().from(imports).where(eq(imports.projectId, projectId)).get();
  return row ? { ...row, report: row.report as ImportReport | null } : undefined;
}

/** Dismisses a project's import review. */
export function dismissReview(db: Db, projectId: string): void {
  db.update(imports).set({ reviewDismissed: true }).where(eq(imports.projectId, projectId)).run();
}
