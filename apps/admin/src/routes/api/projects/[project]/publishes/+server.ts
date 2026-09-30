import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { connectionInfo } from "$lib/server/publishing/connection";
import { publishingState } from "$lib/server/publishing/publish";
import type { RequestHandler } from "./$types";

/** The project's address, domain, whether its workspace is connected, and its publishes. */
export const GET: RequestHandler = (event) => {
  const { workspace } = requireMember(event, event.params.project, { api: true });
  const connection = connectionInfo(getDb(), workspace.id);
  return json({
    connected: Boolean(connection),
    team: connection?.accountName ?? null,
    ...publishingState(getDb(), event.params.project),
  });
};
