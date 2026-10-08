import { blocks, type SiteDocument, siteBuilder } from "@webmio/model";
import { HtmlValidate } from "html-validate";
import { describe, expect, it } from "vitest";
import { renderSite } from "./index.js";

// Job openings (jobs, site-rendering delta).

type Jobs = Parameters<typeof blocks.jobs>[0];

/** Scénografie's contact page with a jobs block. */
function site(jobs: Jobs): SiteDocument {
  const s = siteBuilder({ name: "Scénografie", lang: "cs", description: "Scénografie." });
  s.location({ street: "Černokostelecká 90", city: "Praha" });
  s.page({ title: "Kontakty", slug: "kontakty" }, [blocks.jobs(jobs)]);
  return s.build();
}

function page(doc: SiteDocument): string {
  const result = renderSite(doc);
  if (!result.ok) throw new Error(result.problems.map((p) => p.message).join("\n"));
  return result.site.pages[0]?.html ?? "";
}

/** The markup with its whitespace between tags removed. */
const tight = (html: string) => html.replace(/>\s+</g, "><");

const welder: Jobs["items"][number] = {
  title: "Zámečník/svářeč",
  summary: "Do zakázkové výroby hledáme šikovného kolegu.",
  body: "## Co vás čeká\n\nVýroba a instalace jeklových konstrukcí.\n\n- svařování CO2\n- ohýbání jeklů",
  contact: { name: "Matěj Palouš", phone: "+420777294579" },
};

describe("jobs", () => {
  it("A full job ad", () => {
    const html = tight(page(site({ heading: "Volné pozice", items: [welder] })));
    expect(html).toContain(
      '<section class="block jobs"><div class="container"><h2>Volné pozice</h2><ul class="job-list"><li class="job">' +
        '<h3 class="job-title">Zámečník/svářeč</h3>' +
        '<p class="job-summary">Do zakázkové výroby hledáme šikovného kolegu.</p>' +
        '<details class="job-details"><summary>Celý popis</summary><h4>Co vás čeká</h4>' +
        "<p>Výroba a instalace jeklových konstrukcí.</p><ul><li>svařování CO2</li><li>ohýbání jeklů</li></ul></details>" +
        '<p class="job-contact">Kontakt: Matěj Palouš, <a href="tel:+420777294579">+420\u00a0777\u00a0294\u00a0579</a></p>' +
        "</li></ul>",
    );
    expect(html).not.toContain('<details class="job-details" open');
  });

  it("joins the contact's parts, the email a link", () => {
    const html = tight(
      page(
        site({
          items: [{ title: "Projektant", contact: { email: "pavel.boruvka@scenografie.cz" } }],
        }),
      ),
    );
    // Without the block's heading, a job's title is the page's second level.
    expect(html).toContain('<h2 class="job-title">Projektant</h2>');
    expect(html).toContain(
      '<p class="job-contact">Kontakt: <a href="mailto:pavel.boruvka@scenografie.cz">pavel.boruvka@scenografie.cz</a></p>',
    );
  });

  it("Titles only", () => {
    const html = tight(
      page(
        site({
          heading: "Kariéra",
          items: [{ title: "Advokátní koncipient/ka" }, { title: "Advokát/ka" }],
        }),
      ),
    );
    expect(html).toContain(
      '<ul class="job-list"><li class="job"><h3 class="job-title">Advokátní koncipient/ka</h3></li>' +
        '<li class="job"><h3 class="job-title">Advokát/ka</h3></li></ul>',
    );
    expect(html).not.toContain("<details");
  });

  it("doesn't fold a description of blank paragraphs, as a new job has", () => {
    const doc = site({ items: [{ title: "Projektant" }] });
    const job = Object.values(doc.nodes).find((n) => n.type === "job");
    if (job?.type !== "job") throw new Error("no job");
    doc.nodes.p_blank = {
      id: "p_blank",
      type: "paragraph",
      content: { content: "", marks: [], annotations: [] },
    };
    job.body.nodes = ["p_blank"];
    expect(page(doc)).not.toContain("<details");
  });

  it("No openings", () => {
    const html = tight(
      page(site({ heading: "Volné pozice", note: "Momentálně nikoho nehledáme.", items: [] })),
    );
    expect(html).toContain(
      '<h2>Volné pozice</h2><p class="jobs-note">Momentálně nikoho nehledáme.</p></div></section>',
    );
    expect(html).not.toContain("job-list");
  });

  it("leaves out a block with neither jobs nor a note", () => {
    expect(page(site({ heading: "Volné pozice", items: [] }))).not.toContain("Volné pozice");
  });

  it("passes html-validate", async () => {
    const report = await new HtmlValidate({
      extends: ["html-validate:recommended"],
      rules: { "doctype-style": "off" },
    }).validateString(
      page(site({ heading: "Volné pozice", items: [welder, { title: "Projektant" }] })),
    );
    expect(report.results.flatMap((r) => r.messages.map((m) => m.message))).toEqual([]);
  });
});
