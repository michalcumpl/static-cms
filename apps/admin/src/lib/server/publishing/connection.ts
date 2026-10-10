import { eq } from "drizzle-orm";
import { type Said, said } from "$lib/i18n";
import type { Db } from "../db/index";
import { hostingConnections, projectHosting, projects, users } from "../db/schema";
import { listTeams, type NetlifyTeam, netlifyTarget } from "./netlify";
import { decryptSecret, encryptSecret, secretKey } from "./secrets";
import { PublishError, type PublishTarget } from "./target";
import { webmioTarget } from "./webmio";
import { awsHosting } from "./webmio-aws";
import { type HostingBackend, webmioHostingConfig } from "./webmio-backend";
import { fakeHosting, fakeHostingEnabled } from "./webmio-fake";

// Which hosting a project publishes to (own-hosting design.md decision 8): Webmio hosting, or a
// workspace's connection to its own Netlify team (netlify-publishing design.md decisions 1–3).

export interface ConnectionInfo {
  provider: "netlify";
  accountSlug: string;
  accountName: string;
  connectedBy: string | null;
  connectedAt: Date;
}

/**
 * Where publishing reaches its hosting: Netlify's API (replaceable in tests), the server's
 * environment, and Webmio hosting's backend (`null`: none, whatever the environment says).
 */
export interface HostingEnv {
  apiUrl?: string;
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  webmio?: HostingBackend | null;
}

const apiUrlOf = (options: HostingEnv) =>
  options.apiUrl ?? (options.env ?? process.env).NETLIFY_API_URL ?? undefined;

export const NOT_SET_UP = said("server.publishing.notSetUp");

/** What anyone in the workspace may see of the connection; never the token. */
export function connectionInfo(db: Db, workspaceId: string): ConnectionInfo | undefined {
  const row = db
    .select({
      provider: hostingConnections.provider,
      accountSlug: hostingConnections.accountSlug,
      accountName: hostingConnections.accountName,
      connectedBy: users.email,
      connectedAt: hostingConnections.connectedAt,
    })
    .from(hostingConnections)
    .leftJoin(users, eq(users.id, hostingConnections.connectedBy))
    .where(eq(hostingConnections.workspaceId, workspaceId))
    .get();
  return row ?? undefined;
}

/** The teams a pasted token can publish into; throws `PublishError("unauthorized")` if refused. */
export function teamsForToken(token: string, options: HostingEnv = {}): Promise<NetlifyTeam[]> {
  const apiUrl = apiUrlOf(options);
  return listTeams({
    token: token.trim(),
    ...(apiUrl ? { apiUrl } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}

export type ConnectResult =
  | { ok: true; info: ConnectionInfo }
  | { ok: false; reason: "not-set-up" | "refused" | "unknown-team"; message: Said };

/**
 * Checks the token with Netlify, and stores it encrypted for the workspace with the chosen team.
 * Replaces an earlier connection.
 */
export async function connectWorkspace(
  db: Db,
  workspaceId: string,
  userId: string,
  input: { token: string; account: string },
  options: HostingEnv = {},
): Promise<ConnectResult> {
  const key = secretKey(options.env);
  if (!key) return { ok: false, reason: "not-set-up", message: NOT_SET_UP };
  let teams: NetlifyTeam[];
  try {
    teams = await teamsForToken(input.token, options);
  } catch (error) {
    if (error instanceof PublishError && error.kind === "unauthorized") {
      return {
        ok: false,
        reason: "refused",
        message: said("server.publishing.tokenRefused"),
      };
    }
    throw error;
  }
  const team = teams.find((t) => t.slug === input.account);
  if (!team) {
    return {
      ok: false,
      reason: "unknown-team",
      message: said("server.publishing.wrongTeam"),
    };
  }
  const row = {
    workspaceId,
    provider: "netlify" as const,
    accountSlug: team.slug,
    accountName: team.name,
    tokenEncrypted: encryptSecret(input.token.trim(), key),
    connectedBy: userId,
    connectedAt: new Date(),
  };
  db.insert(hostingConnections)
    .values(row)
    .onConflictDoUpdate({ target: hostingConnections.workspaceId, set: row })
    .run();
  return { ok: true, info: connectionInfo(db, workspaceId) as ConnectionInfo };
}

export function disconnectWorkspace(db: Db, workspaceId: string): boolean {
  return (
    db.delete(hostingConnections).where(eq(hostingConnections.workspaceId, workspaceId)).run()
      .changes > 0
  );
}

/**
 * The target a workspace publishes to, with its team; undefined when the workspace isn't
 * connected or the stored token can't be decrypted (no or another SECRET_KEY).
 */
export function publishTarget(
  db: Db,
  workspaceId: string,
  options: HostingEnv & { pollDelays?: number[] } = {},
): { target: PublishTarget; accountSlug: string } | undefined {
  const key = secretKey(options.env);
  const row = db
    .select()
    .from(hostingConnections)
    .where(eq(hostingConnections.workspaceId, workspaceId))
    .get();
  if (!key || !row) return undefined;
  const token = decryptSecret(row.tokenEncrypted, key);
  if (token === undefined) return undefined;
  const apiUrl = apiUrlOf(options);
  return {
    accountSlug: row.accountSlug,
    target: netlifyTarget({
      token,
      account: row.accountSlug,
      ...(apiUrl ? { apiUrl } : {}),
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.pollDelays ? { pollDelays: options.pollDelays } : {}),
    }),
  };
}

/** One AWS backend per configuration, so its clients and their connections are reused. */
let aws: { key: string; backend: HostingBackend } | undefined;

/**
 * The server's Webmio hosting: the backend passed in (tests), the folder fake that
 * `WEBMIO_HOSTING_FAKE_DIR` names outside production (end-to-end runs), AWS when configured,
 * otherwise none.
 */
export function webmioBackend(options: HostingEnv = {}): HostingBackend | undefined {
  if (options.webmio !== undefined) return options.webmio ?? undefined;
  const env = options.env ?? process.env;
  if (env.WEBMIO_HOSTING_FAKE_DIR && env.NODE_ENV !== "production") {
    if (!fakeHostingEnabled(env.WEBMIO_HOSTING_FAKE_DIR)) return undefined;
    return fakeHosting(env.WEBMIO_HOSTING_FAKE_DIR, {
      ...(env.WEBMIO_SITES_DOMAIN ? { sitesDomain: env.WEBMIO_SITES_DOMAIN } : {}),
      ...(env.WEBMIO_CNAME_DOMAIN ? { cnameDomain: env.WEBMIO_CNAME_DOMAIN } : {}),
      ...(env.WEBMIO_REDIRECT_ADDRESS ? { redirectAddress: env.WEBMIO_REDIRECT_ADDRESS } : {}),
    });
  }
  const config = webmioHostingConfig(env);
  if (!config) return undefined;
  const key = JSON.stringify(config);
  if (aws?.key !== key) aws = { key, backend: awsHosting(config) };
  return aws.backend;
}

export type HostingProvider = (typeof projectHosting.$inferSelect)["provider"];

export interface ProjectTarget {
  provider: HostingProvider;
  target: PublishTarget;
  /** Netlify: the team the site belongs to; Webmio hosting: "webmio". */
  accountSlug: string;
}

export const WEBMIO_ACCOUNT = "webmio";

/** Webmio hosting isn't configured, but a website is on it. */
export const HOSTING_NOT_SET_UP = said("server.publishing.hostingNotSetUp");
export const NOT_CONNECTED = said("server.publishing.notConnected");

/**
 * The hosting a project publishes to (design.md decision 8): a website on Webmio hosting or
 * Netlify stays there; a project without one goes to Webmio hosting when the server has it,
 * otherwise to the workspace's Netlify team. Undefined, with the reason, when there is none.
 */
export function targetFor(
  db: Db,
  projectId: string,
  options: HostingEnv & { pollDelays?: number[] } = {},
): { ok: true; value: ProjectTarget } | { ok: false; message: Said } {
  const hosting = db
    .select({ provider: projectHosting.provider })
    .from(projectHosting)
    .where(eq(projectHosting.projectId, projectId))
    .get();
  const webmio = () => {
    const backend = webmioBackend(options);
    return backend
      ? ({
          ok: true,
          value: { provider: "webmio", target: webmioTarget(backend), accountSlug: WEBMIO_ACCOUNT },
        } as const)
      : undefined;
  };
  const netlify = () => {
    const workspaceId =
      db.select({ id: projects.workspaceId }).from(projects).where(eq(projects.id, projectId)).get()
        ?.id ?? "";
    const connection = publishTarget(db, workspaceId, options);
    return connection
      ? ({ ok: true, value: { provider: "netlify", ...connection } } as const)
      : undefined;
  };
  if (hosting?.provider === "webmio") return webmio() ?? { ok: false, message: HOSTING_NOT_SET_UP };
  if (hosting?.provider === "netlify") return netlify() ?? { ok: false, message: NOT_CONNECTED };
  return webmio() ?? netlify() ?? { ok: false, message: NOT_CONNECTED };
}

/** Whether a project can publish without anyone connecting hosting first. */
export function canPublish(db: Db, projectId: string, options: HostingEnv = {}): boolean {
  return targetFor(db, projectId, options).ok;
}
