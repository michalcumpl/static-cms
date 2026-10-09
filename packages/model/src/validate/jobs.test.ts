import { describe, expect, it } from "vitest";
import { editableDemoSite } from "../testing.js";
import { validateSite } from "./index.js";

// Job openings (jobs, site-document delta).

const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[] = []) => ({ nodes, marks: [], annotations: [] });

/** The demo site with a jobs block "Volné pozice" on "Kontakt": two full job ads. */
function site(count = 2) {
  const { doc, nodes } = editableDemoSite();
  if (count > 0) {
    nodes.job_p1 = { id: "job_p1", type: "paragraph", content: text("Výroba konstrukcí.") };
    nodes.job_h1 = { id: "job_h1", type: "subheading", level: 2, content: text("Co vás čeká") };
  }
  const ids = Array.from({ length: count }, (_, i) => {
    const id = `job_${i + 1}`;
    nodes[id] = {
      id,
      type: "job",
      title: text(i === 0 ? "Zámečník/svářeč" : `Pozice ${i + 1}`),
      summary: text(i === 0 ? "Do zakázkové výroby." : ""),
      body: list(i === 0 ? ["job_h1", "job_p1"] : []),
      contact_name: text(i === 0 ? "Matěj Palouš" : ""),
      contact_email: i === 1 ? "pavel.boruvka@scenografie.cz" : "",
      contact_phone: i === 0 ? "+420777294579" : "",
    };
    return id;
  });
  nodes.jobs_1 = {
    id: "jobs_1",
    type: "jobs",
    hidden: false,
    heading: text("Volné pozice"),
    empty_note: text(""),
    items: list(ids),
  };
  nodes.page_contact.blocks.nodes.push("jobs_1");
  return { doc, nodes };
}

const problems = (doc: unknown) =>
  validateSite(doc).problems.map((p) => ({
    code: p.code,
    severity: p.severity,
    message: p.message,
  }));

describe("jobs", () => {
  it("Two job ads", () => {
    expect(problems(site().doc)).toEqual([]);
  });

  it("Job without a title", () => {
    const { doc, nodes } = site();
    nodes.job_2.title = text(" ");
    expect(problems(doc)).toEqual([
      { code: "empty-title", severity: "error", message: 'Job 2 on "Kontakt" needs a title.' },
    ]);
  });

  it("Not an email, nor a phone", () => {
    const { doc, nodes } = site();
    nodes.job_2.contact_email = "pavel.boruvka";
    nodes.job_1.contact_phone = "777 294 579";
    expect(
      problems(doc)
        .map((p) => p.code)
        .sort(),
    ).toEqual(["invalid-email", "invalid-phone"]);
  });

  it("No openings", () => {
    const { doc, nodes } = site(0);
    nodes.jobs_1.empty_note = text("Momentálně nikoho nehledáme.");
    expect(problems(doc)).toEqual([]);
    nodes.jobs_1.empty_note = text("");
    expect(problems(doc)).toEqual([
      expect.objectContaining({ code: "no-jobs", severity: "warning" }),
    ]);
    expect(validateSite(doc).valid).toBe(true);
  });

  it("reports thirteen jobs and an empty subheading", () => {
    expect(problems(site(13).doc)).toEqual([expect.objectContaining({ code: "too-many-items" })]);
    const { doc, nodes } = site();
    nodes.job_h1.content = text("");
    expect(problems(doc)).toEqual([expect.objectContaining({ code: "empty-heading" })]);
  });
});
