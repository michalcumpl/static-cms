import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "./db/index";
import { loginTokens, sessions, users } from "./db/schema";
import { hashToken, newToken } from "./ids";
import type { Mailer } from "./mail";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
export const LOGIN_TOKEN_TTL = 15 * MINUTE;
export const SESSION_TTL = 30 * DAY;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** A same-origin path to return to after signing in; anything else becomes `/`. */
export function safeNext(next: string | null | undefined): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/** Sliding-window limiter kept in memory: fine for the single server process. */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Records an attempt for `key` and says whether it is within the limit. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    const allowed = recent.length < this.max;
    if (allowed) recent.push(now);
    this.hits.set(key, recent);
    return allowed;
  }
}

/** 5 sign-in link requests per 15 minutes, per email address and per client address. */
export function signInLimiter(): RateLimiter {
  return new RateLimiter(5, 15 * MINUTE);
}

export interface SignInRequest {
  email: string;
  clientAddress: string;
  /** Origin for the link in the email, e.g. `https://admin.example.cz`. */
  origin: string;
  next?: string | null;
}

/**
 * Handles the sign-in form. Answers `sent` whether or not the address has an account,
 * and only emails existing accounts; `rate-limited` when either limit is exceeded.
 */
export async function requestSignIn(
  db: Db,
  mailer: Mailer,
  limiter: RateLimiter,
  request: SignInRequest,
  now = Date.now(),
): Promise<"sent" | "rate-limited"> {
  const email = normalizeEmail(request.email);
  const byEmail = limiter.allow(`email:${email}`, now);
  const byClient = limiter.allow(`client:${request.clientAddress}`, now);
  if (!byEmail || !byClient) return "rate-limited";

  const user = db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
  if (!user) return "sent";

  const token = newToken();
  db.insert(loginTokens)
    .values({ id: hashToken(token), userId: user.id, expiresAt: new Date(now + LOGIN_TOKEN_TTL) })
    .run();
  const next = safeNext(request.next);
  const link = `${request.origin}/signin/${token}${next === "/" ? "" : `?next=${encodeURIComponent(next)}`}`;
  await mailer.send({
    to: email,
    subject: "Přihlášení / Sign in",
    text: `Pro přihlášení otevřete tento odkaz (platí 15 minut):\nTo sign in, open this link (valid for 15 minutes):\n\n${link}\n`,
  });
  return "sent";
}

/** Creates a sign-in link for a user without sending it (the admin command prints it). */
export function createLoginLink(db: Db, userId: string, origin: string, now = Date.now()): string {
  const token = newToken();
  db.insert(loginTokens)
    .values({ id: hashToken(token), userId, expiresAt: new Date(now + LOGIN_TOKEN_TTL) })
    .run();
  return `${origin}/signin/${token}`;
}

export type LoginTokenResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "used" | "expired" | "invalid" };

/** Uses a sign-in link's token: works once, within 15 minutes. */
export function consumeLoginToken(db: Db, token: string, now = Date.now()): LoginTokenResult {
  const id = hashToken(token);
  const used = db
    .update(loginTokens)
    .set({ usedAt: new Date(now) })
    .where(
      and(
        eq(loginTokens.id, id),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, new Date(now)),
      ),
    )
    .returning({ userId: loginTokens.userId })
    .get();
  if (used) return { ok: true, userId: used.userId };
  const row = db.select().from(loginTokens).where(eq(loginTokens.id, id)).get();
  if (!row) return { ok: false, reason: "invalid" };
  return { ok: false, reason: row.usedAt ? "used" : "expired" };
}

/** Starts a session; the returned token goes into the cookie. */
export function createSession(db: Db, userId: string, now = Date.now()): string {
  const token = newToken();
  db.insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      expiresAt: new Date(now + SESSION_TTL),
      createdAt: new Date(now),
    })
    .run();
  return token;
}

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * The user of a session cookie, or undefined. Sessions last 30 days from their last use;
 * the expiry is pushed forward at most once a day to avoid a write on every request.
 */
export function getSessionUser(db: Db, token: string, now = Date.now()): SessionUser | undefined {
  const id = hashToken(token);
  const row = db
    .select({ expiresAt: sessions.expiresAt, userId: users.id, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return undefined;
  if (row.expiresAt.getTime() <= now) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return undefined;
  }
  if (row.expiresAt.getTime() - now < SESSION_TTL - DAY) {
    db.update(sessions)
      .set({ expiresAt: new Date(now + SESSION_TTL) })
      .where(eq(sessions.id, id))
      .run();
  }
  return { id: row.userId, email: row.email };
}

export function deleteSession(db: Db, token: string): void {
  db.delete(sessions)
    .where(eq(sessions.id, hashToken(token)))
    .run();
}
