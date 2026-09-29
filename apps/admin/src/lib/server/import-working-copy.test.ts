import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db/index";
import { projects, workspaces } from "./db/schema";
import { demoSite } from "./demo";
import { importWorkingCopy } from "./import-working-copy";
import { readSite } from "./site-documents";

let dir = "";
let dataDir = "";
let mediaDir = "";
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "import-"));
  dataDir = join(dir, "data");
  mediaDir = join(dir, "media");
  mkdirSync(dataDir);
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function writeWorkingCopy() {
  const document = demoSite() as { nodes: Record<string, { heading?: { content: string } }> };
  const hero = document.nodes.hero_1;
  if (hero?.heading) hero.heading.content = "Upravený nadpis";
  writeFileSync(join(dataDir, "site.json"), JSON.stringify({ version: "old", document }));
  return document;
}

describe("importWorkingCopy", () => {
  it("imports site.json and its images into a Default workspace", async () => {
    const document = writeWorkingCopy();
    const db = openDatabase(":memory:");
    const projectId = importWorkingCopy(db, dataDir, mediaDir);

    expect(projectId).toMatch(/^p_/);
    expect(
      db
        .select()
        .from(workspaces)
        .all()
        .map((w) => w.name),
    ).toEqual(["Default"]);
    expect(readSite(db, projectId ?? "")?.document).toEqual(document);
    expect(await readdir(join(mediaDir, projectId ?? ""))).toEqual(["hero.png"]);
    // The old file stays, so the previous version of the app can still run against it.
    expect(existsSync(join(dataDir, "site.json"))).toBe(true);
  });

  it("imports only once", () => {
    writeWorkingCopy();
    const db = openDatabase(":memory:");
    importWorkingCopy(db, dataDir, mediaDir);
    expect(importWorkingCopy(db, dataDir, mediaDir)).toBeUndefined();
    expect(db.select().from(projects).all()).toHaveLength(1);
  });

  it("does nothing without a working copy", () => {
    const db = openDatabase(":memory:");
    expect(importWorkingCopy(db, dataDir, mediaDir)).toBeUndefined();
    expect(db.select().from(workspaces).all()).toEqual([]);
  });
});
