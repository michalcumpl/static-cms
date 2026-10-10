import type {
  CARDS_LAYOUTS,
  GALLERY_IMAGE_FITS,
  HERO_LAYOUTS,
  SERVICES_LAYOUTS,
  TEAM_LAYOUTS,
} from "@webmio/model";

/** A text in both interface languages; a site in any other language gets the English one. */
export interface Localized {
  cs: string;
  en: string;
}

/**
 * The design tokens every template sets, by their custom property names without the dashes
 * (template-system design decision 3): a type scale, line heights, a spacing scale of five steps,
 * and a block's vertical padding on narrow and wide screens.
 */
export const TOKEN_NAMES = [
  "text-small",
  "text-body",
  "text-h3",
  "text-h2",
  "text-hero",
  "text-title",
  "leading-body",
  "leading-heading",
  "space-1",
  "space-2",
  "space-3",
  "space-4",
  "space-5",
  "block-padding",
  "block-padding-wide",
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

/** A value for every token: a CSS length (or `clamp(…)` of lengths), or a unitless number. */
export type TemplateTokens = Readonly<Record<TokenName, string>>;

/** The default look of each block that has one. */
export interface TemplateLooks {
  hero: (typeof HERO_LAYOUTS)[number];
  services: (typeof SERVICES_LAYOUTS)[number];
  team: (typeof TEAM_LAYOUTS)[number];
  gallery: (typeof GALLERY_IMAGE_FITS)[number];
  cards: (typeof CARDS_LAYOUTS)[number];
}

/** A site document as stored JSON, which upgrade steps change in place. */
export interface SiteDocumentJson {
  document_id: string;
  // biome-ignore lint/suspicious/noExplicitAny: upgrade steps work on raw JSON, as migrations do.
  nodes: Record<string, Record<string, any>>;
}

/**
 * A block of a layout: a block's settings and its starting texts, with no images, links or chosen
 * items, since those belong to a site. Texts use the builder's inline syntax; a text body's
 * paragraphs are split by blank lines, with `## ` subheadings and `- ` lists.
 */
export type LayoutBlock =
  | {
      type: "hero";
      /** The site's name, or a text. */
      heading: { from: "site-name" } | Localized;
      /** The site's description, or a text. */
      text?: { from: "site-description" } | Localized;
      layout?: TemplateLooks["hero"];
    }
  | { type: "rich_text"; body: Localized }
  | { type: "services"; heading?: Localized; layout?: TemplateLooks["services"] }
  | { type: "team"; heading?: Localized; layout?: TemplateLooks["team"] }
  | { type: "testimonials" | "faq" | "projects"; heading?: Localized }
  | { type: "contact" | "opening_hours"; heading?: Localized }
  | {
      type: "call_to_action";
      heading: Localized;
      text?: Localized;
      /** `contact`: one button, to the business's email, else its phone, else none. */
      buttons: "contact";
    }
  | { type: "jobs"; heading?: Localized; note: Localized }
  /** A Contact us form, to the business email (contact-form). */
  | { type: "contact_form"; heading: Localized; button: Localized }
  | { type: "figures"; heading?: Localized; items: { value: Localized; label: Localized }[] }
  | { type: "steps"; heading: Localized; items: { title: Localized; text?: Localized }[] };

/** A page recipe: blocks with their settings and starting texts, and no styling. */
export interface Layout {
  /** Unique within its template. */
  id: string;
  name: Localized;
  description: Localized;
  blocks: readonly LayoutBlock[];
}

/** Changes a document as a release needs; it runs on a copy, after the schema upgrades. */
export type UpgradeStep = (doc: SiteDocumentJson) => void;

/** A website system we own and ship (templates spec, "Template contract"). */
export interface Template {
  /** Lowercase letters, digits and dashes; never changed or reused once a site uses it. */
  id: string;
  /** The current release, a positive whole number. Only the current release is in the code. */
  release: number;
  name: Localized;
  /** One line. */
  description: Localized;
  /** The trades it suits, as short names, for suggesting it. */
  trades: readonly Localized[];
  tokens: TemplateTokens;
  /** Styles added after the shared block styles; "" for none. */
  css: string;
  looks: TemplateLooks;
  /** The shared layouts first, then the template's own. */
  layouts: readonly Layout[];
  /** The upgrade step of each release that changes documents, by release number. */
  upgrades: Readonly<Record<number, UpgradeStep>>;
}
