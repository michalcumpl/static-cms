import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { eq } from "drizzle-orm";
import { openDatabase } from "../src/lib/server/db/index";
import { users } from "../src/lib/server/db/schema";
import { demoSite } from "../src/lib/server/demo";
import { registerLegacyMedia } from "../src/lib/server/media";
import { listWorkspaces } from "../src/lib/server/members";
import { createProject } from "../src/lib/server/site-documents";
import { writeState } from "./state";

const require = createRequire(import.meta.url);

/**
 * Creates the owner with the real admin command, gives their workspace a project with
 * the demo site and its image, and adds a user from another workspace.
 */
export default async function globalSetup(): Promise<void> {
  const admin = (email: string, workspace: string) =>
    execFileSync("pnpm", ["admin", "create-user", email, workspace], {
      env: process.env,
      stdio: "pipe",
    });
  admin("jana@example.cz", "Pekárna U Lípy");
  admin("eva@example.cz", "Kadeřnictví Eva");

  const db = openDatabase();
  const user = (email: string) => {
    const row = db.select().from(users).where(eq(users.email, email)).get();
    if (!row) throw new Error(`admin command didn't create ${email}`);
    return { id: row.id, email: row.email };
  };
  const owner = user("jana@example.cz");
  const outsider = user("eva@example.cz");
  const workspaceId = listWorkspaces(db, owner.id)[0]?.id ?? "";
  const projectId = createProject(db, workspaceId, "Pekárna U Lípy", demoSite(), owner.id);

  const media = join(process.env.MEDIA_DIR ?? "", projectId);
  mkdirSync(media, { recursive: true });
  const fixtures = dirname(require.resolve("@webmio/model/fixtures/demo-site.json"));
  copyFileSync(join(fixtures, "media", "hero.png"), join(media, "hero.png"));
  // As the server does at startup for files from before the library.
  await registerLegacyMedia(db, projectId);

  writeState({ owner, outsider, workspaceId, projectId });
}
