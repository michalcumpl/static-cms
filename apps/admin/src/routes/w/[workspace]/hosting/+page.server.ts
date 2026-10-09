import { eq } from "drizzle-orm";
import { notFound, requireUser } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { workspaces } from "$lib/server/db/schema";
import { roleIn } from "$lib/server/members";
import { connectionInfo, webmioBackend } from "$lib/server/publishing/connection";
import { secretKey } from "$lib/server/publishing/secrets";
import type { PageServerLoad } from "./$types";

/**
 * Members see the Netlify connection; owners change it through the hosting API. On a server
 * with Webmio hosting there is nothing to connect: only an existing connection is shown, so its
 * owners can still disconnect it.
 */
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
    webmio: webmioBackend() !== undefined,
  };
};
