import { json } from "@sveltejs/kit";
import { i18n } from "$lib/i18n";
import { requireMember } from "$lib/server/access";
import { getDb } from "$lib/server/app";
import { connectDomain, disconnectDomain } from "$lib/server/publishing/domains";
import { PublishError } from "$lib/server/publishing/target";
import type { RequestHandler } from "./$types";

/**
 * Connects `{ domain }`: 200, 400 (not a domain), 409 (not published, taken here or by another
 * service, not connected), 502 (the hosting failed).
 */
export const PUT: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  const input = (await event.request.json().catch(() => ({}))) as { domain?: unknown };
  try {
    const result = await connectDomain(getDb(), event.params.project, String(input.domain ?? ""));
    if (result.ok) return json({ ok: true });
    return json(
      { message: i18n(event.locals.locale).say(result.message), reason: result.reason },
      { status: result.reason === "invalid" ? 400 : 409 },
    );
  } catch (err) {
    if (err instanceof PublishError)
      return json({ message: i18n(event.locals.locale).say(err.said) }, { status: 502 });
    throw err;
  }
};

export const DELETE: RequestHandler = async (event) => {
  requireMember(event, event.params.project, { api: true });
  try {
    await disconnectDomain(getDb(), event.params.project);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof PublishError)
      return json({ message: i18n(event.locals.locale).say(err.said) }, { status: 502 });
    throw err;
  }
};
