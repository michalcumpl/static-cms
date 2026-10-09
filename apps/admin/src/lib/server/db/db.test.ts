import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
      "hosting_connections",
      "imports",
      "invitations",
      "login_tokens",
      "media",
      "memberships",
      "page_origins",
      "project_hosting",
      "projects",
      "publish_documents",
      "publishes",
      "sessions",
      "site_documents",
      "users",
      "versions",
      "workspaces",
    ]);
  });

  it("adds the import tables to an existing database, and drops a project's origins with it", () => {
    const file = join(mkdtempSync(join(tmpdir(), "db-")), "app.db");
    openDatabase(file).run(
      sql`insert into workspaces (id, name, created_at) values ('w_1', 'W', 0)`,
    );
    const db = openDatabase(file);
    db.run(
      sql`insert into projects (id, workspace_id, name, created_at) values ('p_1', 'w_1', 'P', 0)`,
    );
    db.run(sql`insert into page_origins values ('p_1', 'cs', 'page_1', '/kontakt.html')`);
    db.run(
      sql`insert into imports (id, workspace_id, address, state, project_id, started_at) values ('i_1', 'w_1', 'https://x.cz/', 'done', 'p_1', 0)`,
    );
    db.run(sql`delete from projects where id = 'p_1'`);
    expect(db.all(sql`select * from page_origins`)).toEqual([]);
    expect(db.get(sql`select project_id, review_dismissed from imports`)).toEqual({
      project_id: null,
      review_dismissed: 0,
    });
  });

  it("keeps one media row per file content and project", () => {
    const db = openDatabase(":memory:");
    const indexes = db
      .all<{ name: string; unique: number }>(sql`pragma index_list('media')`)
      .filter((i) => i.name === "media_project_sha256_idx");
    expect(indexes).toEqual([expect.objectContaining({ unique: 1 })]);
    const columns = db
      .all<{ name: string }>(sql`pragma index_info('media_project_sha256_idx')`)
      .map((c) => c.name);
    expect(columns).toEqual(["project_id", "sha256"]);
  });

  it("gives media rows an optional source and edit", () => {
    const db = openDatabase(":memory:");
    const columns = db
      .all<{ name: string; notnull: number }>(sql`pragma table_info('media')`)
      .filter((c) => c.name === "source_key" || c.name === "edit");
    expect(columns).toEqual([
      expect.objectContaining({ name: "source_key", notnull: 0 }),
      expect.objectContaining({ name: "edit", notnull: 0 }),
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
