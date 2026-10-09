import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import { type BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;
/** A transaction handle, as passed to `db.transaction((tx) => …)`. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Functions that work both on their own and inside a transaction take this. */
export type DbOrTx = Db | Tx;

/** `$DATABASE_PATH`, or `data/app.db` in the working directory. */
export function databasePath(): string {
  return process.env.DATABASE_PATH ?? resolve("data/app.db");
}

/** `$MIGRATIONS_DIR`, or `drizzle/` in the working directory (the admin app's folder). */
function migrationsFolder(): string {
  return process.env.MIGRATIONS_DIR ?? resolve("drizzle");
}

/**
 * Opens (or creates) the database, turns on WAL and foreign keys, and applies pending
 * migrations. Use `:memory:` for tests.
 */
export function openDatabase(path = databasePath()): Db {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: migrationsFolder() });
  return db;
}

/**
 * Whether every migration the admin ships has been applied to `db` (admin-on-aws, "Health
 * endpoint"): the journal's entries against the migrations table drizzle keeps.
 */
export function migrationsApplied(db: Db): boolean {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder(), "meta", "_journal.json"), "utf8"),
  ) as { entries: unknown[] };
  const row = db.get<{ applied: number }>(
    sql`select count(*) as applied from "__drizzle_migrations"`,
  );
  return (row?.applied ?? 0) >= journal.entries.length;
}

export { schema };
