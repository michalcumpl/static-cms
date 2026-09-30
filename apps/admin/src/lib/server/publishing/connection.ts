import { eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { hostingConnections, users } from "../db/schema";
import { listTeams, type NetlifyTeam, netlifyTarget } from "./netlify";
import { decryptSecret, encryptSecret, secretKey } from "./secrets";
import { PublishError, type PublishTarget } from "./target";

// A workspace's connection to its own Netlify team (netlify-publishing design.md decisions 1–3).

export interface ConnectionInfo {
  provider: "netlify";
  accountSlug: string;
  accountName: string;
  connectedBy: string | null;
  connectedAt: Date;
}

export interface NetlifyEnv {
  apiUrl?: string;
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
}

const apiUrlOf = (options: NetlifyEnv) =>
  options.apiUrl ?? (options.env ?? process.env).NETLIFY_API_URL ?? undefined;

export const NOT_SET_UP = "Publishing isn't set up on this server (SECRET_KEY is missing).";

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
export function teamsForToken(token: string, options: NetlifyEnv = {}): Promise<NetlifyTeam[]> {
  const apiUrl = apiUrlOf(options);
  return listTeams({
    token: token.trim(),
    ...(apiUrl ? { apiUrl } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });
}

export type ConnectResult =
  | { ok: true; info: ConnectionInfo }
  | { ok: false; reason: "not-set-up" | "refused" | "unknown-team"; message: string };

/**
 * Checks the token with Netlify, and stores it encrypted for the workspace with the chosen team.
 * Replaces an earlier connection.
 */
export async function connectWorkspace(
  db: Db,
  workspaceId: string,
  userId: string,
  input: { token: string; account: string },
  options: NetlifyEnv = {},
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
        message: "Netlify refused this token. Check it and try again.",
      };
    }
    throw error;
  }
  const team = teams.find((t) => t.slug === input.account);
  if (!team) {
    return {
      ok: false,
      reason: "unknown-team",
      message: "This token can't publish into that Netlify team.",
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
  options: NetlifyEnv & { pollDelays?: number[] } = {},
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
