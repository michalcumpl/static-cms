import { getDb } from "$lib/server/app";
import { bareDomainConnected } from "$lib/server/publishing/domains";
import type { RequestHandler } from "./$types";

/**
 * Whether the redirect server may get a certificate for `?domain=` (bare-domain-redirect design.md
 * decision 4): 200 for a bare domain connected to a website on Webmio hosting, 404 otherwise.
 * Caddy asks it without signing in; the answer says no more than the domain's DNS does.
 */
export const GET: RequestHandler = ({ url }) => {
  const allowed = bareDomainConnected(getDb(), url.searchParams.get("domain") ?? "");
  return new Response(allowed ? "ok\n" : "not connected\n", {
    status: allowed ? 200 : 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
};
