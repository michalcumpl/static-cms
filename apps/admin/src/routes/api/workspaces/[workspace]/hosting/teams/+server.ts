import { error, json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireWorkspaceMember } from "$lib/server/access";
import { NOT_SET_UP, teamsForToken } from "$lib/server/publishing/connection";
import { secretKey } from "$lib/server/publishing/secrets";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/** Owners: the Netlify teams a pasted token can publish into (nothing is stored). */
export const POST: RequestHandler = async (event) => {
  const { role } = requireWorkspaceMember(event, event.params.workspace, { api: true });
  const { t, say } = i18n(event.locals.locale);
  if (role !== "owner") error(403, t("server.ownersConnect"));
  if (!secretKey()) return json({ message: say(NOT_SET_UP) }, { status: 503 });
  const input = (await event.request.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof input.token !== "string" || !input.token.trim()) error(400, "Expected { token }.");
  try {
    return json({ teams: await teamsForToken(input.token) });
  } catch (err) {
    if (err instanceof PublishError && err.kind === "unauthorized") {
      return json({ message: t("server.publishing.tokenRefused") }, { status: 422 });
    }
    if (err instanceof PublishError) return json({ message: say(err.said) }, { status: 502 });
    throw err;
  }
};
