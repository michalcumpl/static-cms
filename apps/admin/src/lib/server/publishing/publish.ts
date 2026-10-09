import { checkSiteLinks, exportSiteLanguages } from "@webmio/export";
import { type Problem, usedMediaFiles } from "@webmio/model";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { type Locale, type Said, said, sayIn } from "$lib/i18n";
import type { Db } from "../db/index";
import {
  type PublishWarning,
  projectHosting,
  projects,
  publishDocuments,
  publishes,
  type publishSteps,
  users,
} from "../db/schema";
import { siteFonts } from "../fonts";
import { newId } from "../ids";
import { mediaFiles } from "../media";
import { type LanguageSite, languageErrors, readLanguages } from "../site-documents";
import { type HostingEnv, NOT_CONNECTED, type ProjectTarget, targetFor } from "./connection";
import { type DnsRecord, domainInstructions, servedHost } from "./domains";
import {
  checkOutsideLinks,
  type OutsideLinkOptions,
  outsideLinkChecksEnabled,
} from "./outside-links";
import { earlierAddresses } from "./redirects";
import { freeSiteNames, siteNameFor } from "./site-names";
import { hostedSite, PublishError } from "./target";
import { type FetchLive, type VerifyOptions, verifyLive } from "./verify";

// The publish job (netlify-publishing design.md decision 4, own-hosting design.md decisions 8
// and 10, safe-publishing design.md): export the saved site, check its links, deploy it to the
// project's hosting, verify the live website, go back to the previous version when that fails,
// and on Webmio hosting delete the files of publishes no longer kept. A project's publishes run
// one at a time; up to three projects publish at once.

export { NOT_CONNECTED, siteNameFor };
export const ALREADY_RUNNING = said("server.publishing.running");

export type StartResult =
  | { ok: true; publishId: string }
  | { ok: false; reason: "not-found" | "not-connected" | "running"; message: Said }
  | { ok: false; reason: "invalid"; problems: Problem[] };

/** At most this many projects publish at once on a server (design.md decision 6). */
export const PUBLISHING_AT_ONCE = 3;

/** Each project's publishes run one after another; projects run beside each other. */
const chains = new Map<string, Promise<void>>();
const running = new Set<Promise<void>>();
let active = 0;
const waiting: (() => void)[] = [];

/** Runs `work` once fewer than `PUBLISHING_AT_ONCE` publishes are running. */
async function inSlot(work: () => Promise<void>): Promise<void> {
  if (active >= PUBLISHING_AT_ONCE) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    await work();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function enqueue(projectId: string, work: () => Promise<void>): void {
  const next = (chains.get(projectId) ?? Promise.resolve()).then(() => inSlot(work));
  chains.set(projectId, next);
  running.add(next);
  void next.finally(() => {
    running.delete(next);
    if (chains.get(projectId) === next) chains.delete(projectId);
  });
}

/** Resolves when every publish started so far has finished (tests). */
export async function publishesSettled(): Promise<void> {
  while (running.size > 0) await Promise.allSettled([...running]);
}

/** What a publish may be given besides the hosting, mostly for tests. */
export interface PublishOptions extends HostingEnv {
  pollDelays?: number[];
  /** The language of the person publishing, for a failure recorded later. */
  locale?: Locale;
  /** Fetches from the live website instead of the target's own way. */
  fetchLive?: FetchLive;
  verify?: VerifyOptions;
  /** How outside links are asked; false skips them. */
  outsideLinks?: OutsideLinkOptions | false;
  /** Changes the exported files before they are checked. */
  alterExport?: (files: Map<string, Uint8Array>) => void;
}

/** How many successful publishes Webmio hosting keeps the files of, besides the live one. */
export const KEPT_PUBLISHES = 10;

/** The site's address: its custom domain once ready (as served), otherwise its free address. */
export function siteAddress(
  hosting: typeof projectHosting.$inferSelect | undefined,
): string | undefined {
  if (!hosting) return undefined;
  return hosting.domain && hosting.domainState === "ready"
    ? `https://${servedHost(hosting.provider, hosting.domain)}`
    : hosting.defaultUrl;
}

function workspaceOf(db: Db, projectId: string): string | undefined {
  return db
    .select({ id: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()?.id;
}

/**
 * Starts publishing a project's saved site. Refuses when there is no hosting to publish to, a
 * publish is running, or the saved document has errors; otherwise records a running publish
 * and deploys it in the background.
 */
export function startPublish(
  db: Db,
  projectId: string,
  userId: string,
  options: PublishOptions = {},
): StartResult {
  const workspaceId = workspaceOf(db, projectId);
  const sites = readLanguages(db, projectId, "published");
  const primary = sites.find((site) => site.primary);
  if (!workspaceId || !primary)
    return { ok: false, reason: "not-found", message: said("server.notFound") };
  const chosen = targetFor(db, projectId, options);
  if (!chosen.ok) return { ok: false, reason: "not-connected", message: chosen.message };
  const connection = chosen.value;
  const alreadyRunning = db
    .select({ id: publishes.id })
    .from(publishes)
    .where(and(eq(publishes.projectId, projectId), eq(publishes.state, "running")))
    .get();
  if (alreadyRunning) return { ok: false, reason: "running", message: ALREADY_RUNNING };
  const errors = languageErrors(sites);
  if (errors.length > 0) return { ok: false, reason: "invalid", problems: errors };

  const publishId = newId("pb");
  db.transaction((tx) => {
    tx.insert(publishes)
      .values({
        id: publishId,
        projectId,
        versionId: primary.versionId,
        state: "running",
        publishedBy: userId,
        startedAt: new Date(),
      })
      .run();
    for (const site of sites) {
      tx.insert(publishDocuments)
        .values({ publishId, lang: site.lang, versionId: site.versionId })
        .run();
    }
  });
  enqueue(projectId, () => runPublish(db, projectId, publishId, sites, connection, options));
  return { ok: true, publishId };
}

/** The names to try for a new site: free addresses on Webmio hosting, `sc-<id>` on Netlify. */
function* siteNames(db: Db, projectId: string, provider: ProjectTarget["provider"]) {
  if (provider === "webmio") {
    const name =
      db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).get()
        ?.name ?? "";
    yield* freeSiteNames(db, name);
    return;
  }
  const base = siteNameFor(projectId);
  yield base;
  for (let n = 2; ; n++) yield `${base}-${n}`;
}

async function ensureSite(
  db: Db,
  projectId: string,
  connection: ProjectTarget,
): Promise<typeof projectHosting.$inferSelect> {
  const existing = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  // A site belongs to the hosting and team it was created in; anything else means a new site.
  if (
    existing &&
    existing.provider === connection.provider &&
    existing.accountSlug === connection.accountSlug
  ) {
    return existing;
  }
  const names = siteNames(db, projectId, connection.provider);
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const created = await connection.target.createSite(names.next().value as string);
      const row = {
        projectId,
        provider: connection.provider,
        accountSlug: connection.accountSlug,
        siteId: created.siteId,
        siteName: created.siteName,
        defaultUrl: created.defaultUrl,
        domain: null,
        domainState: null,
        domainCheckedAt: null,
        domainTenantId: null,
        livePublishId: null,
      };
      db.insert(projectHosting)
        .values(row)
        .onConflictDoUpdate({ target: projectHosting.projectId, set: row })
        .run();
      return row;
    } catch (error) {
      if (error instanceof PublishError && error.kind === "name-taken") continue;
      throw error;
    }
  }
  throw new PublishError(
    "failed",
    said(
      connection.provider === "webmio"
        ? "server.publishing.noFreeAddress"
        : "server.publishing.noFreeName",
    ),
  );
}

/**
 * Deletes the files of the publishes Webmio hosting no longer keeps (design.md decision 10): all
 * but the newest successful ones and the live one. A failure here leaves files behind, never
 * fails the publish.
 */
async function prunePublishes(db: Db, projectId: string, siteId: string, target: ProjectTarget) {
  if (!target.target.prune) return;
  const withFiles = db
    .select({ id: publishes.id, deployId: publishes.deployId })
    .from(publishes)
    .where(
      and(
        eq(publishes.projectId, projectId),
        eq(publishes.state, "ready"),
        isNull(publishes.filesDeletedAt),
        isNotNull(publishes.deployId),
      ),
    )
    .orderBy(desc(publishes.startedAt), desc(publishes.id))
    .all();
  const live = db
    .select({ id: projectHosting.livePublishId })
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get()?.id;
  const kept = withFiles.filter((publish, index) => index < KEPT_PUBLISHES || publish.id === live);
  try {
    await target.target.prune(
      siteId,
      kept.map((publish) => publish.deployId as string),
    );
  } catch {
    return;
  }
  const keptIds = new Set(kept.map((publish) => publish.id));
  const deleted = withFiles.filter((publish) => !keptIds.has(publish.id));
  if (deleted.length === 0) return;
  db.update(publishes)
    .set({ filesDeletedAt: new Date() })
    .where(
      inArray(
        publishes.id,
        deleted.map((publish) => publish.id),
      ),
    )
    .run();
}

function setStep(db: Db, publishId: string, step: (typeof publishSteps)[number]): void {
  db.update(publishes).set({ step }).where(eq(publishes.id, publishId)).run();
}

/**
 * The server's verification deadline: `PUBLISH_VERIFY_DEADLINE_MS`, for the end-to-end runs whose
 * fake hosting answers at once; otherwise the default of about two minutes.
 */
function verifyDeadlineOf(env: Record<string, string | undefined> = process.env): VerifyOptions {
  const ms = Number(env.PUBLISH_VERIFY_DEADLINE_MS);
  return Number.isFinite(ms) && ms > 0 ? { deadlineMs: ms, pollMs: 200, retryMs: 200 } : {};
}

/** At most this many broken links are named in a failure; the rest are counted. */
const NAMED_LINKS = 5;

/** A list of addresses for a message: the first few, then "and N more". */
function listed(items: readonly string[], locale: Locale): string {
  const named = items.slice(0, NAMED_LINKS);
  const more = items.length - named.length;
  return more > 0
    ? `${named.join("; ")}; ${sayIn(locale, said("server.publishing.andMore", { count: String(more) }))}`
    : named.join("; ");
}

/** The deploy that was live before this publish, if the website had one. */
function liveDeployOf(db: Db, hosting: typeof projectHosting.$inferSelect): string | undefined {
  if (!hosting.livePublishId) return undefined;
  return (
    db
      .select({ deployId: publishes.deployId })
      .from(publishes)
      .where(eq(publishes.id, hosting.livePublishId))
      .get()?.deployId ?? undefined
  );
}

/**
 * After a failed verification (design.md decision 5): the previous deploy is made live again and
 * the failed one's files go, or a first publish is taken offline. Throws when the hosting
 * refuses.
 */
async function rollBack(
  db: Db,
  projectId: string,
  hosting: typeof projectHosting.$inferSelect,
  connection: ProjectTarget,
  previousDeploy: string | undefined,
): Promise<void> {
  const { target } = connection;
  if (previousDeploy) {
    await target.restore(hosting.siteId, previousDeploy);
    // The failed publish isn't "ready", so it isn't kept: its files go.
    await prunePublishes(db, projectId, hosting.siteId, connection);
    return;
  }
  const result = await target.takeOffline?.(hosting.siteId, hostedSite(hosting));
  if (result?.siteDeleted) {
    db.delete(projectHosting).where(eq(projectHosting.projectId, projectId)).run();
  }
}

/** A failure's reason as the member reads it. */
function reasonOf(error: unknown, locale: Locale): string {
  return sayIn(
    locale,
    error instanceof PublishError
      ? error.said
      : said("server.publishing.unexpected", { error: String(error) }),
  );
}

/**
 * The publish job (design.md decision 1): check the export, upload and switch, verify the live
 * website, and on a failed verification go back to what was live before.
 */
async function runPublish(
  db: Db,
  projectId: string,
  publishId: string,
  sites: readonly LanguageSite[],
  connection: ProjectTarget,
  options: PublishOptions,
): Promise<void> {
  const locale = options.locale ?? "en";
  let hosting: typeof projectHosting.$inferSelect | undefined;
  let previousDeploy: string | undefined;
  let switched = false;
  try {
    setStep(db, publishId, "checking");
    hosting = await ensureSite(db, projectId, connection);
    previousDeploy = liveDeployOf(db, hosting);
    const url = siteAddress(hosting) as string;
    const redirects = sites.flatMap((site) =>
      earlierAddresses(
        db,
        projectId,
        site.lang,
        site.document,
        site.primary ? "/" : `/${site.lang}/`,
      ),
    );
    const names = new Set(sites.flatMap((site) => usedMediaFiles(site.document)));
    const media = await mediaFiles(projectId, [...names]);
    const fonts = await siteFonts(sites);
    const exported = exportSiteLanguages(
      sites.map(({ lang, document, primary }) => ({ lang, document, primary })),
      media,
      { siteUrl: url, redirects, fonts },
    );
    if (!exported.ok) {
      throw new PublishError(
        "failed",
        said("server.publishing.problems", {
          problems: exported.problems.map((p) => p.message).join(" "),
        }),
      );
    }
    const files = new Map(exported.files);
    options.alterExport?.(files);

    // Every reference into the website must lead to a file of this publish.
    const links = checkSiteLinks(files, { siteUrl: url });
    if (links.broken.length > 0) {
      const pairs = links.broken.map(({ page, address }) =>
        sayIn(locale, said("server.publishing.brokenLink", { page, address })),
      );
      throw new PublishError(
        "failed",
        said("server.publishing.brokenLinks", { links: listed(pairs, locale) }),
      );
    }
    // Links to other websites are asked meanwhile; they only ever warn.
    // Options given for the check run it; otherwise the server's switch decides.
    const askOutside =
      options.outsideLinks === undefined
        ? outsideLinkChecksEnabled(options.env)
        : options.outsideLinks !== false;
    const outside = askOutside
      ? checkOutsideLinks(links.outside, options.outsideLinks || {})
      : Promise.resolve([]);

    setStep(db, publishId, "uploading");
    const { deployId } = await connection.target.deploy(hosting.siteId, files);
    switched = true;
    db.update(publishes).set({ deployId }).where(eq(publishes.id, publishId)).run();

    setStep(db, publishId, "verifying");
    const fetchLive: FetchLive =
      options.fetchLive ??
      ((input, init) => connection.target.fetchLive?.(input, init) ?? fetch(input, init));
    const verified = await verifyLive(files, url, fetchLive, {
      ...verifyDeadlineOf(options.env),
      ...options.verify,
    });
    if (!verified.ok) {
      throw new PublishError(
        "failed",
        said("server.publishing.notServed", { addresses: listed(verified.failing, locale) }),
      );
    }

    const warnings = await outside;
    db.update(publishes)
      .set({
        state: "ready",
        step: null,
        url,
        redirectsCount: redirects.length,
        warnings: warnings.length > 0 ? warnings : null,
        finishedAt: new Date(),
      })
      .where(eq(publishes.id, publishId))
      .run();
    db.update(projectHosting)
      .set({ livePublishId: publishId })
      .where(eq(projectHosting.projectId, projectId))
      .run();
    await prunePublishes(db, projectId, hosting.siteId, connection);
  } catch (error) {
    const reason = reasonOf(error, locale);
    let message = sayIn(
      locale,
      said(previousDeploy ? "server.publishing.failedKept" : "server.publishing.failedFirst", {
        reason,
      }),
    );
    // Once the new publish is live, a failure means going back to what was live before.
    if (switched && hosting) {
      try {
        await rollBack(db, projectId, hosting, connection, previousDeploy);
      } catch (rollbackError) {
        message = sayIn(
          locale,
          said("server.publishing.failedRollback", {
            reason,
            rollback: reasonOf(rollbackError, locale),
          }),
        );
      }
    }
    db.update(publishes)
      .set({ state: "failed", step: null, error: message, finishedAt: new Date() })
      .where(eq(publishes.id, publishId))
      .run();
  }
}

export interface PublishSummary {
  id: string;
  state: "running" | "ready" | "failed";
  url: string | null;
  error: string | null;
  publishedBy: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  live: boolean;
  /** Whether it can be made live again: it succeeded and its files are still kept. */
  restorable: boolean;
  /** The languages the publish included, the primary first. */
  languages: string[];
  /** What a running publish is doing. */
  step: (typeof publishSteps)[number] | null;
  /** What a successful publish warns about. */
  warnings: PublishWarning[];
}

/** The languages a publish included, in the order they were recorded (the primary first). */
function languagesOf(db: Db, publishId: string): string[] {
  return db
    .select({ lang: publishDocuments.lang })
    .from(publishDocuments)
    .where(eq(publishDocuments.publishId, publishId))
    .orderBy(sql`rowid`)
    .all()
    .map((row) => row.lang);
}

/** The DNS records to set for the project's domain, and where to forward a bare domain. */
function instructionsFor(hosting: typeof projectHosting.$inferSelect | undefined): {
  dnsRecords: DnsRecord[];
  forwardTo: string | null;
} {
  if (!hosting?.domain) return { dnsRecords: [], forwardTo: null };
  const { records, forwardTo } = domainInstructions(
    hosting.provider,
    hosting.domain,
    hosting.siteName,
  );
  return { dnsRecords: records, forwardTo };
}

/** A project's hosting (address, domain) and its publishes, newest first. */
export function publishingState(db: Db, projectId: string) {
  const hosting = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  const history: PublishSummary[] = db
    .select({
      id: publishes.id,
      state: publishes.state,
      url: publishes.url,
      error: publishes.error,
      publishedBy: users.email,
      startedAt: publishes.startedAt,
      finishedAt: publishes.finishedAt,
      deployId: publishes.deployId,
      filesDeletedAt: publishes.filesDeletedAt,
      step: publishes.step,
      warnings: publishes.warnings,
    })
    .from(publishes)
    .leftJoin(users, eq(users.id, publishes.publishedBy))
    .where(eq(publishes.projectId, projectId))
    .orderBy(desc(publishes.startedAt), desc(publishes.id))
    .all()
    .map(({ deployId, filesDeletedAt, warnings, ...row }) => ({
      ...row,
      warnings: warnings ?? [],
      live: row.id === hosting?.livePublishId,
      restorable: row.state === "ready" && deployId !== null && filesDeletedAt === null,
      languages: languagesOf(db, row.id),
    }));
  return {
    provider: hosting?.provider ?? null,
    address: siteAddress(hosting) ?? null,
    siteName: hosting?.siteName ?? null,
    defaultUrl: hosting?.defaultUrl ?? null,
    domain: hosting?.domain ?? null,
    domainState: hosting?.domainState ?? null,
    ...instructionsFor(hosting),
    publishes: history,
  };
}

export type RestoreResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-connected"; message: Said };

/**
 * Makes an earlier successful publish live again, without uploading anything. Refused for a
 * publish whose files Webmio hosting no longer keeps.
 */
export async function restorePublish(
  db: Db,
  projectId: string,
  publishId: string,
  options: HostingEnv = {},
): Promise<RestoreResult> {
  const publish = db
    .select()
    .from(publishes)
    .where(and(eq(publishes.id, publishId), eq(publishes.projectId, projectId)))
    .get();
  const hosting = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  if (publish?.state !== "ready" || !publish.deployId || publish.filesDeletedAt || !hosting) {
    return { ok: false, reason: "not-found", message: said("server.publishing.cantRestore") };
  }
  const chosen = targetFor(db, projectId, options);
  if (!chosen.ok) return { ok: false, reason: "not-connected", message: chosen.message };
  await chosen.value.target.restore(hosting.siteId, publish.deployId);
  db.update(projectHosting)
    .set({ livePublishId: publishId })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return { ok: true };
}
