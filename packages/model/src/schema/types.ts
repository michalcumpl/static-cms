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
  /** At most one image, shown in the header; described by the site name. */
  logo: NodeArrayValue;
  /** Whether the header shows the site name next to the logo. Without a logo it always does. */
  header_show_name: boolean;
  /** Whether AI search and answer crawlers may read the site (robots.txt). */
  allow_ai_search: boolean;
  /** Whether AI training crawlers may read the site (robots.txt). */
  allow_ai_training: boolean;
  theme: string;
  nav: string;
  /** The business the site is for: contact details and opening hours. */
  business: string;
  /** The collections: `service_item`, `person`, `testimonial` and `faq_item` nodes. */
  services: NodeArrayValue;
  team: NodeArrayValue;
  testimonials: NodeArrayValue;
  faqs: NodeArrayValue;
  /** `project` nodes. */
  projects: NodeArrayValue;
  /** `project_category` nodes. */
  project_categories: NodeArrayValue;
  /** The page listing the services, under which each service has a page; "" for none. */
  services_page_id: string;
  /** The page listing the projects, under which each project has a page; "" for none. */
  projects_page_id: string;
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
  /** A font catalog ID, such as `lora` (see `FONTS`). */
  font_heading: string;
  /** A font catalog ID, such as `system-sans`. */
  font_body: string;
  radius: string;
  content_width: string;
}

export interface NavNode {
  id: string;
  type: "nav";
  items: NodeArrayValue;
}

/** Links under one label in the menu: `page_link` / `external_link` nodes, no groups. */
export interface MenuGroupNode {
  id: string;
  type: "menu_group";
  label: TextValue;
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
  /** Pairs the page with its counterparts in the project's other languages. */
  translation_key: string;
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
  /** `beside`: the text next to the image; `cover`: the image fills the hero; `slideshow`: its slides. */
  layout: "beside" | "cover" | "slideshow";
  /** `slide` nodes, shown in the `slideshow` look. */
  slides: NodeArrayValue;
}

/** A slide of a hero slideshow. */
export interface SlideNode {
  id: string;
  type: "slide";
  /** Zero or one `image` node. */
  image: NodeArrayValue;
  title: TextValue;
  /** An `https` MP4 file on Vimeo played over the photo while the slide shows, or "". */
  clip_url: string;
  /** A page, or a service or project with its own page, or "" for none. */
  target_id: string;
  /** An outside address, or "" for none. */
  url: string;
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

/** What a collection block shows. */
export type CollectionShow = "all" | "chosen";

/** The shape every collection block shares (business-collections design decision 2). */
interface CollectionBlock {
  id: string;
  heading: TextValue;
  /** `all`: the whole collection in its order; `chosen`: the items `chosen` points at. */
  show: CollectionShow;
  /** `item_ref` nodes; empty while `show` is `all`. */
  chosen: NodeArrayValue;
}

/** Shows the site's services. */
export interface ServicesNode extends CollectionBlock {
  type: "services";
  layout: "cards" | "list" | "accordion";
}

export interface ServiceItemNode {
  id: string;
  type: "service_item";
  name: TextValue;
  description: TextValue;
  price: TextValue;
  /** The service's address under the services' listing page. */
  slug: string;
  /** Paragraphs, subheadings and lists for the service's page. */
  body: NodeArrayValue;
}

/** Cards with an image, a title, a text and a link each. */
export interface CardsNode {
  id: string;
  type: "cards";
  heading: TextValue;
  /** `below`: the image, then the title and text; `over`: the title over the image. */
  layout: "below" | "over";
  /** 1–12 `card` nodes. */
  items: NodeArrayValue;
}

export interface CardNode {
  id: string;
  type: "card";
  /** Zero or one `image` node. */
  image: NodeArrayValue;
  title: TextValue;
  text: TextValue;
  /** A page, or a service or project with its own page, or "" for none. */
  target_id: string;
  /** An outside address, or "" for none. */
  url: string;
}

/** YouTube and Vimeo videos, played only when the visitor asks. */
export interface VideosNode {
  id: string;
  type: "videos";
  heading: TextValue;
  /** 1–12 `video` nodes. */
  items: NodeArrayValue;
}

export interface VideoNode {
  id: string;
  type: "video";
  /** The address of a YouTube or Vimeo video. */
  url: string;
  title: TextValue;
  caption: TextValue;
  /** Zero or one `image` node. */
  poster: NodeArrayValue;
}

/** Job openings; `empty_note` shows when there are none. */
export interface JobsNode {
  id: string;
  type: "jobs";
  heading: TextValue;
  empty_note: TextValue;
  /** 0–12 `job` nodes. */
  items: NodeArrayValue;
}

export interface JobNode {
  id: string;
  type: "job";
  title: TextValue;
  summary: TextValue;
  /** `paragraph`, `subheading` and `list` nodes. */
  body: NodeArrayValue;
  contact_name: TextValue;
  contact_email: string;
  contact_phone: string;
}

/** Shows the site's projects, all of them or one category, up to `limit`. */
export interface ProjectsNode extends CollectionBlock {
  type: "projects";
  /** A project category, or "" for every category. */
  category_id: string;
  /** At most this many projects; 0 for all of them. */
  limit: number;
}

export interface ProjectNode {
  id: string;
  type: "project";
  name: TextValue;
  /** A project category, or "" for none. */
  category_id: string;
  summary: TextValue;
  /** Paragraphs, subheadings and lists. */
  body: NodeArrayValue;
  /** `fact` nodes. */
  facts: NodeArrayValue;
  /** Zero or one `image` node. */
  cover: NodeArrayValue;
  /** `gallery_item` nodes. */
  photos: NodeArrayValue;
  /** An `https` address of the project's video, or "". */
  video_url: string;
  /** The project's address under the projects' listing page. */
  slug: string;
}

export interface ProjectCategoryNode {
  id: string;
  type: "project_category";
  name: TextValue;
}

export interface FactNode {
  id: string;
  type: "fact";
  label: TextValue;
  value: TextValue;
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
  /** `fill`: images cropped to one shape; `whole`: each image shown complete. */
  image_fit: "fill" | "whole";
}

export interface GalleryItemNode {
  id: string;
  type: "gallery_item";
  /** Exactly one `image` node. */
  image: NodeArrayValue;
  caption: TextValue;
}

/** Shows the site's team. */
export interface TeamNode extends CollectionBlock {
  type: "team";
  /** `list`: compact rows without portraits. */
  layout: "cards" | "list";
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
  /** The focal point of this use: 0–100 percent from the left and from the top. */
  focus_x: number;
  focus_y: number;
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

/** A band asking visitors to do one thing, with one or two buttons. */
export interface CallToActionNode {
  id: string;
  type: "call_to_action";
  heading: TextValue;
  text: TextValue;
  /** One or two `page_link` / `external_link` nodes. */
  actions: NodeArrayValue;
}

/** Shows the site's testimonials. */
export interface TestimonialsNode extends CollectionBlock {
  type: "testimonials";
}

/** Shows the site's questions and answers. */
export interface FaqNode extends CollectionBlock {
  type: "faq";
}

export interface FaqItemNode {
  id: string;
  type: "faq_item";
  question: TextValue;
  /** Bold, italic and links; line breaks allowed. */
  answer: TextValue;
}

/** Key figures (figures-and-steps design decision 1). */
export interface FiguresNode {
  id: string;
  type: "figures";
  heading: TextValue;
  /** Up to six `figure` nodes. */
  items: NodeArrayValue;
}

export interface FigureNode {
  id: string;
  type: "figure";
  /** Short: "10+ let", "+28,9 %". */
  value: TextValue;
  label: TextValue;
}

/** Numbered steps; the numbers come from the order. */
export interface StepsNode {
  id: string;
  type: "steps";
  heading: TextValue;
  items: NodeArrayValue;
}

export interface StepNode {
  id: string;
  type: "step";
  title: TextValue;
  /** Bold, italic and links; line breaks allowed. */
  text: TextValue;
}

/** One item a collection block shows, named by its node ID. */
export interface ItemRefNode {
  id: string;
  type: "item_ref";
  item_id: string;
}

/** A social profile of the business: an `https` address. */
export interface SocialLinkNode {
  id: string;
  type: "social_link";
  url: string;
}

export interface TestimonialNode {
  id: string;
  type: "testimonial";
  quote: TextValue;
  name: TextValue;
  detail: TextValue;
  /** At most one `image` node: the person's photo. */
  image: NodeArrayValue;
}

/** Shows the site's business details; holds none of its own. */
export interface ContactNode {
  id: string;
  type: "contact";
  heading: TextValue;
  show_address: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_map: boolean;
  /** A location of the business, or "" for all of them. */
  location_id: string;
}

/** Shows the site's opening hours; holds none of its own. */
export interface OpeningHoursNode {
  id: string;
  type: "opening_hours";
  heading: TextValue;
  /** A location of the business, or "" for all of them. */
  location_id: string;
}

export type BusinessType =
  | "LocalBusiness"
  | "Bakery"
  | "CafeOrCoffeeShop"
  | "Restaurant"
  | "Store"
  | "HairSalon"
  | "BeautySalon"
  | "ProfessionalService"
  | "MedicalBusiness"
  | "SportsActivityLocation";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

/** The business details, once per site; every text may be empty. */
/** The business: its identity, and its places (business-locations design decision 1). */
export interface BusinessNode {
  id: string;
  type: "business";
  /** Empty: the site name is used. */
  name: string;
  business_type: BusinessType;
  show_in_footer: boolean;
  /** `location` nodes, at least one; the first is the main location. */
  locations: NodeArrayValue;
  /** `social_link` nodes, in the order the footer lists them. */
  social: NodeArrayValue;
}

/** One place of the business: its contact details and opening hours; every text may be empty. */
export interface LocationNode {
  id: string;
  type: "location";
  /** Empty only while it is the business's only location. */
  name: string;
  street: string;
  postal_code: string;
  city: string;
  /** Two-letter ISO code, e.g. `CZ`. */
  country: string;
  /** International form without spaces, e.g. `+420321123456`. */
  phone: string;
  email: string;
  /** The location's own map listing (https), or "" to generate one from the address. */
  map_url: string;
  hours_note: string;
  /** Seven `opening_day` nodes, Monday first. */
  days: NodeArrayValue;
}

export interface OpeningDayNode {
  id: string;
  type: "opening_day";
  day: Weekday;
  /** `time_range` nodes in time order; none means closed. */
  ranges: NodeArrayValue;
}

export interface TimeRangeNode {
  id: string;
  type: "time_range";
  opens: string;
  closes: string;
}

export type AnyNode =
  | SiteNode
  | ThemeNode
  | NavNode
  | MenuGroupNode
  | PageLinkNode
  | ExternalLinkNode
  | PageNode
  | HeroNode
  | SlideNode
  | RichTextNode
  | ParagraphNode
  | SubheadingNode
  | ListNode
  | ListItemNode
  | ServicesNode
  | ServiceItemNode
  | ProjectsNode
  | CardsNode
  | VideosNode
  | JobsNode
  | JobNode
  | VideoNode
  | CardNode
  | ProjectNode
  | ProjectCategoryNode
  | FactNode
  | TextWithImageNode
  | GalleryNode
  | GalleryItemNode
  | TeamNode
  | PersonNode
  | LogosNode
  | LogoItemNode
  | ContactNode
  | OpeningHoursNode
  | CallToActionNode
  | TestimonialsNode
  | TestimonialNode
  | FaqNode
  | FaqItemNode
  | FiguresNode
  | FigureNode
  | StepsNode
  | StepNode
  | ItemRefNode
  | SocialLinkNode
  | BusinessNode
  | LocationNode
  | OpeningDayNode
  | TimeRangeNode
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
