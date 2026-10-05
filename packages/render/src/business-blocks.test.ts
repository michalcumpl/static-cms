import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });

/** The demo site with a filled-in business, open Monday 6–17, and both blocks on "Kontakt". */
function businessSite() {
  const { doc, nodes } = editableDemoSite();
  Object.assign(nodes.location_1, {
    street: "Lipová 12",
    postal_code: "280 02",
    city: "Kolín",
    phone: "+420321123456",
    email: "objednavky@pekarna-ulipy.example",
    hours_note: "Ve svátky zavřeno",
  });
  nodes.range_mon = { id: "range_mon", type: "time_range", opens: "06:00", closes: "17:00" };
  nodes.day_mon.ranges = { nodes: ["range_mon"], marks: [], annotations: [] };
  addBlocks(nodes);
  return { doc, nodes };
}

function addBlocks(nodes: LooseNodes) {
  nodes.contact_1 = {
    id: "contact_1",
    type: "contact",
    heading: text("Kde nás najdete"),
    show_address: true,
    show_phone: true,
    show_email: true,
    show_map: true,
    location_id: "",
  };
  nodes.hours_1 = {
    id: "hours_1",
    type: "opening_hours",
    heading: text("Otevírací doba"),
    location_id: "",
  };
  nodes.page_contact.blocks.nodes.push("contact_1", "hours_1");
}

function render(doc: unknown) {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const page = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return {
    home: page("index.html"),
    contact: page("kontakt/index.html"),
    notFound: result.site.notFound,
  };
}

const footerOf = (html: string) => html.slice(html.indexOf('<footer class="site-footer">'));

describe("contact block", () => {
  it("shows the heading and the business's contact details", () => {
    const { contact } = render(businessSite().doc);
    const section = contact.slice(contact.indexOf('<section class="block contact">'));
    expect(section).toContain("<h2>Kde nás najdete</h2>");
    expect(section).toContain("<p>Lipová 12<br>280 02 Kolín</p>");
    expect(section).toContain('<a href="tel:+420321123456">+420\u00a0321\u00a0123\u00a0456</a>');
    expect(section).toContain("Zobrazit na mapě");
  });

  it("hides the phone when its switch is off", () => {
    const { doc, nodes } = businessSite();
    nodes.contact_1.show_phone = false;
    const { contact } = render(doc);
    const start = contact.indexOf('<section class="block contact">');
    const section = contact.slice(start, contact.indexOf("</section>", start));
    expect(section).not.toContain("tel:");
    expect(section).toContain("mailto:");
  });

  it("renders only its heading while there is nothing to show", () => {
    const { doc, nodes } = editableDemoSite();
    addBlocks(nodes);
    const { contact } = render(doc);
    expect(contact).toMatch(
      /<section class="block contact">\s*<div class="container">\s*<h2>Kde nás najdete<\/h2>\s*<\/div>/,
    );
  });
});

describe("opening hours block", () => {
  it("shows the table and the note", () => {
    const { contact } = render(businessSite().doc);
    const section = contact.slice(contact.indexOf('<section class="block opening-hours">'));
    expect(section).toContain("<h2>Otevírací doba</h2>");
    expect(section).toContain('<tr><th scope="row">Po</th><td>6:00–17:00</td></tr>');
    expect(section).toContain('<tr><th scope="row">Út–Ne</th><td>zavřeno</td></tr>');
    expect(section).toContain('<p class="hours-note">Ve svátky zavřeno</p>');
  });
});

describe("footer", () => {
  it("shows the contact details and hours on every page, the not-found page included", () => {
    const { home, contact, notFound } = render(businessSite().doc);
    for (const html of [home, contact, notFound]) {
      const footer = footerOf(html);
      expect(footer).toContain('<address class="contact-details">');
      expect(footer).toContain('<a href="tel:+420321123456">');
      expect(footer).toContain('<table class="hours">');
      expect(footer.indexOf("</table>")).toBeLessThan(footer.indexOf("<p>© Pekárna U Lípy</p>"));
    }
  });

  it("names the business when it differs from the site", () => {
    const { doc, nodes } = businessSite();
    nodes.business_1.name = "Pekárna U Lípy s.r.o.";
    expect(footerOf(render(doc).home)).toContain(
      '<p class="business-name">Pekárna U Lípy s.r.o.</p>',
    );
    nodes.business_1.name = "Pekárna U Lípy";
    expect(footerOf(render(doc).home)).not.toContain("business-name");
  });

  it("stays plain when the switch is off", () => {
    const { doc, nodes } = businessSite();
    nodes.business_1.show_in_footer = false;
    expect(footerOf(render(doc).home)).not.toContain("footer-business");
  });

  it("stays plain when nothing is filled in", () => {
    const { doc } = editableDemoSite();
    const { home, notFound } = render(doc);
    for (const html of [home, notFound]) expect(footerOf(html)).not.toContain("footer-business");
  });
});

describe("a page with both blocks and the footer", () => {
  it("passes html-validate", async () => {
    const { contact, notFound } = render(businessSite().doc);
    const validator = new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    });
    for (const html of [contact, notFound]) {
      const report = await validator.validateString(html);
      const messages = report.results.flatMap((r) =>
        r.messages.map((m) => `${m.line}:${m.column} ${m.ruleId}: ${m.message}`),
      );
      expect(messages).toEqual([]);
    }
  });
});
