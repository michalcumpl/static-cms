import { validateSite } from "@webmio/model";
import { describe, expect, it } from "vitest";
import { projectPaths } from "$lib/project-paths";
import { demoSite } from "$lib/server/demo";
import { setFormButton, setFormKind, setFormRecipient } from "./contact-form";
import { BLOCK_TYPES } from "./handles";
import { EditorState } from "./state.svelte";
import { insertBlockAt } from "./structure";
import { text } from "./transforms";

// Contact forms in the editor (contact-form spec, "Contact form in the editor").

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type AnyNode = Record<string, any>;

const contactBlocks = ["site_1", "pages", 1, "blocks"];

function setup() {
  const editor = new EditorState(
    { document: demoSite(), version: "v1", problems: [] },
    projectPaths("p"),
  );
  const { session } = editor;
  const get = (id: string) => session.get(id) as AnyNode;
  insertBlockAt(session, contactBlocks, 0, "contact_form");
  const formId = get("page_contact").blocks.nodes[0] as string;
  return { session, get, formId };
}

describe("contact form block", () => {
  it("is offered by the picker, last", () => {
    expect(BLOCK_TYPES.at(-1)).toBe("contact_form");
  });

  it("Insert: a Contact us form in the site's language, the caret in its heading", () => {
    const { session, get, formId } = setup();
    expect(get(formId)).toMatchObject({
      type: "contact_form",
      form_kind: "contact",
      heading: { content: "Napište nám" },
      button: { content: "Odeslat" },
      recipient: "",
    });
    expect(session.selection).toMatchObject({ path: [...contactBlocks, 0, "heading"] });
    expect(validateSite(session.doc).problems.filter((p) => p.severity === "error")).toEqual([]);
  });

  it("Insert a callback form: the default heading and button follow the kind, in one step", () => {
    const { session, get, formId } = setup();
    setFormKind(session, formId, "callback");
    expect(get(formId)).toMatchObject({
      form_kind: "callback",
      heading: { content: "Zavoláme vám" },
    });
    expect(get(formId).button.content).not.toBe("Odeslat");
    session.undo();
    expect(get(formId)).toMatchObject({
      form_kind: "contact",
      heading: { content: "Napište nám" },
    });
  });

  it("keeps a heading the owner wrote when the kind changes", () => {
    const { session, get, formId } = setup();
    session.apply(session.tr.set([formId, "heading"], text("Konzultace zdarma")));
    setFormKind(session, formId, "callback");
    expect(get(formId).heading.content).toBe("Konzultace zdarma");
  });

  it("sets the button, keeping the last label for an empty one", () => {
    const { session, get, formId } = setup();
    expect(setFormButton(session, formId, " Chci zavolat ")).toBe("Chci zavolat");
    expect(setFormButton(session, formId, "  ")).toBe("Chci zavolat");
    expect(get(formId).button.content).toBe("Chci zavolat");
  });

  it("A campaign address: stored lowercased; one that isn't an email is refused", () => {
    const { session, get, formId } = setup();
    expect(setFormRecipient(session, formId, " Kampan@Pekarna-Ulipy.cz ")).toEqual({
      ok: true,
      value: "kampan@pekarna-ulipy.cz",
    });
    expect(setFormRecipient(session, formId, "kampan")).toEqual({ ok: false });
    expect(get(formId).recipient).toBe("kampan@pekarna-ulipy.cz");
    expect(setFormRecipient(session, formId, "")).toEqual({ ok: true, value: "" });
    expect(get(formId).recipient).toBe("");
  });
});
