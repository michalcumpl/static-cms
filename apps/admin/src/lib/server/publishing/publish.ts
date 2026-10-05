import { exportSiteLanguages } from "@webmio/export";
import { type Problem, usedMediaFiles } from "@webmio/model";
import { and, desc, eq, sql } from "drizzle-orm";
import { type Locale, type Said, said, sayIn } from "$lib/i18n";
import type { Db } from "../db/index";
import { projectHosting, projects, publishDocuments, publishes, users } from "../db/schema";
import { siteFonts } from "../fonts";
import { newId } from "../ids";
import { mediaFiles } from "../media";
import { type LanguageSite, languageErrors, readLanguages } from "../site-documents";
import { type NetlifyEnv, publishTarget } from "./connection";
import { dnsRecords } from "./domains";
import { earlierAddresses } from "./redirects";
import { PublishError, type PublishTarget } from "./target";

// The publish job (netlify-publishing design.md decision 4): export the saved site, deploy it
// to the workspace's Netlify team, record the outcome. One publish runs at a time per server.

export const NOT_CONNECTED = said("server.publishing.notConnected");
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

/** The site's address: its custom domain once ready, otherwise its netlify.app address. */
export function siteAddress(
  hosting: typeof projectHosting.$inferSelect | undefined,
): string | undefined {
  if (!hosting) return undefined;
  return hosting.domain && hosting.domainState === "ready"
    ? `https://${hosting.domain}`
    : hosting.defaultUrl;
}

/** `sc-<project id>` as a Netlify site name: lowercase letters, digits and dashes. */
export function siteNameFor(projectId: string): string {
  return `sc-${projectId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

function workspaceOf(db: Db, projectId: string): string | undefined {
  return db
    .select({ id: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .get()?.id;
}

/**
 * Starts publishing a project's saved site. Refuses when the workspace isn't connected, a
 * publish is running, or the saved document has errors; otherwise records a running publish
 * and deploys it in the background.
 */
export function startPublish(
  db: Db,
  projectId: string,
  userId: string,
  /** `locale`: the language of the person publishing, for a failure recorded later. */
  options: NetlifyEnv & { pollDelays?: number[]; locale?: Locale } = {},
): StartResult {
  const workspaceId = workspaceOf(db, projectId);
  const sites = readLanguages(db, projectId, "published");
  const primary = sites.find((site) => site.primary);
  if (!workspaceId || !primary)
    return { ok: false, reason: "not-found", message: said("server.notFound") };
  const connection = publishTarget(db, workspaceId, options);
  if (!connection) return { ok: false, reason: "not-connected", message: NOT_CONNECTED };
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

async function ensureSite(
  db: Db,
  projectId: string,
  target: PublishTarget,
  accountSlug: string,
): Promise<typeof projectHosting.$inferSelect> {
  const existing = db
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  // A site belongs to the team it was created in; another team means a new site there.
  if (existing && existing.accountSlug === accountSlug) return existing;
  const base = siteNameFor(projectId);
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const created = await target.createSite(attempt === 1 ? base : `${base}-${attempt}`);
      const row = {
        projectId,
        provider: "netlify" as const,
        accountSlug,
        siteId: created.siteId,
        siteName: created.siteName,
        defaultUrl: created.defaultUrl,
        domain: null,
        domainState: null,
        domainCheckedAt: null,
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
  throw new PublishError("failed", said("server.publishing.noFreeName"));
}

async function runPublish(
  db: Db,
  projectId: string,
  publishId: string,
  sites: readonly LanguageSite[],
  connection: { target: PublishTarget; accountSlug: string },
  locale: Locale,
): Promise<void> {
  try {
    const hosting = await ensureSite(db, projectId, connection.target, connection.accountSlug);
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
    })
    .from(publishes)
    .leftJoin(users, eq(users.id, publishes.publishedBy))
    .where(eq(publishes.projectId, projectId))
    .orderBy(desc(publishes.startedAt), desc(publishes.id))
    .all()
    .map((row) => ({
      ...row,
      live: row.id === hosting?.livePublishId,
      languages: languagesOf(db, row.id),
    }));
  return {
    address: siteAddress(hosting) ?? null,
    siteName: hosting?.siteName ?? null,
    defaultUrl: hosting?.defaultUrl ?? null,
    domain: hosting?.domain ?? null,
    domainState: hosting?.domainState ?? null,
    dnsRecords: hosting?.domain ? dnsRecords(hosting.domain, hosting.siteName) : [],
    publishes: history,
  };
}

export type RestoreResult =
  | { ok: true }
  | { ok: false; reason: "not-found" | "not-connected"; message: Said };

/** Makes an earlier successful publish live again (Netlify's restore; nothing is uploaded). */
export async function restorePublish(
  db: Db,
  projectId: string,
  publishId: string,
  options: NetlifyEnv = {},
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
  if (publish?.state !== "ready" || !publish.deployId || !hosting) {
    return { ok: false, reason: "not-found", message: said("server.publishing.cantRestore") };
  }
  const workspaceId = workspaceOf(db, projectId) ?? "";
  const connection = publishTarget(db, workspaceId, options);
  if (!connection) return { ok: false, reason: "not-connected", message: NOT_CONNECTED };
  await connection.target.restore(hosting.siteId, publish.deployId);
  db.update(projectHosting)
    .set({ livePublishId: publishId })
    .where(eq(projectHosting.projectId, projectId))
    .run();
  return { ok: true };
}
