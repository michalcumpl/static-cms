import { describe, expect, it } from "vitest";
import { hashToken, newId, newToken } from "./ids";

describe("newId", () => {
  it("has the type prefix and a URL-safe random part", () => {
    expect(newId("p")).toMatch(/^p_[A-Za-z0-9_-]{12}$/);
    expect(newId("u")).toMatch(/^u_/);
  });

  it("doesn't repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId("w")));
    expect(ids.size).toBe(1000);
  });
});

describe("tokens", () => {
  it("are 32 random bytes in base64url", () => {
    const token = newToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(newToken()).not.toBe(token);
  });

  it("are stored as a SHA-256 hash that doesn't reveal the token", () => {
    const token = newToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashToken(token)).toBe(hash);
  });
});
