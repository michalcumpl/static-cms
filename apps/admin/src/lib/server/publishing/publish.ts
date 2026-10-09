import { exportSiteLanguages } from "@webmio/export";
import { type Problem, usedMediaFiles } from "@webmio/model";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { type Locale, type Said, said, sayIn } from "$lib/i18n";
import type { Db } from "../db/index";
import { projectHosting, projects, publishDocuments, publishes, users } from "../db/schema";
import { siteFonts } from "../fonts";
import { newId } from "../ids";
import { mediaFiles } from "../media";
import { type LanguageSite, languageErrors, readLanguages } from "../site-documents";
import { type HostingEnv, NOT_CONNECTED, type ProjectTarget, targetFor } from "./connection";
import { type DnsRecord, domainInstructions, servedHost } from "./domains";
import { earlierAddresses } from "./redirects";
import { freeSiteNames, siteNameFor } from "./site-names";
import { PublishError } from "./target";

// The publish job (netlify-publishing design.md decision 4, own-hosting design.md decisions 8
// and 10): export the saved site, deploy it to the project's hosting, record the outcome, and on
// Webmio hosting delete the files of publishes no longer kept. One publish runs at a time per
// server.

export { NOT_CONNECTED, siteNameFor };
export const ALREADY_RUNNING = said("server.publishing.running");

export type StartResult =
  | { ok: true; publishId: string }
  | { ok: false; reason: "not-found" | "not-connected" | "running"; message: Said }
  | { ok: false; reason: "invalid"; problems: Problem[] };

let queue: Promise<unknown> = Promise.resolve();

/** Resolves when every publish started so far has finished (tests). */
export function publishesSettled(): Promise<unknown> {
  return queue;
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
  /** `locale`: the language of the person publishing, for a failure recorded later. */
  options: HostingEnv & { pollDelays?: number[]; locale?: Locale } = {},
): StartResult {
  const workspaceId = workspaceOf(db, projectId);
  const sites = readLanguages(db, projectId, "published");
  const primary = sites.find((site) => site.primary);
  if (!workspaceId || !primary)
    return { ok: false, reason: "not-found", message: said("server.notFound") };
  const chosen = targetFor(db, projectId, options);
  if (!chosen.ok) return { ok: false, reason: "not-connected", message: chosen.message };
  const connection = chosen.value;
  const running = db
    .select({ id: publishes.id })
    .from(publishes)
    .where(and(eq(publishes.projectId, projectId), eq(publishes.state, "running")))
    .get();
  if (running) return { ok: false, reason: "running", message: ALREADY_RUNNING };
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
  const locale = options.locale ?? "en";
  const run = () => runPublish(db, projectId, publishId, sites, connection, locale);
  queue = queue.then(run, run);
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

async function runPublish(
  db: Db,
  projectId: string,
  publishId: string,
  sites: readonly LanguageSite[],
  connection: ProjectTarget,
  locale: Locale,
): Promise<void> {
  try {
    const hosting = await ensureSite(db, projectId, connection);
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
    const { deployId } = await connection.target.deploy(hosting.siteId, exported.files);
    db.update(publishes)
      .set({
        state: "ready",
        deployId,
        url,
        redirectsCount: redirects.length,
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
    const message = sayIn(
      locale,
      error instanceof PublishError
        ? error.said
        : said("server.publishing.failed", { error: String(error) }),
    );
    db.update(publishes)
      .set({ state: "failed", error: message, finishedAt: new Date() })
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
    })
    .from(publishes)
    .leftJoin(users, eq(users.id, publishes.publishedBy))
    .where(eq(publishes.projectId, projectId))
    .orderBy(desc(publishes.startedAt), desc(publishes.id))
    .all()
    .map(({ deployId, filesDeletedAt, ...row }) => ({
      ...row,
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
