import { json } from "@sveltejs/kit";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { canPublish, connectionInfo, webmioBackend } from "$lib/server/publishing/connection";
import { publishingState } from "$lib/server/publishing/publish";
import type { RequestHandler } from "./$types";

/**
 * The project's address, domain and publishes; whether it can publish without anyone connecting
 * hosting first, where it is hosted (`provider`, null before the first publish: then where it
 * would go), and the workspace's Netlify team, if connected.
 */
export const GET: RequestHandler = (event) => {
  const { workspace } = requireMember(event, event.params.project, { api: true });
  const db = getDb();
  const connection = connectionInfo(db, workspace.id);
  const state = publishingState(db, event.params.project);
  return json({
    ...state,
    canPublish: canPublish(db, event.params.project),
    provider: state.provider ?? (webmioBackend() ? "webmio" : "netlify"),
    team: connection?.accountName ?? null,
  });
};
