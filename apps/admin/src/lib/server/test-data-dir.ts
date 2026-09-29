import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";

/** Gives each test a fresh, empty SITE_DATA_DIR (so the store seeds from the fixture). */
export function useTempDataDir(): void {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "site-data-"));
    process.env.SITE_DATA_DIR = dir;
  });
  afterEach(async () => {
    delete process.env.SITE_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  });
}
