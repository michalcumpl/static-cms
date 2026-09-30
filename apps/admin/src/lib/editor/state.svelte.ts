import type { Problem } from "@static-cms/site";
import { type Document, Session } from "svedit";
import { getContext, onDestroy, setContext } from "svelte";
import type { ProjectPaths } from "../project-paths";
import { createConfig } from "./config";
import { editorSchema } from "./schema";
import type { ChosenImage } from "./transforms";

export interface EditorPage {
  id: string;
  title: string;
  /** Every page has one; the home page's is only used if it stops being home. */
  slug: string;
  isHome: boolean;
  /** Position of the page's menu item in the navigation, if it has one. */
  menuIndex: number | undefined;
  /** The page's editor URL: `/p/<project>/edit/<page-id>/`. */
  href: string;
}

/** An entry of the menu as the sidebar lists it: a page of the site or an external link. */
export type MenuEntry =
  | { kind: "page"; itemId: string; index: number; page: EditorPage }
  | { kind: "external"; itemId: string; index: number; label: string; url: string };

export interface SiteData {
  document: unknown;
  version: string;
  problems: Problem[];
}

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string; problems?: Problem[] };

type SiteNodes = Record<string, { type: string; [key: string]: unknown }>;
type NodeList = { nodes: string[] };
type TextValue = { content: string };

/** Everything the editor UI shares: the one session for the whole site, and save state. */
export class EditorState {
  readonly session: Session;
  readonly siteId: string;
  /** The page on the canvas. Pages are followed by ID, so renaming or reordering keeps it. */
  currentPageId = $state("");
  /** The site's pages in document order, following the document as it is edited. */
  readonly pages: EditorPage[] = $derived.by(() => sitePages(this.session.doc, this.paths));
  readonly menu: MenuEntry[] = $derived.by(() => siteMenu(this.session.doc, this.pages));
  /** Pages without a menu item. */
  readonly unlisted: EditorPage[] = $derived(this.pages.filter((p) => p.menuIndex === undefined));
  width = $state<"desktop" | "mobile">("desktop");
  version = $state("");
  status = $state<SaveStatus>({ kind: "idle" });
  /** Problems the server reported for the last saved (or loaded) document. */
  savedProblems = $state.raw<Problem[]>([]);
  lastSaved = $state.raw<Document | undefined>(undefined);
  #lastSavedJson = "";

  /**
   * True while the document differs from what was last saved. Svedit documents are
   * copy-on-write, so an unchanged reference means no change; undo produces a new
   * object with the old content, hence the content comparison after that.
   */
  get dirty(): boolean {
    const doc = this.session.doc;
    return doc !== this.lastSaved && JSON.stringify(doc) !== this.#lastSavedJson;
  }

  #markSaved(doc: Document): void {
    this.lastSaved = doc;
    this.#lastSavedJson = JSON.stringify(doc);
  }

  constructor(
    data: SiteData,
    readonly paths: ProjectPaths,
  ) {
    const document = data.document as Document;
    this.session = new Session(editorSchema, document, createConfig());
    this.siteId = document.document_id;
    this.#markSaved(this.session.doc);
    this.version = data.version;
    this.savedProblems = data.problems;
    this.currentPageId = this.homeId;
  }

  get homeId(): string {
    return siteNode(this.session.doc)?.home_page_id ?? "";
  }

  /** The page on the canvas, or undefined once it is no longer in the site. */
  get currentPage(): EditorPage | undefined {
    return this.pages.find((page) => page.id === this.currentPageId);
  }

  /**
   * Index in `site.pages` of the page the canvas renders: the current page, or the home page
   * for the moment between the current page disappearing and the editor switching to home.
   * -1 only if neither exists.
   */
  get pageIndex(): number {
    const current = this.pages.findIndex((page) => page.id === this.currentPageId);
    return current >= 0 ? current : this.pages.findIndex((page) => page.isHome);
  }

  /** Switches the canvas to another page. The selection belongs to the old page, so it goes. */
  showPage(pageId: string): void {
    if (pageId === this.currentPageId) return;
    this.session.selection = null;
    this.currentPageId = pageId;
  }

  /**
   * Opens the media library (set by the editor layout, which owns the dialog). Resolves with
   * the chosen image, or undefined when the owner closes the library without choosing.
   */
  openLibrary: (current?: string) => Promise<ChosenImage | undefined> = async () => undefined;
  /** Opens the media library to choose several images; resolves with none when closed. */
  openLibraryMany: () => Promise<ChosenImage[]> = async () => [];

  #drafts = new Set<() => void>();

  /**
   * Registers a field's pending edit (such as a slug being typed), applied before undo or redo
   * so the edit gets its own history entry. Returns the function that unregisters it.
   */
  registerDraft(commit: () => void): () => void {
    this.#drafts.add(commit);
    return () => this.#drafts.delete(commit);
  }

  commitDrafts(): void {
    for (const commit of this.#drafts) commit();
  }

  undo(): void {
    this.commitDrafts();
    this.session.undo();
  }

  redo(): void {
    this.commitDrafts();
    this.session.redo();
  }

  async save(): Promise<void> {
    this.commitDrafts();
    if (this.status.kind === "saving") return;
    const document = this.session.doc;
    this.status = { kind: "saving" };
    try {
      const response = await fetch(this.paths.api, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ document, baseVersion: this.version }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        this.#markSaved(document);
        this.version = body.version;
        this.savedProblems = body.problems;
        this.status = { kind: "saved" };
      } else if (response.status === 409) {
        this.status = {
          kind: "conflict",
          message: body.message ?? "The site was changed elsewhere.",
        };
      } else if (response.status === 422) {
        this.status = {
          kind: "error",
          message: "The document is broken and was not saved.",
          problems: body.problems,
        };
      } else {
        this.status = {
          kind: "error",
          message: body.message ?? `Saving failed (${response.status}).`,
        };
      }
    } catch (error) {
      this.status = { kind: "error", message: `Saving failed: ${String(error)}` };
    }
  }
}

type SiteFields = { pages: NodeList; nav: string; home_page_id: string };

function siteNode(document: Document): SiteFields | undefined {
  return (document.nodes as SiteNodes)[document.document_id] as SiteFields | undefined;
}

/** The IDs of the navigation's items, in menu order. */
function navItems(document: Document): string[] {
  const nodes = document.nodes as SiteNodes;
  const site = siteNode(document);
  const nav = site ? (nodes[site.nav] as { items?: NodeList } | undefined) : undefined;
  return nav?.items?.nodes ?? [];
}

export function sitePages(document: Document, paths: ProjectPaths): EditorPage[] {
  const nodes = document.nodes as SiteNodes;
  const site = siteNode(document);
  const menuIndex = new Map<string, number>();
  navItems(document).forEach((itemId, index) => {
    const item = nodes[itemId];
    const pageId = item?.type === "page_link" ? (item.page_id as string) : undefined;
    if (pageId !== undefined && !menuIndex.has(pageId)) menuIndex.set(pageId, index);
  });
  return (site?.pages.nodes ?? []).map((id) => {
    const page = nodes[id] as { title: string; slug: string } | undefined;
    return {
      id,
      title: page?.title ?? id,
      slug: page?.slug ?? "",
      isHome: id === site?.home_page_id,
      menuIndex: menuIndex.get(id),
      href: paths.edit(id),
    };
  });
}

/** The menu in order. Items pointing at pages that no longer exist are left out. */
export function siteMenu(document: Document, pages: EditorPage[]): MenuEntry[] {
  const nodes = document.nodes as SiteNodes;
  return navItems(document).flatMap((itemId, index): MenuEntry[] => {
    const item = nodes[itemId];
    if (item?.type === "external_link") {
      const label = (item.label as TextValue).content;
      return [{ kind: "external", itemId, index, label, url: item.url as string }];
    }
    const page = pages.find((p) => p.id === item?.page_id);
    return page ? [{ kind: "page", itemId, index, page }] : [];
  });
}

const KEY = Symbol("editor");

/** The editor that is open, so route loads can check pages against the edited document. */
let active: { project: string; editor: EditorState } | undefined;

export function setEditor(editor: EditorState, project: string): EditorState {
  onDestroy(registerActiveEditor(project, editor));
  return setContext(KEY, editor);
}

/** Makes `editor` the open editor of `project`; returns the function that unregisters it. */
export function registerActiveEditor(project: string, editor: EditorState): () => void {
  active = { project, editor };
  return () => {
    if (active?.editor === editor) active = undefined;
  };
}

export function activeEditor(project: string): EditorState | undefined {
  return active?.project === project ? active.editor : undefined;
}

export function getEditor(): EditorState {
  return getContext<EditorState>(KEY);
}
