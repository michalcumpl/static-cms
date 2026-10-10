import { siteStrings } from "@webmio/render";
import type { Session } from "svedit";
import { text } from "./transforms";

// A contact form's settings, set in the Contact form panel (contact-form spec, "Contact form in
// the editor"). Each change is one undoable step.

export type ContactFormKind = "contact" | "callback";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormNode = {
  form_kind: ContactFormKind;
  heading: { content: string };
  button: { content: string };
  recipient: string;
};

const stringsOf = (session: Session) =>
  siteStrings((session.doc.nodes[session.doc.document_id] as { lang?: string })?.lang ?? "");

/**
 * Switches a form between Contact us and Let us call you back. A heading or button still the
 * other kind's default follows the new kind; one the owner wrote stays.
 */
export function setFormKind(session: Session, formId: string, kind: ContactFormKind): void {
  const form = session.get(formId) as FormNode | undefined;
  if (!form || form.form_kind === kind) return;
  const { form: strings } = stringsOf(session);
  const defaults = {
    contact: { heading: strings.contactHeading, button: strings.contactButton },
    callback: { heading: strings.callbackHeading, button: strings.callbackButton },
  };
  const tr = session.tr;
  tr.set([formId, "form_kind"], kind);
  for (const part of ["heading", "button"] as const) {
    if (form[part].content === defaults[form.form_kind][part]) {
      tr.set([formId, part], text(defaults[kind][part]));
    }
  }
  session.apply(tr);
}

/** Sets the button's label; an empty one isn't stored and the last label stays. */
export function setFormButton(session: Session, formId: string, input: string): string {
  const form = session.get(formId) as FormNode | undefined;
  const label = input.trim();
  if (!form || label === "") return form?.button.content ?? "";
  if (form.button.content !== label) {
    session.apply(session.tr.set([formId, "button"], text(label)));
  }
  return label;
}

export type RecipientResult = { ok: true; value: string } | { ok: false };

/**
 * Sets where the form's messages go: empty for the business email, else an address, lowercased.
 * An address that isn't an email is refused and the last one stays.
 */
export function setFormRecipient(session: Session, formId: string, input: string): RecipientResult {
  const value = input.trim().toLowerCase();
  if (value !== "" && !EMAIL.test(value)) return { ok: false };
  const form = session.get(formId) as FormNode | undefined;
  if (form && form.recipient !== value) {
    session.apply(session.tr.set([formId, "recipient"], value));
  }
  return { ok: true, value };
}
