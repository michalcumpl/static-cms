import type { Redirect } from "@webmio/export";
import { migrateSite } from "@webmio/model";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/index";
import { publishDocuments, publishes, versions } from "../db/schema";

// Earlier addresses of still-existing pages redirect to their current ones (netlify-publishing
// design.md decision 5). Pages that no longer exist get no redirect.

type LooseDoc = {
  document_id?: string;
  nodes?: Record<
    string,
    { type?: string; slug?: string; pages?: { nodes?: string[] }; home_page_id?: string }
  >;
};

/** Each page's address in a document: `/` for home, `/<slug>/` for the others. */
export function pageAddresses(document: unknown): Map<string, string> {
  const doc = migrateSite(document) as LooseDoc;
  const nodes = doc.nodes ?? {};
  const site = doc.document_id ? nodes[doc.document_id] : undefined;
  const addresses = new Map<string, string>();
  for (const pageId of site?.pages?.nodes ?? []) {
    const page = nodes[pageId];
    if (page?.type !== "page") continue;
    addresses.set(pageId, pageId === site?.home_page_id ? "/" : `/${page.slug}/`);
  }
  return addresses;
}

/** The redirects from the addresses in earlier documents to those in the current one. */
export function redirectsFrom(earlier: readonly unknown[], current: unknown): Redirect[] {
  const now = pageAddresses(current);
  const taken = new Set(now.values());
  const redirects = new Map<string, string>();
  for (const document of earlier) {
    for (const [pageId, address] of pageAddresses(document)) {
      const to = now.get(pageId);
      // Gone pages, unchanged addresses, and addresses another page uses now: no redirect.
      if (to === undefined || to === address || taken.has(address)) continue;
      redirects.set(address, to);
    }
  }
  return [...redirects]
    .map(([from, to]) => ({ from, to }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** A language's documents in a project's successful publishes, oldest first. */
export function publishedDocuments(db: Db, projectId: string, lang: string): unknown[] {
  return db
    .select({ document: versions.document })
    .from(publishes)
    .innerJoin(publishDocuments, eq(publishDocuments.publishId, publishes.id))
    .innerJoin(versions, eq(versions.id, publishDocuments.versionId))
    .where(
      and(
        eq(publishes.projectId, projectId),
        eq(publishes.state, "ready"),
        eq(publishDocuments.lang, lang),
      ),
    )
    .orderBy(asc(publishes.startedAt))
    .all()
    .map((row) => row.document);
}

/**
 * Redirects from a language's earlier published addresses to its current ones, under the
 * language's base path (`/` for the primary, `/en/` for English).
 */
export function earlierAddresses(
  db: Db,
  projectId: string,
  lang: string,
  current: unknown,
  basePath = "/",
): Redirect[] {
  const prefix = basePath.replace(/\/+$/, "");
  return redirectsFrom(publishedDocuments(db, projectId, lang), current).map(({ from, to }) => ({
    from: prefix + from,
    to: prefix + to,
  }));
}
