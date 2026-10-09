// Server administration. Run from apps/admin: `pnpm admin <command>`.
// Uses the same database settings as the app (DATABASE_PATH, MIGRATIONS_DIR).

import { and, eq } from "drizzle-orm";
import { createUser, importSiteCommand } from "../src/lib/server/admin-commands";
import { openDatabase } from "../src/lib/server/db/index";
import { memberships } from "../src/lib/server/db/schema";
import { loadSite } from "../src/lib/server/load-site";
import { cleanupMedia } from "../src/lib/server/media";

const usage = `Usage:
  pnpm admin create-user <email> "<workspace name>"
      Creates a user who owns a new workspace and prints a sign-in link (valid 15 minutes).
      On an upgraded installation the first user owns the imported "Default" workspace.
  pnpm admin media-cleanup [--dry-run]
      Deletes the files of images removed from a library that no stored version uses.
      Uses MEDIA_DIR like the app. With --dry-run, only lists them.
  pnpm admin load-site <folder> --workspace <workspace id>
      Creates a project in the workspace from a folder: project.json (name, primaryLang,
      languages), a site document per language and its images in images/. Prints every
      problem and creates nothing when the folder has errors.
  pnpm admin import-site <workspace id> <address>
      Imports a public website into a new project of the workspace, as its first owner, with
      the same rules and limits as "Start from your current website". Prints the progress,
      what was imported and left out, and the project's address. Use only for content the
      workspace may use.`;

const [command, ...args] = process.argv.slice(2);
const origin = process.env.ORIGIN ?? "http://localhost:5173";

if (command === "create-user" && args.length === 2) {
  const [email = "", workspace = ""] = args;
  const result = createUser(openDatabase(), email, workspace, origin);
  if (!result.ok) {
    console.error(
      result.reason === "exists"
        ? `An account for ${email} already exists.`
        : `"${email}" is not an email address.`,
    );
    process.exit(1);
  }
  console.log(
    result.joinedImported
      ? `Created ${email}, owner of the imported "Default" workspace.`
      : `Created ${email}, owner of "${workspace}".`,
  );
  console.log(`Sign in (valid 15 minutes): ${result.link}`);
} else if (command === "media-cleanup" && (args.length === 0 || args[0] === "--dry-run")) {
  const dryRun = args[0] === "--dry-run";
  const deleted = cleanupMedia(openDatabase(), { dryRun });
  for (const { projectId, key } of deleted) {
    console.log(`${dryRun ? "Would delete" : "Deleted"} ${key} (project ${projectId})`);
  }
  console.log(
    deleted.length === 0
      ? "No unused removed images."
      : `${deleted.length} image(s) ${dryRun ? "would be deleted" : "deleted"}.`,
  );
} else if (command === "load-site" && args.length === 3 && args[1] === "--workspace") {
  const [folder = "", , workspaceId = ""] = args;
  const db = openDatabase();
  // The project is recorded as made by the workspace's first owner.
  const owner = db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.role, "owner")))
    .get();
  const result = await loadSite(db, folder, workspaceId, owner?.userId ?? null);
  if (!result.ok) {
    console.error(`The site wasn't loaded:\n${result.problems.map((p) => `- ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`Loaded: ${origin}/p/${result.projectId}/`);
} else if (command === "import-site" && args.length === 2) {
  const [workspaceId = "", address = ""] = args;
  const result = await importSiteCommand(openDatabase(), workspaceId, address, origin, console.log);
  process.exit(result.ok ? 0 : 1);
} else {
  console.error(usage);
  process.exit(command ? 1 : 0);
}
