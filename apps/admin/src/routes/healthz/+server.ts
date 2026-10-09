import { getDb } from "$lib/server/app";
import { migrationsApplied } from "$lib/server/db/index";
import type { RequestHandler } from "./$types";

/**
 * Whether the admin can serve (admin-on-aws, "Health endpoint"): 200 once the database is open
 * and migrated, 503 otherwise. For the deploy and the uptime check; no sign-in, no data.
 */
export const GET: RequestHandler = () => {
  let healthy = false;
  try {
    healthy = migrationsApplied(getDb());
  } catch (error) {
    console.error("[healthz]", error);
  }
  return new Response(healthy ? "ok\n" : "unavailable\n", {
    status: healthy ? 200 : 503,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
};
