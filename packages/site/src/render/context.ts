import { isSafeHref } from "../links.js";
import type { AnyNode, NodeOfType, NodeType, SiteDocument, SiteNode } from "../schema/index.js";

const BASE_PATH = /^\/((?!\.\.?\/)[A-Za-z0-9._~-]+\/)*$/;

/** A base path is root-relative and ends with a slash: `/`, `/preview/`, `/web/site/`. */
export function isValidBasePath(basePath: string): boolean {
  return BASE_PATH.test(basePath);
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

  constructor(
    doc: SiteDocument,
    readonly basePath: string,
    /** The site's address without a trailing slash, like `https://anideti.cz`, when known. */
    readonly siteUrl?: string,
  ) {
    this.nodes = doc.nodes;
    this.site = this.node(doc.document_id, "site");
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

  /** Nodes of a node_array, in order. */
  children(ids: { nodes: string[] }): AnyNode[] {
    return ids.nodes.flatMap((id) => this.nodes[id] ?? []);
  }

  /** A URL for a path inside the site, e.g. `assets/style.css`. */
  url(path: string): string {
    return this.basePath + path;
  }

  /** The absolute URL of a path inside the site; only called when the site address is known. */
  absoluteUrl(path: string): string {
    if (this.siteUrl === undefined) throw new Error("The site's address is unknown.");
    return this.siteUrl + this.url(path);
  }

  /** A page's absolute URL for canonical links, or undefined without a site address. */
  canonicalUrl(pageId: string): string | undefined {
    return this.siteUrl === undefined ? undefined : this.siteUrl + this.pageUrl(pageId);
  }

  pageUrl(pageId: string): string {
    const route = this.routes.get(pageId);
    if (!route) throw new Error(`Page ${pageId} is not part of the site.`);
    return this.url(route.route);
  }

  /** An href from document data; validation already rejected unsafe ones. */
  href(href: string): string {
    if (!isSafeHref(href))
      throw new Error(`Unsafe link ${href}; validation should have caught this.`);
    return href;
  }
}
