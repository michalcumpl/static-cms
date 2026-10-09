import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { useServices } from "$lib/server/app";
import { type Db, openDatabase, schema } from "$lib/server/db/index";
import { GET } from "./+server";

const call = () => GET({} as Parameters<typeof GET>[0]) as Response;

afterEach(() => {
  useServices({ db: openDatabase(":memory:") });
});

describe("GET /healthz", () => {
  it("answers 200 once the database is open and migrated, without a session", async () => {
    useServices({ db: openDatabase(":memory:") });
    const response = call();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok\n");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 503 when migrations are missing", async () => {
    // A database nobody migrated: drizzle's migrations table doesn't even exist.
    useServices({ db: drizzle(new Database(":memory:"), { schema }) as Db });
    const response = call();
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("unavailable\n");
  });

  it("answers 503 when the database can't be read", () => {
    const broken = new Database(":memory:");
    const db = drizzle(broken, { schema }) as Db;
    broken.close();
    useServices({ db });
    expect(call().status).toBe(503);
  });
});
