import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, secretKey } from "./secrets";

const key = secretKey({ SECRET_KEY: "a".repeat(40) }) as Buffer;

describe("hosting token encryption", () => {
  it("round-trips, with a fresh IV each time and no plain text in the stored form", () => {
    const token = "nfp_example_token_123";
    const first = encryptSecret(token, key);
    const second = encryptSecret(token, key);
    expect(first).not.toBe(second);
    expect(first).not.toContain(token);
    expect(first).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(decryptSecret(first, key)).toBe(token);
    expect(decryptSecret(second, key)).toBe(token);
  });

  it("refuses a tampered value and a wrong key", () => {
    const stored = encryptSecret("nfp_token", key);
    const [v, iv, tag, data] = stored.split(".");
    const flipped = `${data?.slice(0, -2)}${data?.endsWith("AA") ? "BB" : "AA"}`;
    expect(decryptSecret([v, iv, tag, flipped].join("."), key)).toBeUndefined();
    const other = secretKey({ SECRET_KEY: "b".repeat(40) }) as Buffer;
    expect(decryptSecret(stored, other)).toBeUndefined();
    expect(decryptSecret("garbage", key)).toBeUndefined();
  });

  it("has no key without a long enough SECRET_KEY", () => {
    expect(secretKey({})).toBeUndefined();
    expect(secretKey({ SECRET_KEY: "short" })).toBeUndefined();
  });
});

describe("the development key", () => {
  function withTempFile(test: (file: string) => void) {
    const dir = mkdtempSync(join(tmpdir(), "secret-"));
    try {
      test(join(dir, "data", "secret.key"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("is generated once in development, readable only by its owner, and reused", () => {
    withTempFile((file) => {
      const env = { NODE_ENV: "development", SECRET_KEY_FILE: file };
      const first = secretKey(env);
      expect(first).toBeDefined();
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).mode & 0o777).toBe(0o600);
      expect(readFileSync(file, "utf8").trim().length).toBeGreaterThanOrEqual(32);
      const stored = encryptSecret("nfp_token", first as Buffer);
      expect(decryptSecret(stored, secretKey(env) as Buffer)).toBe("nfp_token");
    });
  });

  it("isn't used when SECRET_KEY is set, or outside development", () => {
    withTempFile((file) => {
      expect(
        secretKey({ NODE_ENV: "development", SECRET_KEY: "s".repeat(40), SECRET_KEY_FILE: file }),
      ).toBeDefined();
      expect(existsSync(file)).toBe(false);
      for (const NODE_ENV of ["production", "test", undefined]) {
        expect(secretKey({ NODE_ENV, SECRET_KEY_FILE: file }), String(NODE_ENV)).toBeUndefined();
      }
      expect(existsSync(file)).toBe(false);
    });
  });

  it("doesn't replace a SECRET_KEY that is set but too short", () => {
    withTempFile((file) => {
      expect(
        secretKey({ NODE_ENV: "development", SECRET_KEY: "short", SECRET_KEY_FILE: file }),
      ).toBeUndefined();
      expect(existsSync(file)).toBe(false);
    });
  });
});
