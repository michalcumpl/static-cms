// Server administration. Run from apps/admin: `pnpm admin <command>`.
// Uses the same database settings as the app (DATABASE_PATH, MIGRATIONS_DIR).
import { createUser } from "../src/lib/server/admin-commands";
import { openDatabase } from "../src/lib/server/db/index";

const usage = `Usage:
  pnpm admin create-user <email> "<workspace name>"
      Creates a user who owns a new workspace and prints a sign-in link (valid 15 minutes).
      On an upgraded installation the first user owns the imported "Default" workspace.`;

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
} else {
  console.error(usage);
  process.exit(command ? 1 : 0);
}
