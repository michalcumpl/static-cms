import { exportSite, type Problem, usedImageFiles } from "@static-cms/site";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { projectHosting, projects, publishes, users } from "../db/schema";
import { newId } from "../ids";
import { mediaFiles } from "../media";
import { readSite } from "../site-documents";
import { type NetlifyEnv, publishTarget } from "./connection";
import { dnsRecords } from "./domains";
import { earlierAddresses } from "./redirects";
import { PublishError, type PublishTarget } from "./target";

// The publish job (netlify-publishing design.md decision 4): export the saved site, deploy it
// to the workspace's Netlify team, record the outcome. One publish runs at a time per server.

export const NOT_CONNECTED =
  "This workspace isn't connected to Netlify yet. An owner can connect it in the workspace settings.";
export const ALREADY_RUNNING = "A publish of this site is already running.";

export type StartResult =
  | { ok: true; publishId: string }
  | { ok: false; reason: "not-found" | "not-connected" | "running"; message: string }
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
  options: NetlifyEnv & { pollDelays?: number[] } = {},
): StartResult {
  const workspaceId = workspaceOf(db, projectId);
  const site = readSite(db, projectId);
  if (!workspaceId || !site) return { ok: false, reason: "not-found", message: "Not found" };
  const connection = publishTarget(db, workspaceId, options);
  if (!connection) return { ok: false, reason: "not-connected", message: NOT_CONNECTED };
  const running = db
    .select({ id: publishes.id })
    .from(publishes)
    .where(and(eq(publishes.projectId, projectId), eq(publishes.state, "running")))
    .get();
  if (running) return { ok: false, reason: "running", message: ALREADY_RUNNING };
  const errors = site.problems.filter((p) => p.severity === "error");
  if (errors.length > 0) return { ok: false, reason: "invalid", problems: errors };

  const publishId = newId("pb");
  db.insert(publishes)
    .values({
      id: publishId,
      projectId,
      versionId: site.versionId,
      state: "running",
      publishedBy: userId,
      startedAt: new Date(),
    })
    .run();
  const run = () => runPublish(db, projectId, publishId, site.document, connection);
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
  throw new PublishError("failed", "Couldn't find a free site name at Netlify.");
}

async function runPublish(
  db: Db,
  projectId: string,
  publishId: string,
  document: unknown,
  connection: { target: PublishTarget; accountSlug: string },
): Promise<void> {
  try {
    const hosting = await ensureSite(db, projectId, connection.target, connection.accountSlug);
    const url = siteAddress(hosting) as string;
    const redirects = earlierAddresses(db, projectId, document);
    const media = mediaFiles(projectId, usedImageFiles(document));
    const exported = exportSite(document, media, { siteUrl: url, redirects });
    if (!exported.ok) {
      throw new PublishError("failed", exported.problems.map((p) => p.message).join(" "));
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
    const message =
      error instanceof PublishError ? error.message : `Publishing failed: ${String(error)}`;
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
    .map((row) => ({ ...row, live: row.id === hosting?.livePublishId }));
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
  | { ok: false; reason: "not-found" | "not-connected"; message: string };

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
    return { ok: false, reason: "not-found", message: "That publish can't be made live again." };
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
