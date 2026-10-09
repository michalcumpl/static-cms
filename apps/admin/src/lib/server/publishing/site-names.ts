// Websites' names: the free address `<name>.webmio.site` (own-hosting design.md decision 10),
// and Netlify's `sc-<project id>` for websites that stay there.
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { projectHosting } from "../db/schema";

export const MAX_NAME_LENGTH = 40;

/** Names Webmio keeps for its own addresses. */
export const RESERVED_NAMES: ReadonlySet<string> = new Set([
  "www",
  "api",
  "admin",
  "app",
  "mail",
  "sites",
  "webmio",
  "status",
  "help",
  "docs",
  "blog",
  "static",
  "cdn",
]);

/** "Pekárna U Lípy" → `pekarna-u-lipy`: lowercase, no diacritics, at most 40 characters. */
export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_NAME_LENGTH)
    .replace(/-+$/, "");
  return slug || "web";
}

/** `base`, `base-2`, `base-3`, …, each at most 40 characters. */
export function* nameCandidates(base: string): Generator<string> {
  yield base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    yield `${base.slice(0, MAX_NAME_LENGTH - suffix.length).replace(/-+$/, "")}${suffix}`;
  }
}

/**
 * The free names to try for a project's first publish to Webmio hosting, in order: its name,
 * then with a number, skipping reserved names and names another website has.
 */
export function* freeSiteNames(db: Db, projectName: string): Generator<string> {
  for (const name of nameCandidates(slugifyName(projectName))) {
    if (RESERVED_NAMES.has(name)) continue;
    const taken = db
      .select({ id: projectHosting.projectId })
      .from(projectHosting)
      .where(and(eq(projectHosting.provider, "webmio"), eq(projectHosting.siteName, name)))
      .get();
    if (!taken) yield name;
  }
}

/** `sc-<project id>` as a Netlify site name: lowercase letters, digits and dashes. */
export function siteNameFor(projectId: string): string {
  return `sc-${projectId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}
