// Test fixture: a fresh in-memory database with a project that holds the demo site.
import { copyFileSync, mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach } from "vitest";
import { useServices } from "./app";
import { type Db, openDatabase } from "./db/index";
import { users } from "./db/schema";
import { demoSite } from "./demo";
import { newId } from "./ids";
import { registerLegacyMedia } from "./media";
import { createWorkspace } from "./members";
import { createProject } from "./site-documents";

export interface TestProject {
  db: Db;
  /** Owner of the project's workspace. */
  owner: { id: string; email: string };
  /** Signed in, but a member of a different workspace. */
  outsider: { id: string; email: string };
  workspaceId: string;
  projectId: string;
  /** A request event for `path`, signed in as `user` (or anonymous). */
  event(path: string, user?: { id: string; email: string }, init?: RequestInit): TestEvent;
}

export interface TestEvent {
  request: Request;
  url: URL;
  params: Record<string, string>;
  locals: App.Locals;
}

const require = createRequire(import.meta.url);
const demoMediaDir = join(
  dirname(require.resolve("@webmio/site/fixtures/demo-site.json")),
  "media",
);

/** Sets up a fresh project before each test; read it through the returned getter. */
export function useTestProject(
  params: () => Record<string, string> = () => ({}),
): () => TestProject {
  let current: TestProject | undefined;
  let mediaDir = "";
  beforeEach(async () => {
    mediaDir = await mkdtemp(join(tmpdir(), "media-"));
    process.env.MEDIA_DIR = mediaDir;
    const db = openDatabase(":memory:");
    useServices({ db });
    const user = (email: string) => {
      const id = newId("u");
      db.insert(users).values({ id, email, createdAt: new Date() }).run();
      return { id, email };
    };
    const owner = user("jana@example.cz");
    const outsider = user("eva@example.cz");
    const workspaceId = createWorkspace(db, "Pekárna U Lípy", owner.id);
    createWorkspace(db, "Kadeřnictví Eva", outsider.id);
    const projectId = createProject(db, workspaceId, "Pekárna U Lípy", demoSite());
    mkdirSync(join(mediaDir, projectId));
    copyFileSync(join(demoMediaDir, "hero.png"), join(mediaDir, projectId, "hero.png"));
    // As on startup: the demo image becomes a library image with its variant.
    await registerLegacyMedia(db, projectId, mediaDir);
    current = {
      db,
      owner,
      outsider,
      workspaceId,
      projectId,
      event: (path, signedIn, init) => {
        const url = new URL(`https://admin.example.cz${path}`);
        return {
          request: new Request(url, init),
          url,
          params: { project: projectId, ...params() },
          locals: {
            user: signedIn ? { uiLanguage: null, ...signedIn } : undefined,
            locale: "en",
          },
        };
      },
    };
  });
  afterEach(async () => {
    delete process.env.MEDIA_DIR;
    await rm(mediaDir, { recursive: true, force: true });
  });
  return () => {
    if (!current) throw new Error("useTestProject: no project yet");
    return current;
  };
}

/** The same request from a person whose interface is in Czech. */
export function inCzech<T extends { locals: App.Locals }>(event: T): T {
  return { ...event, locals: { ...event.locals, locale: "cs" } };
}

/** What a SvelteKit `error()`/`redirect()` threw, or undefined. */
export async function thrownBy(
  fn: () => unknown,
): Promise<{ status: number; location?: string } | undefined> {
  try {
    await fn();
  } catch (e) {
    return e as { status: number; location?: string };
  }
  return undefined;
}

/** A route's default form action; SvelteKit's `Actions` type makes it optional. */
export function defined<T>(action: T | undefined): T {
  if (!action) throw new Error("missing default action");
  return action;
}
