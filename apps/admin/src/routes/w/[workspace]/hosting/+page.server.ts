import { eq } from "drizzle-orm";
import { notFound, requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { workspaces } from "$lib/server/db/schema";
import { roleIn } from "$lib/server/members";
import { connectionInfo } from "$lib/server/publishing/connection";
import { secretKey } from "$lib/server/publishing/secrets";
import type { PageServerLoad } from "./$types";

/** Members see the Netlify connection; owners change it through the hosting API. */
export const load: PageServerLoad = (event) => {
  const user = requireUser(event);
  const db = getDb();
  const workspaceId = event.params.workspace;
  const role = roleIn(db, user.id, workspaceId);
  if (!role) notFound(event);
  const workspace = db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).get();
  return {
    role,
    workspace: { id: workspaceId, name: workspace?.name ?? "" },
    connection: connectionInfo(db, workspaceId) ?? null,
    setUp: secretKey() !== undefined,
  };
};
