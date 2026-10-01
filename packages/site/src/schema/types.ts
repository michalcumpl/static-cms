/** A half-open `[start_offset, end_offset)` range pointing at a mark or annotation node. */
export interface Range {
  start_offset: number;
  end_offset: number;
  node_id: string;
}

/** Svedit `text` value. Offsets count grapheme clusters. */
export interface TextValue {
  content: string;
  marks: Range[];
  annotations: Range[];
}

/** Svedit `node_array` value. Offsets count positions in `nodes`. */
export interface NodeArrayValue {
  nodes: string[];
  marks: Range[];
  annotations: Range[];
}

export interface SiteNode {
  id: string;
  type: "site";
  schema_version: number;
  name: string;
  /** BCP 47 language tag, e.g. `cs`. */
  lang: string;
  /** Absolute URL the site is published at, e.g. `https://anideti.cz`. Empty when unknown. */
  base_url: string;
  /** Used by pages without a description of their own. */
  description: string;
  /** At most one image, fitted into the site's square icons. */
  favicon: NodeArrayValue;
  /** At most one image: the share image of pages without their own. */
  share_image: NodeArrayValue;
  /** Whether AI search and answer crawlers may read the site (robots.txt). */
  allow_ai_search: boolean;
  /** Whether AI training crawlers may read the site (robots.txt). */
  allow_ai_training: boolean;
  theme: string;
  nav: string;
  pages: NodeArrayValue;
  /** ID of the home page, served at the site root. Its position in `pages` doesn't matter. */
  home_page_id: string;
}

export interface ThemeNode {
  id: string;
  type: "theme";
  color_primary: string;
  color_secondary: string;
  color_background: string;
  color_text: string;
  font_heading: string;
  font_body: string;
  radius: string;
  content_width: string;
}

export interface NavNode {
  id: string;
  type: "nav";
  items: NodeArrayValue;
}

/** Link to a page of this site, by page node ID so it survives slug changes. */
export interface PageLinkNode {
  id: string;
  type: "page_link";
  label: TextValue;
  page_id: string;
}

export interface ExternalLinkNode {
  id: string;
  type: "external_link";
  label: TextValue;
  url: string;
}

export interface PageNode {
  id: string;
  type: "page";
  title: string;
  /** Every page has one; the home page's is used only if it stops being home. */
  slug: string;
  seo_description: string;
  /** At most one image, shown when the page is shared as a link. */
  share_image: NodeArrayValue;
  blocks: NodeArrayValue;
}

export interface HeroNode {
  id: string;
  type: "hero";
  heading: TextValue;
  text: TextValue;
  /** Zero or one `image` node. */
  image: NodeArrayValue;
  /** Zero or one `page_link` / `external_link` node: the call to action. */
  action: NodeArrayValue;
}

export interface RichTextNode {
  id: string;
  type: "rich_text";
  body: NodeArrayValue;
}

export interface ParagraphNode {
  id: string;
  type: "paragraph";
  content: TextValue;
}

export interface SubheadingNode {
  id: string;
  type: "subheading";
  content: TextValue;
  level: 2 | 3;
}

export interface ListNode {
  id: string;
  type: "list";
  items: NodeArrayValue;
}

export interface ListItemNode {
  id: string;
  type: "list_item";
  content: TextValue;
}

export interface ServicesNode {
  id: string;
  type: "services";
  heading: TextValue;
  items: NodeArrayValue;
}

export interface ServiceItemNode {
  id: string;
  type: "service_item";
  name: TextValue;
  description: TextValue;
  price: TextValue;
}

export interface TextWithImageNode {
  id: string;
  type: "text_with_image";
  heading: TextValue;
  /** Paragraphs and lists. */
  body: NodeArrayValue;
  /** Zero or one `image` node. */
  image: NodeArrayValue;
  image_side: "left" | "right";
}

export interface GalleryNode {
  id: string;
  type: "gallery";
  heading: TextValue;
  items: NodeArrayValue;
}

export interface GalleryItemNode {
  id: string;
  type: "gallery_item";
  /** Exactly one `image` node. */
  image: NodeArrayValue;
  caption: TextValue;
}

export interface TeamNode {
  id: string;
  type: "team";
  heading: TextValue;
  people: NodeArrayValue;
}

export interface PersonNode {
  id: string;
  type: "person";
  name: TextValue;
  role: TextValue;
  text: TextValue;
  /** Zero or one portrait `image` node. */
  image: NodeArrayValue;
}

export interface LogosNode {
  id: string;
  type: "logos";
  heading: TextValue;
  items: NodeArrayValue;
}

export interface LogoItemNode {
  id: string;
  type: "logo_item";
  /** Exactly one `image` node; its description is `name`. */
  image: NodeArrayValue;
  name: TextValue;
  /** A page of the site, or "" for none. */
  page_id: string;
  /** An external address, or "" for none. */
  url: string;
}

export interface ImageNode {
  id: string;
  type: "image";
  /** Media key: the file name the caller supplies bytes for. */
  src: string;
  alt: string;
  decorative: boolean;
  /** Intrinsic size in pixels, 0 when unknown. */
  width: number;
  height: number;
}

export interface StrongNode {
  id: string;
  type: "strong";
}

export interface EmphasisNode {
  id: string;
  type: "emphasis";
}

export interface LinkNode {
  id: string;
  type: "link";
  href: string;
}

export interface InternalLinkNode {
  id: string;
  type: "internal_link";
  page_id: string;
}

export type AnyNode =
  | SiteNode
  | ThemeNode
  | NavNode
  | PageLinkNode
  | ExternalLinkNode
  | PageNode
  | HeroNode
  | RichTextNode
  | ParagraphNode
  | SubheadingNode
  | ListNode
  | ListItemNode
  | ServicesNode
  | ServiceItemNode
  | TextWithImageNode
  | GalleryNode
  | GalleryItemNode
  | TeamNode
  | PersonNode
  | LogosNode
  | LogoItemNode
  | ImageNode
  | StrongNode
  | EmphasisNode
  | LinkNode
  | InternalLinkNode;

export type NodeType = AnyNode["type"];

export type NodeOfType<T extends NodeType> = Extract<AnyNode, { type: T }>;

/** A whole site: one Svedit document rooted at a `site` node. */
export interface SiteDocument {
  document_id: string;
  nodes: Record<string, AnyNode>;
}
