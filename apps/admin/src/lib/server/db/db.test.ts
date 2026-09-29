import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { openDatabase } from "./index";

describe("openDatabase", () => {
  it("applies the migrations to a fresh database", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .all<{ name: string }>(
        sql`select name from sqlite_master where type = 'table' and substr(name, 1, 2) != '__' and name != 'sqlite_sequence'`,
      )
      .map((t) => t.name)
      .sort();
    expect(tables).toEqual([
      "invitations",
      "login_tokens",
      "memberships",
      "projects",
      "sessions",
      "site_documents",
      "users",
      "versions",
      "workspaces",
    ]);
  });

  it("enforces foreign keys", () => {
    const db = openDatabase(":memory:");
    let error: unknown;
    try {
      db.run(
        sql`insert into projects (id, workspace_id, name, created_at) values ('p_1', 'w_missing', 'X', 0)`,
      );
    } catch (e) {
      error = e;
    }
    // Drizzle wraps the driver's error; SQLite's message is on `cause`.
    expect(String((error as { cause?: unknown })?.cause)).toMatch(/FOREIGN KEY/);
  });

  it("is idempotent: opening an already migrated file applies nothing twice", async () => {
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "db-"));
    try {
      openDatabase(join(dir, "app.db"));
      expect(() => openDatabase(join(dir, "app.db"))).not.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
