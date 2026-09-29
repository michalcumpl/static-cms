import { describe, expect, it } from "vitest";
import {
  consumeLoginToken,
  createSession,
  deleteSession,
  getSessionUser,
  LOGIN_TOKEN_TTL,
  RateLimiter,
  requestSignIn,
  SESSION_TTL,
  safeNext,
  signInLimiter,
} from "./auth";
import { openDatabase } from "./db/index";
import { loginTokens, sessions, users } from "./db/schema";
import { hashToken, newId } from "./ids";
import type { Mailer, MailMessage } from "./mail";

const DAY = 24 * 60 * 60_000;

function setup() {
  const db = openDatabase(":memory:");
  const userId = newId("u");
  db.insert(users).values({ id: userId, email: "jana@example.cz", createdAt: new Date() }).run();
  const sent: MailMessage[] = [];
  const mailer: Mailer = { send: async (m) => void sent.push(m) };
  return { db, userId, sent, mailer };
}

const tokenFrom = (message: MailMessage | undefined) =>
  /\/signin\/([A-Za-z0-9_-]+)/.exec(message?.text ?? "")?.[1] ?? "";

const request = (email: string, next?: string) => ({
  email,
  clientAddress: "203.0.113.5",
  origin: "https://admin.example.cz",
  next,
});

describe("magic-link sign-in", () => {
  it("emails a link to an existing account that signs in once", async () => {
    const { db, userId, sent, mailer } = setup();
    expect(await requestSignIn(db, mailer, signInLimiter(), request(" Jana@Example.cz "))).toBe(
      "sent",
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("jana@example.cz");
    const token = tokenFrom(sent[0]);
    expect(consumeLoginToken(db, token)).toEqual({ ok: true, userId });
    expect(consumeLoginToken(db, token)).toEqual({ ok: false, reason: "used" });
  });

  it("refuses the link after 15 minutes", async () => {
    const { db, sent, mailer } = setup();
    const now = Date.now();
    await requestSignIn(db, mailer, signInLimiter(), request("jana@example.cz"), now);
    expect(consumeLoginToken(db, tokenFrom(sent[0]), now + LOGIN_TOKEN_TTL + 1)).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("gives the same answer for an unknown address and sends nothing", async () => {
    const { db, sent, mailer } = setup();
    expect(await requestSignIn(db, mailer, signInLimiter(), request("nobody@example.cz"))).toBe(
      "sent",
    );
    expect(sent).toEqual([]);
    expect(db.select().from(users).all()).toHaveLength(1);
  });

  it("stores only the hash of the token", async () => {
    const { db, sent, mailer } = setup();
    await requestSignIn(db, mailer, signInLimiter(), request("jana@example.cz"));
    const token = tokenFrom(sent[0]);
    const rows = db.select().from(loginTokens).all();
    expect(rows.map((r) => r.id)).toEqual([hashToken(token)]);
  });

  it("carries a safe return path in the link", async () => {
    const { db, sent, mailer } = setup();
    await requestSignIn(db, mailer, signInLimiter(), request("jana@example.cz", "/p/p_1/edit/"));
    expect(sent[0]?.text).toContain("?next=%2Fp%2Fp_1%2Fedit%2F");
    expect(consumeLoginToken(db, "not-a-token")).toEqual({ ok: false, reason: "invalid" });
  });

  it("only accepts same-origin return paths", () => {
    expect(safeNext("/p/p_1/edit/")).toBe("/p/p_1/edit/");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "", null]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("sign-in rate limits", () => {
  it("refuses more than 5 requests per address within 15 minutes and sends nothing more", async () => {
    const { db, sent, mailer } = setup();
    const limiter = signInLimiter();
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      expect(
        await requestSignIn(
          db,
          mailer,
          limiter,
          { ...request("jana@example.cz"), clientAddress: `10.0.0.${i}` },
          now,
        ),
      ).toBe("sent");
    }
    expect(
      await requestSignIn(
        db,
        mailer,
        limiter,
        { ...request("jana@example.cz"), clientAddress: "10.0.0.9" },
        now,
      ),
    ).toBe("rate-limited");
    expect(sent).toHaveLength(5);
    expect(
      await requestSignIn(db, mailer, limiter, request("jana@example.cz"), now + 15 * 60_000 + 1),
    ).toBe("sent");
  });

  it("limits a client address across different emails", async () => {
    const { db, mailer } = setup();
    const limiter = signInLimiter();
    const results = [];
    for (let i = 0; i < 6; i++)
      results.push(await requestSignIn(db, mailer, limiter, request(`x${i}@example.cz`)));
    expect(results.at(-1)).toBe("rate-limited");
  });

  it("uses a sliding window", () => {
    const limiter = new RateLimiter(2, 1000);
    expect([limiter.allow("k", 0), limiter.allow("k", 500), limiter.allow("k", 900)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(limiter.allow("k", 1001)).toBe(true);
  });
});

describe("sessions", () => {
  it("resolve to their user until signed out, even if the old cookie is sent again", () => {
    const { db, userId } = setup();
    const token = createSession(db, userId);
    expect(getSessionUser(db, token)).toEqual({ id: userId, email: "jana@example.cz" });
    deleteSession(db, token);
    expect(getSessionUser(db, token)).toBeUndefined();
  });

  it("expire after 30 days without use, and slide forward when used", () => {
    const { db, userId } = setup();
    const start = Date.now();
    const token = createSession(db, userId, start);
    // Used after 10 days: the expiry moves to 30 days from then.
    expect(getSessionUser(db, token, start + 10 * DAY)).toBeDefined();
    expect(getSessionUser(db, token, start + 35 * DAY)).toBeDefined();
    expect(getSessionUser(db, token, start + 35 * DAY + SESSION_TTL + 1)).toBeUndefined();
    expect(db.select().from(sessions).all()).toEqual([]);
  });

  it("aren't written on every request", () => {
    const { db, userId } = setup();
    const start = Date.now();
    const token = createSession(db, userId, start);
    const before = db.select().from(sessions).get()?.expiresAt.getTime();
    getSessionUser(db, token, start + 60_000);
    expect(db.select().from(sessions).get()?.expiresAt.getTime()).toBe(before);
  });
});
