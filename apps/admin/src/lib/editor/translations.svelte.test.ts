import type { Session } from "svedit";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { EditorState } from "./state.svelte";
import {
  type EditorTranslations,
  isUntranslated,
  linkChoices,
  linkPage,
  unlinkPage,
} from "./translations";

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

function editor() {
  return new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p_test"),
  );
}
const node = (s: Session, id: string) => s.get(id) as AnyNode;

const czech: EditorTranslations = {
  lang: "cs",
  name: "Čeština",
  primary: true,
  pages: [
    { key: "page_home", pageId: "page_home", title: "Úvod", slug: "uvod", home: true },
    { key: "page_contact", pageId: "page_contact", title: "Kontakt", slug: "kontakt", home: false },
    { key: "page_about", pageId: "page_about", title: "O nás", slug: "o-nas", home: false },
  ],
  untranslated: [],
  missing: [],
};

describe("linking pages", () => {
  it("links a page to another language's page, in one undo step", () => {
    const { session: s } = editor();
    linkPage(s, "page_contact", "page_about");
    expect(node(s, "page_contact").translation_key).toBe("page_about");
    s.undo();
    expect(node(s, "page_contact").translation_key).toBe("page_contact");
  });

  it("unlinks a page: it gets its own key again", () => {
    const { session: s } = editor();
    linkPage(s, "page_contact", "page_about");
    unlinkPage(s, "page_contact");
    expect(node(s, "page_contact").translation_key).toBe("page_contact");
  });

  it("offers only the other language's pages without a counterpart here", () => {
    const { session: s } = editor();
    expect(linkChoices(czech, s.doc).map((p) => p.title)).toEqual(["O nás"]);
    linkPage(s, "page_contact", "page_about");
    // "Kontakt" (key page_contact) now has no counterpart here; "O nás" does.
    expect(linkChoices(czech, s.doc).map((p) => p.title)).toEqual(["Kontakt"]);
  });
});

describe("isUntranslated", () => {
  const page = (title: string, slug: string) => ({
    id: "page_contact",
    title,
    slug,
    translation_key: "page_contact",
  });

  it("is true while the title or slug is the primary's, and judges home by title", () => {
    expect(isUntranslated(czech, page("Kontakt", "contact"), false)).toBe(true);
    expect(isUntranslated(czech, page("Contact", "kontakt"), false)).toBe(true);
    expect(isUntranslated(czech, page("Contact", "contact"), false)).toBe(false);
    expect(
      isUntranslated(czech, { ...page("Home", "uvod"), translation_key: "page_home" }, true),
    ).toBe(false);
  });
});
