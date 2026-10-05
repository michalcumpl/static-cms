import { type BusinessInfo, businessInfo, type SiteStrings, siteStrings } from "@webmio/render";
import type { Document } from "svedit";

/** The site's business details and strings, as the canvas shows them (from the session's doc). */
export function businessView(doc: Document): {
  info: BusinessInfo;
  strings: SiteStrings;
  siteName: string;
} {
  const site = doc.nodes[doc.document_id] as unknown as {
    business: string;
    lang: string;
    name: string;
  };
  return {
    info: businessInfo(
      doc.nodes as unknown as Record<string, Record<string, unknown>>,
      site.business,
    ),
    strings: siteStrings(site.lang),
    siteName: site.name,
  };
}
