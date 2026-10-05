import type { TranslationPage } from "@webmio/model";
import type { Document, Session } from "svedit";

// Pairing pages across languages (language-tools design.md decision 2): only the document of the
// language being edited changes, through the editor's undo and save.

/** A language's pages as loaded with the editor, with what it still needs. */
export interface EditorTranslations {
  lang: string;
  name: string;
  primary: boolean;
  pages: TranslationPage[];
  untranslated: TranslationPage[];
  missing: TranslationPage[];
}

type PageFields = { id: string; title: string; slug: string; translation_key: string };

function pagesOf(doc: Document): PageFields[] {
  const site = doc.nodes[doc.document_id] as unknown as { pages: { nodes: string[] } };
  return site.pages.nodes.flatMap((id) => {
    const page = doc.nodes[id] as unknown as PageFields | undefined;
    return page ? [page] : [];
  });
}

/** Links a page to a page of another language: it takes that page's translation key. */
export function linkPage(session: Session, pageId: string, key: string): void {
  const page = session.doc.nodes[pageId] as unknown as PageFields | undefined;
  if (!page || page.translation_key === key) return;
  session.apply(session.tr.set([pageId, "translation_key"], key));
}

/** Unlinks a page from its counterparts: it gets a translation key of its own again. */
export function unlinkPage(session: Session, pageId: string): void {
  const page = session.doc.nodes[pageId] as unknown as PageFields | undefined;
  if (!page || page.translation_key === pageId) return;
  session.apply(session.tr.set([pageId, "translation_key"], pageId));
}

/** A language's counterpart of the page with this key, if it has one. */
export function counterpartIn(
  language: EditorTranslations,
  key: string,
): TranslationPage | undefined {
  return language.pages.find((page) => page.key === key);
}

/**
 * The pages of another language a page can be linked to: those without a counterpart in the
 * document being edited (its unsaved state included).
 */
export function linkChoices(language: EditorTranslations, doc: Document): TranslationPage[] {
  const keys = new Set(pagesOf(doc).map((page) => page.translation_key));
  return language.pages.filter((page) => !keys.has(page.key));
}

/**
 * Whether a page of a language other than the primary still has the primary's title, or (except
 * for the home page) its slug; follows the document as the owner types.
 */
export function isUntranslated(
  primary: EditorTranslations | undefined,
  page: PageFields,
  isHome: boolean,
): boolean {
  const original = primary && counterpartIn(primary, page.translation_key);
  if (!original) return false;
  return page.title === original.title || (!isHome && page.slug === original.slug);
}
