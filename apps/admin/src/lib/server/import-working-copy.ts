import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Db } from "./db/index";
import { projects, workspaces } from "./db/schema";
import { demoMediaFile } from "./demo";
import { newId } from "./ids";
import { createProject } from "./site-documents";

export const DEFAULT_WORKSPACE_NAME = "Default";

/** `$MEDIA_DIR`, or `data/media` in the working directory. Files live in `<dir>/<projectId>/`. */
export function mediaRoot(): string {
  return process.env.MEDIA_DIR ?? resolve("data/media");
}

/** The Milestone 2 data folder that may hold `site.json`: `$SITE_DATA_DIR` or `data/`. */
function legacyDataDir(): string {
  return process.env.SITE_DATA_DIR ?? resolve("data");
}

/** Media keys of the images a document references. */
function imageSources(document: unknown): string[] {
  const nodes =
    (document as { nodes?: Record<string, { type?: string; src?: string }> }).nodes ?? {};
  return [
    ...new Set(Object.values(nodes).flatMap((n) => (n.type === "image" && n.src ? [n.src] : []))),
  ];
}

/**
 * On an installation with no projects, imports the Milestone 2 working copy
 * (`site.json`) into a workspace named "Default" with one project, and copies the
 * images it uses. The images of that working copy came from the demo fixture.
 * Returns the new project's ID, or undefined when there was nothing to import.
 */
export function importWorkingCopy(
  db: Db,
  dataDir = legacyDataDir(),
  media = mediaRoot(),
): string | undefined {
  if (db.select({ id: projects.id }).from(projects).limit(1).get()) return undefined;
  const file = join(dataDir, "site.json");
  if (!existsSync(file)) return undefined;
  const { document } = JSON.parse(readFileSync(file, "utf8")) as { document: unknown };

  const workspaceId = newId("w");
  db.insert(workspaces)
    .values({ id: workspaceId, name: DEFAULT_WORKSPACE_NAME, createdAt: new Date() })
    .run();
  const projectId = createProject(db, workspaceId, DEFAULT_WORKSPACE_NAME, document);

  const folder = join(media, projectId);
  mkdirSync(folder, { recursive: true });
  for (const name of imageSources(document)) {
    const bytes = demoMediaFile(name);
    if (bytes) writeFileSync(join(folder, name), bytes);
  }
  return projectId;
}
