import { createHash, randomBytes } from "node:crypto";

export type IdPrefix = "u" | "w" | "p" | "d" | "v" | "pb" | "im" | "rt";

/**
 * A random ID with a type prefix, e.g. `p_3kTq9xW1bZcA`: safe in URLs, and never
 * guessable in sequence. 12 base64url characters carry 72 random bits.
 */
export function newId(prefix: IdPrefix): string {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

/** A secret for sign-in links, invitations and session cookies: 32 random bytes, base64url. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database stores in place of a token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
