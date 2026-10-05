// AI crawlers by what they do, for the site's two AI switches (seo-and-metadata design.md
// decision 5). Checked against each vendor's documentation on 2026-09-30; update both lists as
// crawlers change. Never list traditional search crawlers (Googlebot, Bingbot, Applebot) or
// link-preview fetchers (facebookexternalhit): blocking them would hide the site from search or
// break link previews. Fetchers acting on a user's request (ChatGPT-User, Perplexity-User,
// Meta-ExternalFetcher) say they may ignore robots.txt, so for them the switch only asks.

/** Crawlers and fetchers AI assistants and AI search use to find, quote and read pages. */
export const AI_SEARCH_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Meta-WebIndexer",
  "Meta-ExternalFetcher",
] as const;

/**
 * Crawlers that collect pages for training AI models, and the tokens that opt a site out of
 * such use without affecting search (Google-Extended, Applebot-Extended).
 */
export const AI_TRAINING_AGENTS = [
  "GPTBot",
  "ClaudeBot",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Meta-ExternalAgent",
  "Bytespider",
] as const;

export interface RobotsOptions {
  allowAiSearch: boolean;
  allowAiTraining: boolean;
  /** The sitemap's absolute URL, when the site's address is known. */
  sitemapUrl?: string;
}

/**
 * The site's `robots.txt`: everything allowed, except one `Disallow: /` group per AI category
 * the owner switched off, and the sitemap when its address is known.
 */
export function robotsTxt(options: RobotsOptions): string {
  const groups: string[] = [];
  const disallow = (agents: readonly string[]) =>
    groups.push(`${agents.map((agent) => `User-agent: ${agent}\n`).join("")}Disallow: /\n`);
  if (!options.allowAiSearch) disallow(AI_SEARCH_AGENTS);
  if (!options.allowAiTraining) disallow(AI_TRAINING_AGENTS);
  groups.push("User-agent: *\nAllow: /\n");
  if (options.sitemapUrl !== undefined) groups.push(`Sitemap: ${options.sitemapUrl}\n`);
  return groups.join("\n");
}
