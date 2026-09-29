import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type Problem, validateSite } from "@static-cms/site";
import { demoSiteJson } from "./demo";

/** The site's working copy: the document plus a version that changes on every accepted save. */
export interface StoredSite {
  version: string;
  document: unknown;
}

export interface SiteSnapshot extends StoredSite {
  problems: Problem[];
}

export type SaveResult =
  | { ok: true; version: string; problems: Problem[] }
  | { ok: false; reason: "conflict" }
  | { ok: false; reason: "invalid"; problems: Problem[] };

/** Where the working copy lives: `$SITE_DATA_DIR`, or `data/` in the working directory. */
function dataDir(): string {
  return resolve(process.env.SITE_DATA_DIR ?? "data");
}

function sitePath(): string {
  return join(dataDir(), "site.json");
}

// All reads and writes run one after another, so a save's version check and its write
// can't interleave with another save (adapter-node serves from a single process).
let queue: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

/** Writes to a temp file next to the target, then renames it into place (atomic). */
async function writeAtomically(site: StoredSite): Promise<void> {
  await mkdir(dataDir(), { recursive: true });
  const target = sitePath();
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(site, null, 2)}\n`, "utf8");
  await rename(temp, target);
}

async function load(): Promise<StoredSite> {
  try {
    return JSON.parse(await readFile(sitePath(), "utf8")) as StoredSite;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const seeded = { version: randomUUID(), document: JSON.parse(demoSiteJson()) };
    await writeAtomically(seeded);
    return seeded;
  }
}

/** The current document, its version and its problems. Seeds from the demo fixture on first use. */
export function readSite(): Promise<SiteSnapshot> {
  return serialized(async () => {
    const site = await load();
    return { ...site, problems: validateSite(site.document).problems };
  });
}

/**
 * Saves a document based on `baseVersion`. Rejects stale versions and documents with
 * structural errors; site-rule problems are saved and returned.
 */
export function saveSite(document: unknown, baseVersion: string): Promise<SaveResult> {
  return serialized(async (): Promise<SaveResult> => {
    const current = await load();
    if (current.version !== baseVersion) return { ok: false, reason: "conflict" };
    const { problems } = validateSite(document);
    const broken = problems.filter((p) => p.category === "structure" && p.severity === "error");
    if (broken.length > 0) return { ok: false, reason: "invalid", problems: broken };
    const version = randomUUID();
    await writeAtomically({ version, document });
    return { ok: true, version, problems };
  });
}
