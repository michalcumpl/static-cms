import type { AnyNode, NodeOfType, NodeType, SiteDocument, SiteNode } from "@webmio/model";
import {
  blockItems,
  type CollectionBlockNode,
  type CollectionItemNode,
  isSafeHref,
} from "@webmio/model";
import { type BusinessInfo, businessInfo, type LocationInfo, locationsFor } from "./business.js";
import { type SiteStrings, siteStrings } from "./strings.js";

const BASE_PATH = /^\/((?!\.\.?\/)[A-Za-z0-9._~-]+\/)*$/;

/** A base path is root-relative and ends with a slash: `/`, `/preview/`, `/web/site/`. */
export function isValidBasePath(basePath: string): boolean {
  return BASE_PATH.test(basePath);
}

/** One of the site's languages, as rendering needs it for alternates and the switcher. */
export interface SiteLanguage {
  lang: string;
  /** The language's name in that language, e.g. "English". */
  name: string;
  /** Where the language is served: `/` for the primary, `/en/` for English. */
  basePath: string;
  primary: boolean;
  /** Each page's URL (including the base path) by its translation key. */
  pages: ReadonlyMap<string, string>;
  /** The language's home page URL. */
  home: string;
}

export interface PageRoute {
  /** Output file path relative to the site root: `index.html`, `kontakt/index.html`. */
  path: string;
  /** Path relative to the base path, as linked: `""` for home, `kontakt/`. */
  route: string;
}

/** What block and page renderers need. Only built from documents that passed validation. */
export class RenderContext {
  readonly site: SiteNode;
  readonly routes = new Map<string, PageRoute>();
  private readonly nodes: Record<string, AnyNode>;

  /** The site's business details, resolved. */
  readonly business: BusinessInfo;
  /** Text the renderer writes itself, in the site's language. */
  readonly strings: SiteStrings;

  constructor(
    readonly doc: SiteDocument,
    readonly basePath: string,
    /** The site's address without a trailing slash, like `https://anideti.cz`, when known. */
    readonly siteUrl?: string,
    /** The site's languages, when it has several (alternates and the language switcher). */
    readonly languages: readonly SiteLanguage[] = [],
    /**
     * Where the site's shared files (stylesheet, images, icons) are served: the site's root,
     * which differs from `basePath` for a language under `/<lang>/`.
     */
    readonly assetBasePath: string = basePath,
  ) {
    this.nodes = doc.nodes;
    this.site = this.node(doc.document_id, "site");
    this.business = businessInfo(
      doc.nodes as unknown as Record<string, Record<string, unknown>>,
      this.site.business,
    );
    this.strings = siteStrings(this.site.lang);
    for (const pageId of this.site.pages.nodes) {
      const { slug } = this.node(pageId, "page");
      this.routes.set(
        pageId,
        pageId === this.homeId
          ? { path: "index.html", route: "" }
          : { path: `${slug}/index.html`, route: `${slug}/` },
      );
    }
  }

  /** The home page, served at the base path; its own slug is never used while it is home. */
  get homeId(): string {
    return this.site.home_page_id;
  }

  node<T extends NodeType>(id: string, type: T): NodeOfType<T> {
    const node = this.nodes[id];
    if (node?.type !== type) {
      throw new Error(`Expected ${id} to be a ${type} node; validation should have caught this.`);
    }
    return node as NodeOfType<T>;
  }

  markNode(id: string): NodeOfType<"strong" | "emphasis" | "link" | "internal_link"> {
    const node = this.nodes[id];
    switch (node?.type) {
      case "strong":
      case "emphasis":
      case "link":
      case "internal_link":
        return node;
      default:
        throw new Error(`Expected ${id} to be a mark node; validation should have caught this.`);
    }
  }

  /**
   * The locations a contact or opening hours block shows: all of them for `""`, or the one it
   * chose; none for a location that no longer exists.
   */
  locationsFor(locationId: string): LocationInfo[] {
    return locationsFor(this.business, locationId);
  }

  /** The items a collection block shows (business-collections design decision 3). */
  items(block: CollectionBlockNode): CollectionItemNode[] {
    return blockItems(this.doc, block);
  }

  /** Nodes of a node_array, in order. */
  children(ids: { nodes: string[] }): AnyNode[] {
    return ids.nodes.flatMap((id) => this.nodes[id] ?? []);
  }

  /**
   * A URL for one of the site's shared files, e.g. `assets/style.css`: at the site's root, which
   * every language shares.
   */
  url(path: string): string {
    return this.assetBasePath + path;
  }

  /** The absolute URL of a path inside the site; only called when the site address is known. */
  absoluteUrl(path: string): string {
    if (this.siteUrl === undefined) throw new Error("The site's address is unknown.");
    return this.siteUrl + this.url(path);
  }

  /** Whether pages get alternates and a language switcher: with two or more languages. */
  get multilingual(): boolean {
    return this.languages.length >= 2;
  }

  /** A path inside the site as a link: absolute when the site's address is known. */
  link(path: string): string {
    return this.siteUrl === undefined ? path : this.siteUrl + path;
  }

  /** A page's absolute URL for canonical links, or undefined without a site address. */
  canonicalUrl(pageId: string): string | undefined {
    return this.siteUrl === undefined ? undefined : this.siteUrl + this.pageUrl(pageId);
  }

  pageUrl(pageId: string): string {
    const route = this.routes.get(pageId);
    if (!route) throw new Error(`Page ${pageId} is not part of the site.`);
    return this.basePath + route.route;
  }

  /** An href from document data; validation already rejected unsafe ones. */
  href(href: string): string {
    if (!isSafeHref(href))
      throw new Error(`Unsafe link ${href}; validation should have caught this.`);
    return href;
  }
}
