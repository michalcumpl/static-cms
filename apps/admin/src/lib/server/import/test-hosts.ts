import { dev } from "$app/environment";

/**
 * Local test sites the dev server may import from (`host:port`, comma-separated): the end-to-end
 * tests' fixture sites. Read only by the dev server, never by a production build.
 */
export function testHosts(): ReadonlySet<string> | undefined {
  if (!dev) return undefined;
  const hosts = process.env.E2E_IMPORT_ALLOW_HOSTS?.split(",").filter(Boolean) ?? [];
  return hosts.length ? new Set(hosts) : undefined;
}
