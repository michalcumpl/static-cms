import { error, json } from "@sveltejs/kit";
import { requireWorkspaceMember } from "$lib/server/access";
import { NOT_SET_UP, teamsForToken } from "$lib/server/publishing/connection";
import { secretKey } from "$lib/server/publishing/secrets";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/** Owners: the Netlify teams a pasted token can publish into (nothing is stored). */
export const POST: RequestHandler = async (event) => {
  const { role } = requireWorkspaceMember(event, event.params.workspace, { api: true });
  if (role !== "owner") error(403, "Only owners can connect Netlify.");
  if (!secretKey()) return json({ message: NOT_SET_UP }, { status: 503 });
  const input = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof input.token !== "string" || !input.token.trim()) error(400, "Expected { token }.");
  try {
    return json({ teams: await teamsForToken(input.token) });
  } catch (err) {
    if (err instanceof PublishError && err.kind === "unauthorized") {
      return json(
        { message: "Netlify refused this token. Check it and try again." },
        { status: 422 },
      );
    }
    if (err instanceof PublishError) return json({ message: err.message }, { status: 502 });
    throw err;
  }
};
