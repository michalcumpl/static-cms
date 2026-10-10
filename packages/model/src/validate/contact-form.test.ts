import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// Contact forms (contact-form, site-document delta "Contact form").

const text = (content: string) => ({ content, marks: [], annotations: [] });

/** The demo site with a callback form "Zavoláme vám" on "Kontakt". */
function site(form: Record<string, unknown> = {}) {
  const { doc, nodes } = editableDemoSite();
  nodes.contact_form_1 = {
    id: "contact_form_1",
    type: "contact_form",
    hidden: false,
    form_kind: "callback",
    heading: text("Zavoláme vám"),
    text: text("Nechte nám číslo, ozveme se."),
    button: text("Chci zavolat"),
    recipient: "kampan@pekarna-ulipy.cz",
    ...form,
  };
  nodes.page_contact.blocks.nodes.push("contact_form_1");
  return { doc, nodes };
}

const problemsOf = (doc: unknown) =>
  validateSite(doc).problems.filter((p) => p.nodeId === "contact_form_1");

describe("contact forms", () => {
  it("A callback form for a campaign: valid with no problems", () => {
    expect(problemsOf(site().doc)).toEqual([]);
    expect(validateSite(site().doc).valid).toBe(true);
  });

  it("Nowhere to send: a warning when neither the form nor the business has an email", () => {
    const { doc, nodes } = site({ recipient: "" });
    for (const node of Object.values(nodes)) if (node.type === "location") node.email = "";
    const problems = problemsOf(doc);
    expect(problems).toEqual([
      expect.objectContaining({ severity: "warning", code: "no-recipient", property: "recipient" }),
    ]);
    expect(problems[0]?.message).toContain('"Kontakt"');
    expect(validateSite(doc).valid).toBe(true);
    // With the business's email it is fine.
    const withEmail = site({ recipient: "" });
    for (const node of Object.values(withEmail.nodes)) {
      if (node.type === "location") node.email = "info@pekarna-ulipy.cz";
    }
    expect(problemsOf(withEmail.doc)).toEqual([]);
  });

  it("Not an email: an error", () => {
    expect(problemsOf(site({ recipient: "kampan" }).doc)).toEqual([
      expect.objectContaining({ severity: "error", code: "invalid-email" }),
    ]);
  });

  it("needs a heading and a button label, and a known kind", () => {
    expect(
      problemsOf(site({ heading: text(""), button: text(" ") }).doc).map((p) => p.code),
    ).toEqual(["empty-heading", "empty-label"]);
    expect(validateSite(site({ form_kind: "survey" }).doc).valid).toBe(false);
  });
});
