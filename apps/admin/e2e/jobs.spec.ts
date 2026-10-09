import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  addBlockAfterCaret,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  paths,
  state,
  test,
  testDb,
} from "./fixtures";

// Job openings in the editor and on the page (jobs).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const jobPanel = (page: Page) => page.getByRole("region", { name: "Job", exact: true });
const jobs = (page: Page) => canvas(page).locator("section.jobs .job");
const handle = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const actions = (page: Page) => page.getByRole("menu", { name: / actions$/ });

/** The demo site's "Kontakt" with a jobs block of `count` jobs and a note. */
function storeJobs(count: number): void {
  const doc = demoSite() as Doc;
  const { nodes } = doc;
  const ids = Array.from({ length: count }, (_, i) => {
    const id = `job_${i + 1}`;
    nodes[id] = {
      id,
      type: "job",
      title: text(`Pozice ${i + 1}`),
      summary: text(""),
      body: list([]),
      contact_name: text(""),
      contact_email: "",
      contact_phone: "",
    };
    return id;
  });
  nodes.jobs_1 = {
    id: "jobs_1",
    type: "jobs",
    hidden: false,
    heading: text("Volné pozice"),
    empty_note: text("Momentálně nikoho nehledáme."),
    items: list(ids),
  };
  nodes.page_contact.blocks.nodes.push("jobs_1");
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  if (!saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "").ok) {
    throw new Error("could not store the site");
  }
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("Insert jobs", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Jobs");
  await expect(canvas(page).locator("section.jobs h2")).toHaveText("Volné pozice");
  await expect(jobs(page)).toHaveCount(1);
  // The caret is in the new job's title.
  await page.keyboard.type("Zámečník/svářeč");
  await expect(jobs(page).first().locator(".job-title")).toHaveText("Zámečník/svářeč");
});

test("Add a job ad", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Jobs");
  await page.keyboard.type("Projektant/konstruktér");
  await caretAtEnd(page, jobs(page).first().locator(".job-summary"));
  await page.keyboard.type("Konstrukce nábytku a interiérů.");
  await caretAtEnd(page, jobs(page).first().locator(".job-details p").first());
  await page.keyboard.type("Hledáme konstruktéra/ku.");
  const email = jobPanel(page).getByLabel("Email");
  await email.fill("pavel.boruvka");
  await email.press("Enter");
  await expect(jobPanel(page).getByRole("alert")).toHaveText(
    "Enter an email address, like jana@example.com.",
  );
  await email.fill("pavel.boruvka@scenografie.cz");
  await email.press("Enter");
  await expect(jobPanel(page).getByRole("alert")).toHaveCount(0);
  await expect(jobs(page).first().locator(".job-contact")).toHaveText(
    "Contact: pavel.boruvka@scenografie.cz",
  );
  await save(page);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toContain('<p class="job-summary">Konstrukce nábytku a interiérů.</p>');
  expect(contact).toMatch(/<summary>Celý popis<\/summary>\s*<p>Hledáme konstruktéra\/ku\.<\/p>/);
  expect(contact).toContain(
    '<a href="mailto:pavel.boruvka@scenografie.cz">pavel.boruvka@scenografie.cz</a>',
  );
});

test("Thirteenth job", async ({ page }) => {
  storeJobs(12);
  await openEditor(page, paths().edit("page_contact"));
  await jobs(page).first().locator(".job-title").click();
  await handle(page, "Job 1").click();
  const duplicate = actions(page).getByRole("menuitem", { name: "Duplicate" });
  await expect(duplicate).toHaveAttribute("aria-disabled", "true");
  await expect(duplicate).toContainText("A jobs block holds at most twelve jobs");
});

test("Last job removed", async ({ page }) => {
  storeJobs(1);
  await openEditor(page, paths().edit("page_contact"));
  // With a job, the note waits under it.
  await expect(canvas(page).getByText("Shown when there are no openings:")).toBeVisible();
  await jobs(page).first().locator(".job-title").click();
  await handle(page, "Job 1").click();
  await actions(page).getByRole("menuitem", { name: "Delete" }).click();
  await expect(jobs(page)).toHaveCount(0);
  await expect(canvas(page).locator("section.jobs .jobs-note")).toHaveText(
    "Momentálně nikoho nehledáme.",
  );
  await expect(canvas(page).getByText("Shown when there are no openings:")).toHaveCount(0);
  await save(page);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toContain('<p class="jobs-note">Momentálně nikoho nehledáme.</p>');
  expect(contact).not.toContain("job-list");
});
