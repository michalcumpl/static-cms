import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, importSiteCommand, uploadMediaFolder } from "./admin-commands";
import { consumeLoginToken } from "./auth";
import { type Db, openDatabase } from "./db/index";
import { workspaces } from "./db/schema";
import { newId } from "./ids";
import { startFixtureServer } from "./import/fixture-server";
import { memoryStore } from "./media-store";
import { listWorkspaces } from "./members";
import { createProject } from "./site-documents";

let db: Db;
beforeEach(() => {
  db = openDatabase(":memory:");
});

const origin = "https://admin.example.cz";

describe("createUser", () => {
  it("creates the user, a workspace they own, and a working sign-in link", () => {
    const result = createUser(db, " Michal@Agency.cz ", "Moje studio", origin);
    if (!result.ok) throw new Error("not created");
    expect(listWorkspaces(db, result.userId)).toEqual([
      { id: result.workspaceId, name: "Moje studio", role: "owner", projects: [] },
    ]);
    expect(result.joinedImported).toBe(false);
    expect(result.link.startsWith(`${origin}/signin/`)).toBe(true);
    const token = result.link.split("/").at(-1) ?? "";
    expect(consumeLoginToken(db, token)).toEqual({ ok: true, userId: result.userId });
  });

  it("refuses a second account for an address, and non-addresses", () => {
    createUser(db, "michal@agency.cz", "A", origin);
    expect(createUser(db, "MICHAL@agency.cz", "B", origin)).toEqual({
      ok: false,
      reason: "exists",
    });
    expect(createUser(db, "michal", "B", origin)).toEqual({ ok: false, reason: "invalid-email" });
  });

  it("makes the first user owner of an imported Default workspace", () => {
    const imported = newId("w");
    db.insert(workspaces).values({ id: imported, name: "Default", createdAt: new Date() }).run();
    createProject(db, imported, "Default");

    const first = createUser(db, "michal@agency.cz", "Ignored", origin);
    expect(first).toMatchObject({ ok: true, workspaceId: imported, joinedImported: true });
    // The imported workspace has an owner now; the next user gets their own workspace.
    const second = createUser(db, "jana@example.cz", "Pekárna", origin);
    expect(second).toMatchObject({ ok: true, joinedImported: false });
    expect(second.ok && second.workspaceId).not.toBe(imported);
  });
});

describe("importSiteCommand (site-import)", () => {
  it("Import an example locally: prints the pages, what was left out, and the address", async () => {
    const created = createUser(db, "pekar@example.cz", "Pekárna", origin);
    if (!created.ok) throw new Error("no user");
    const server = await startFixtureServer("bakery");
    const lines: string[] = [];
    try {
      const result = await importSiteCommand(
        db,
        created.workspaceId,
        `${server.origin}/`,
        origin,
        (line) => lines.push(line),
        { allowHosts: new Set([server.host]) },
      );
      if (!result.ok) throw new Error(lines.join("\n"));
      expect(lines).toContain("Imported 5 pages, 12 images, 3 questions, 2 social profiles.");
      expect(lines).toContain("  /kontakt.html → /kontakt/  Kontakt");
      expect(lines).toContain("  form on /kontakt.html");
      expect(lines.at(-1)).toBe(`Project: ${origin}/p/${result.projectId}/`);
    } finally {
      await server.close();
    }
  });

  it("refuses a workspace without an owner, and an address it can't import", async () => {
    const lines: string[] = [];
    expect(
      await importSiteCommand(db, "w_none", "pekarna.cz", origin, (l) => lines.push(l)),
    ).toEqual({
      ok: false,
    });
    const created = createUser(db, "x@example.cz", "X", origin);
    if (!created.ok) throw new Error("no user");
    await importSiteCommand(db, created.workspaceId, "http://10.0.0.1/", origin, (l) =>
      lines.push(l),
    );
    expect(lines).toEqual([
      "No workspace w_none with an owner.",
      "Only public web addresses can be imported, such as pekarna.cz.",
    ]);
  });
});

describe("uploadMediaFolder", () => {
  it("copies a media folder under the same keys, and skips what is already there", async () => {
    const folder = mkdtempSync(join(tmpdir(), "media-upload-"));
    try {
      mkdirSync(join(folder, "p_1", "originals"), { recursive: true });
      writeFileSync(join(folder, "p_1", "hero-320.webp"), "variant");
      writeFileSync(join(folder, "p_1", "originals", "hero.jpg"), "original");
      writeFileSync(join(folder, "p_1", "half.webp.tmp-abc"), "x");
      const store = memoryStore();
      const lines: string[] = [];
      expect(await uploadMediaFolder(folder, store, (l) => lines.push(l))).toEqual({
        copied: 2,
        skipped: 0,
      });
      expect(store.keys()).toEqual(["p_1/hero-320.webp", "p_1/originals/hero.jpg"]);
      expect(lines).toEqual([
        "Copied p_1/hero-320.webp",
        "Copied p_1/originals/hero.jpg",
        "2 copied, 0 already there.",
      ]);

      writeFileSync(join(folder, "p_1", "hero-320.webp"), "a longer variant");
      expect(await uploadMediaFolder(folder, store, () => {})).toEqual({ copied: 1, skipped: 1 });
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });
});
