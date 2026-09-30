import { error, json } from "@sveltejs/kit";
import { requireWorkspaceMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import {
  connectionInfo,
  connectWorkspace,
  disconnectWorkspace,
} from "$lib/server/publishing/connection";
import type { RequestHandler } from "./$types";

/** The workspace's Netlify connection (team, who connected it, when); never the token. */
export const GET: RequestHandler = (event) => {
  requireWorkspaceMember(event, event.params.workspace, { api: true });
  return json({ connection: connectionInfo(getDb(), event.params.workspace) ?? null });
};

/** Owners: connect with `{ token, account }`. 200 with the connection; 400/422/503 with a message. */
export const PUT: RequestHandler = async (event) => {
  const { user, role } = requireWorkspaceMember(event, event.params.workspace, { api: true });
  if (role !== "owner") error(403, "Only owners can connect Netlify.");
  const input = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof input.token !== "string" || typeof input.account !== "string" || !input.token.trim()) {
    error(400, "Expected { token, account }.");
  }
  const result = await connectWorkspace(getDb(), event.params.workspace, user.id, {
    token: input.token,
    account: input.account,
  });
  if (result.ok) return json({ connection: result.info });
  const status = result.reason === "not-set-up" ? 503 : 422;
  return json({ message: result.message }, { status });
};

/** Owners: disconnect. The projects' sites at Netlify stay as they are. */
export const DELETE: RequestHandler = (event) => {
  const { role } = requireWorkspaceMember(event, event.params.workspace, { api: true });
  if (role !== "owner") error(403, "Only owners can disconnect Netlify.");
  disconnectWorkspace(getDb(), event.params.workspace);
  return new Response(null, { status: 204 });
};
