import { FONTS, type FontId, isFontId } from "@webmio/model";
import type { Localized } from "@webmio/templates";
import { siteTemplate } from "$lib/editor/template";

// What the panel's cards say about a saved site (control-panel design decisions 3 and 7). Pure
// functions of the document, so the dashboard's server load and the Website page share them.

// biome-ignore lint/suspicious/noExplicitAny: summaries read a stored document loosely.
type Doc = { document_id: string; nodes: Record<string, any> };

const ids = (value: unknown): string[] => (value as { nodes?: string[] } | undefined)?.nodes ?? [];

export interface DesignSummary {
  /** The site's template, named and described in both interface languages (template-system). */
  template: { name: Localized; description: Localized };
  /** Primary, secondary, background and text, as the theme stores them. */
  colors: string[];
  headingFont: string;
  bodyFont: string;
  /** The logo's media key and width, when the site has one. */
  logo: { src: string; width: number } | undefined;
}

const fontName = (id: unknown) => (isFontId(id) ? FONTS[id as FontId].name : String(id ?? ""));

export function designSummary(doc: Doc): DesignSummary {
  const site = doc.nodes[doc.document_id] ?? {};
  const theme = doc.nodes[site.theme] ?? {};
  const logoId = ids(site.logo)[0];
  const logo = logoId ? doc.nodes[logoId] : undefined;
  const { name, description } = siteTemplate(doc);
  return {
    template: { name, description },
    colors: [
      theme.color_primary,
      theme.color_secondary,
      theme.color_background,
      theme.color_text,
    ].map((c) => String(c ?? "")),
    headingFont: fontName(theme.font_heading),
    bodyFont: fontName(theme.font_body),
    logo: logo ? { src: String(logo.src), width: Number(logo.width) } : undefined,
  };
}

export interface SiteSummary {
  siteName: string;
  businessName: string;
  mainCity: string;
  locations: number;
  services: number;
  questions: number;
  people: number;
  testimonials: number;
  pages: number;
}

export function siteSummary(doc: Doc): SiteSummary {
  const site = doc.nodes[doc.document_id] ?? {};
  const business = doc.nodes[site.business] ?? {};
  const locations = ids(business.locations).map((id) => doc.nodes[id] ?? {});
  const pages = ids(site.pages);
  return {
    siteName: String(site.name ?? ""),
    businessName: String(business.name || site.name || ""),
    mainCity: String(locations[0]?.city ?? ""),
    locations: locations.length,
    services: ids(site.services).length,
    questions: ids(site.faqs).length,
    people: ids(site.team).length,
    testimonials: ids(site.testimonials).length,
    pages: pages.length,
  };
}
