import { blocks, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { BASE_CSS } from "./css.js";
import { renderSite } from "./index.js";

// Contact forms (contact-form, site-rendering delta "Contact form").

type Form = Parameters<typeof blocks.contactForm>[0];
const ENDPOINT = "https://app.webmio.eu/forms/p_bakery";

/** The bakery's contact page with a form. */
function site(form: Form): SiteDocument {
  const s = siteBuilder({ name: "Pekárna U Lípy", lang: "cs", description: "Pekárna." });
  s.location({ city: "Kutná Hora", email: "info@pekarna-ulipy.cz", phone: "+420321123456" });
  s.page({ title: "Úvod", slug: "uvod" }, [blocks.text("Vítejte.")]);
  s.page({ title: "Kontakt", slug: "kontakt" }, [blocks.contactForm(form)]);
  return s.build();
}

function contactPage(doc: SiteDocument, withEndpoint = true): string {
  const result = renderSite(doc, withEndpoint ? { formEndpoint: ENDPOINT } : {});
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages[1]?.html ?? "";
}

const tight = (html: string) => html.replace(/>\s+</g, "><");
const formId = (html: string) => /<section class="block contact-form" id="([^"]+)"/.exec(html)?.[1];

describe("contact forms", () => {
  it("A Contact us form: posts to the endpoint, with labelled fields and the hidden ones", () => {
    const html = tight(
      contactPage(
        site({ heading: "Napište nám", text: "Odpovíme do druhého dne.", button: "Odeslat" }),
      ),
    );
    const id = formId(html) ?? "";
    const block = id.replace(/^form-/, "");
    expect(html).toContain(`<form method="post" action="${ENDPOINT}/${block}">`);
    expect(html).toContain('<input type="hidden" name="_page" value="/kontakt/">');
    for (const [name, label] of [
      ["name", "Jméno"],
      ["email", "E-mail"],
      ["phone", "Telefon"],
      ["message", "Zpráva"],
    ]) {
      expect(html).toContain(`<label for="${id}-${name}">${label}</label>`);
    }
    expect(html).toContain('name="message" rows="5" maxlength="3000" required');
    expect(html).toContain("Vyplňte e-mail nebo telefon, abychom vám mohli odpovědět.");
    expect(html).toContain("Vaše údaje použijeme jen k odpovědi na tuto zprávu.");
    expect(html).toContain('<div class="form-trap" aria-hidden="true">');
    expect(html).toContain('tabindex="-1" autocomplete="off"');
    expect(html).toContain('<button type="submit" class="button">Odeslat</button>');
    expect(html).toContain('<p class="form-text">Odpovíme do druhého dne.</p>');
  });

  it("asks for a name, a phone and when to call for a callback", () => {
    const html = tight(
      contactPage(site({ kind: "callback", heading: "Zavoláme vám", button: "Zavolejte mi" })),
    );
    const id = formId(html) ?? "";
    expect(html).toContain(`id="${id}-phone" name="phone" type="tel" autocomplete="tel" required`);
    expect(html).toContain(`<select id="${id}-when" name="when">`);
    expect(html).toContain('<option value="morning">Dopoledne</option>');
    expect(html).not.toContain(`id="${id}-email"`);
  });

  it("After sending: a status message the address's target shows in place of the fields", () => {
    const html = tight(contactPage(site({ heading: "Napište nám", button: "Odeslat" })));
    const id = formId(html) ?? "";
    expect(html).toContain(
      `<p class="form-sent" id="${id}-sent" role="status">Děkujeme, ozveme se vám.</p>`,
    );
    expect(html).toContain(`<p class="form-error" id="${id}-error-contact" role="alert">`);
    expect(BASE_CSS).toContain(".form-sent:target");
    expect(BASE_CSS).toContain(".contact-form:has(.form-sent:target) form");
  });

  it("No endpoint: the heading, the text and the business's email and phone", () => {
    const html = tight(contactPage(site({ heading: "Napište nám", button: "Odeslat" }), false));
    expect(html).not.toContain("<form");
    expect(html).toContain('<a href="mailto:info@pekarna-ulipy.cz">info@pekarna-ulipy.cz</a>');
    expect(html).toContain('href="tel:+420321123456"');
  });

  it("passes html-validate for both kinds", async () => {
    for (const kind of ["contact", "callback"] as const) {
      const report = await new HtmlValidate({
        extends: ["html-validate:recommended"],
        rules: { "doctype-style": "off" },
      }).validateString(contactPage(site({ kind, heading: "Napište nám", button: "Odeslat" })));
      expect(
        report.results.flatMap((r) => r.messages.map((m) => m.message)),
        kind,
      ).toEqual([]);
    }
  });
});
