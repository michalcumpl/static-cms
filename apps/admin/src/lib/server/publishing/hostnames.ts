// Domain names as members type them, shared by the domain checks and the hosting adapters.

const HOSTNAME = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** A domain as typed, lowercased and without a trailing dot; undefined when it isn't one. */
export function normalizeDomain(input: string): string | undefined {
  const domain = input.trim().toLowerCase().replace(/\.$/, "");
  return HOSTNAME.test(domain) ? domain : undefined;
}

/** A bare domain (`anideti.cz`) as opposed to a subdomain (`web.anideti.cz`). */
export function isBareDomain(domain: string): boolean {
  return domain.split(".").length === 2;
}
