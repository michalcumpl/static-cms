import type { Problem } from "@static-cms/site";
import { type Document, Session } from "svedit";
import { getContext, setContext } from "svelte";
import { createConfig } from "./config";
import { editorSchema } from "./schema";

export interface EditorPage {
  id: string;
  title: string;
  /** Empty for the home page. */
  slug: string;
  /** The page's editor URL: `/edit/` or `/edit/<slug>/`. */
  href: string;
}

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

/** Everything the editor UI shares: the one session for the whole site, and save state. */
export class EditorState {
  readonly session: Session;
  readonly siteId: string;
  readonly pages: EditorPage[];
  pageIndex = $state(0);
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

  constructor(data: SiteData) {
    const document = data.document as Document;
    this.session = new Session(editorSchema, document, createConfig());
    this.siteId = document.document_id;
    this.#markSaved(this.session.doc);
    this.version = data.version;
    this.savedProblems = data.problems;
    this.pages = sitePages(document);
  }

  /** Switches the canvas to another page. The selection belongs to the old page, so it goes. */
  showPage(index: number): void {
    if (index === this.pageIndex) return;
    this.session.selection = null;
    this.pageIndex = index;
  }

  async save(): Promise<void> {
    if (this.status.kind === "saving") return;
    const document = this.session.doc;
    this.status = { kind: "saving" };
    try {
      const response = await fetch("/api/site", {
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

export function sitePages(document: Document): EditorPage[] {
  const nodes = document.nodes as SiteNodes;
  const site = nodes[document.document_id] as { pages: { nodes: string[] } } | undefined;
  return (site?.pages.nodes ?? []).map((id, index) => {
    const page = nodes[id] as { title: string; slug: string } | undefined;
    const slug = index === 0 ? "" : (page?.slug ?? "");
    return { id, title: page?.title ?? id, slug, href: slug ? `/edit/${slug}/` : "/edit/" };
  });
}

const KEY = Symbol("editor");

export function setEditor(editor: EditorState): EditorState {
  return setContext(KEY, editor);
}

export function getEditor(): EditorState {
  return getContext<EditorState>(KEY);
}
