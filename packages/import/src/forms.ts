import type { Cheerio, CheerioAPI } from "cheerio";
import type { Element } from "domhandler";
import { collapse } from "./content.js";

// Contact forms (contact-form spec, site-import "Page content"): a form asking for a way to
// answer and a message, or for a phone to call back, becomes a contact form block; sign-ups,
// searches, orders and logins stay left out.

export interface ContactFormRead {
  formKind: "contact" | "callback";
  /** The submit button's words, or `""`. */
  button: string;
}

/** The inputs a visitor fills in; hidden fields, buttons and ticks aren't asked questions. */
const NOT_ASKED = new Set(["hidden", "submit", "button", "reset", "image", "checkbox", "radio"]);

/** What a field asks for, from its type, name, placeholder and label, in lowercase. */
function fieldWords($: CheerioAPI, field: Cheerio<Element>): string {
  const id = field.attr("id");
  const label = id ? $(`label[for="${id.replace(/"/g, '\\"')}"]`).text() : "";
  return [
    field.attr("type"),
    field.attr("name"),
    id,
    field.attr("autocomplete"),
    field.attr("placeholder"),
    field.attr("aria-label"),
    field.closest("label").text(),
    label,
  ]
    .join(" ")
    .toLowerCase();
}

/** A form as a contact form, or undefined for a form of another kind. */
export function readContactForm(
  $: CheerioAPI,
  form: Cheerio<Element>,
): ContactFormRead | undefined {
  if ((form.attr("role") ?? "").toLowerCase() === "search") return undefined;
  let name = false;
  let email = false;
  let phone = false;
  let message = false;
  for (const node of form.find("input, textarea, select").toArray()) {
    const field = $(node);
    const type = (field.attr("type") ?? "text").toLowerCase();
    if (node.tagName === "input" && NOT_ASKED.has(type)) continue;
    const words = fieldWords($, field);
    if (
      type === "password" ||
      type === "search" ||
      /\b(search|hledat|query|login|user)/.test(words)
    ) {
      return undefined;
    }
    if (
      node.tagName === "textarea" ||
      /message|zpráv|zprav|dotaz|vzkaz|comment|poznám/.test(words)
    ) {
      message = true;
    } else if (type === "email" || /e-?mail/.test(words)) {
      email = true;
    } else if (type === "tel" || /phone|telefon|\btel\b|mobil/.test(words)) {
      phone = true;
    } else if (/name|jméno|jmeno|příjmení|prijmeni/.test(words)) {
      name = true;
    }
  }
  const submit = form
    .find('button:not([type]), button[type="submit"], input[type="submit"]')
    .first();
  const button = collapse(submit.is("input") ? (submit.attr("value") ?? "") : submit.text());
  if (message && (email || phone)) return { formKind: "contact", button };
  if (!message && !email && phone && name) return { formKind: "callback", button };
  return undefined;
}
