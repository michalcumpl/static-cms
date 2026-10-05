import { editableDemoSite, type LooseNodes } from "@webmio/model/testing";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

/**
 * The demo site with a services block on "Kontakt" showing all services, the home page's block
 * showing `chosen`, and an FAQ block on "Kontakt" with one question.
 */
function site(chosen: string[] = ["service_bread"]): { doc: unknown; nodes: LooseNodes } {
  const { doc, nodes } = editableDemoSite();
  nodes.services_1.show = "chosen";
  nodes.services_1.chosen = list(
    chosen.map((item_id, i) => {
      const id = `ref_${i + 1}`;
      nodes[id] = { id, type: "item_ref", item_id };
      return id;
    }),
  );
  nodes.services_all = {
    id: "services_all",
    type: "services",
    heading: text("Všechno, co pečeme"),
    show: "all",
    chosen: list([]),
  };
  nodes.faq_delivery = {
    id: "faq_delivery",
    type: "faq_item",
    question: text("Rozvážíte?"),
    answer: text("Ano, po Kolíně zdarma."),
  };
  nodes.site_1.faqs = list(["faq_delivery"]);
  nodes.faq_1 = {
    id: "faq_1",
    type: "faq",
    heading: text("Časté dotazy"),
    show: "all",
    chosen: list([]),
  };
  nodes.page_contact.blocks.nodes.push("services_all", "faq_1");
  return { doc, nodes };
}

function pages(doc: unknown): { home: string; contact: string } {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  const html = (path: string) => result.site.pages.find((p) => p.path === path)?.html ?? "";
  return { home: html("index.html"), contact: html("kontakt/index.html") };
}

const section = (html: string, cls: string) => {
  const start = html.indexOf(`<section class="block ${cls}">`);
  return start < 0 ? "" : html.slice(start, html.indexOf("</section>", start));
};
const serviceNames = (html: string) =>
  [...html.matchAll(/<p class="service-name">([^<]*)<\/p>/g)].map((m) => m[1]);

describe("collection blocks", () => {
  it("One service on two pages", () => {
    const { doc, nodes } = site();
    nodes.service_bread.price = text("45 Kč");
    const { home, contact } = pages(doc);
    expect(section(home, "services")).toContain('<p class="service-price">45 Kč</p>');
    expect(section(contact, "services")).toContain('<p class="service-price">45 Kč</p>');
  });

  it("Chosen order", () => {
    const { home, contact } = pages(site(["service_cakes", "service_bread"]).doc);
    expect(serviceNames(section(home, "services"))).toEqual([
      "Dorty na objednávku",
      "Kváskový chléb",
    ]);
    expect(serviceNames(section(contact, "services"))).toEqual([
      "Kváskový chléb",
      "Rohlíky a housky",
      "Dorty na objednávku",
    ]);
  });

  it("Question and answer", () => {
    const faq = section(pages(site().doc).contact, "faq");
    expect(faq).toContain("<h2>Časté dotazy</h2>");
    expect(faq.replace(/\s+</g, "<")).toContain(
      "<details><summary>Rozvážíte?</summary><p>Ano, po Kolíně zdarma.</p></details>",
    );
  });

  it("Nothing to show", () => {
    const { doc, nodes } = site();
    nodes.site_1.faqs = list([]);
    delete nodes.faq_delivery;
    const { contact } = pages(doc);
    expect(contact).not.toContain('class="block faq"');
    expect(section(contact, "services")).not.toBe("");
  });

  it("matches the snapshot of a page with collection blocks, and passes html-validate", async () => {
    const { contact } = pages(site().doc);
    await expect(contact).toMatchFileSnapshot("__snapshots__/collections/kontakt/index.html");
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(contact);
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});

describe("social links in the footer", () => {
  function withProfiles(showInFooter: boolean) {
    const { doc, nodes } = editableDemoSite();
    nodes.social_ig = {
      id: "social_ig",
      type: "social_link",
      url: "https://www.instagram.com/pekarnaulipy",
    };
    nodes.social_fb = { id: "social_fb", type: "social_link", url: "https://facebook.com/pekarna" };
    nodes.business_1.social = list(["social_ig", "social_fb"]);
    nodes.business_1.show_in_footer = showInFooter;
    return doc;
  }

  it("Two profiles", () => {
    const { home, contact } = pages(withProfiles(true));
    expect(home).toContain('<nav class="site-nav" aria-label="Hlavní nabídka">');
    for (const html of [home, contact]) {
      const footer = html.slice(html.indexOf("<footer"));
      expect(footer.replace(/\s+</g, "<")).toContain(
        '<nav class="footer-social" aria-label="Sociální sítě"><ul><li><a href="https://www.instagram.com/pekarnaulipy">Instagram</a></li><li><a href="https://facebook.com/pekarna">Facebook</a></li></ul></nav>',
      );
    }
  });

  it("passes html-validate with the links", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(pages(withProfiles(true)).home);
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });

  it("Switch off", () => {
    const { home } = pages(withProfiles(false));
    expect(home).not.toContain("footer-social");
  });

  it("shows the links on the not-found page too", () => {
    const result = renderSite(withProfiles(true));
    if (!result.ok) throw new Error("not rendered");
    expect(result.site.notFound).toContain("footer-social");
  });
});
