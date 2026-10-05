const SAFE_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

/**
 * True for links a published page may contain: http(s), mailto and tel URLs, and
 * root-relative paths. Anything else (javascript:, data:, protocol-relative //host,
 * or strings that only become a scheme after browsers strip whitespace) is rejected.
 */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//") && !href.startsWith("/\\");
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(href)?.[1]?.toLowerCase();
  if (scheme === undefined || !SAFE_SCHEMES.has(scheme)) return false;
  if (scheme === "http" || scheme === "https") return URL.canParse(href);
  return true;
}
