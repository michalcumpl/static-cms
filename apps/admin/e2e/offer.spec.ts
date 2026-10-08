import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
import {
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  openLists,
  paths,
  saveSettings,
  selectText,
  state,
  test,
  testDb,
} from "./fixtures";

// The What you offer section (offer-and-about): the services and the questions as list forms.

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const text = (content: string) => ({ content, marks: [], annotations: [] });

const item = (page: Page, name: string | RegExp) => page.getByRole("group", { name });
const services = (page: Page) => page.getByRole("region", { name: "Services" });
const questions = (page: Page) => page.getByRole("region", { name: "Questions" });
const serviceTitles = (page: Page) => services(page).locator(".item-title").allTextContents();

/** The home page's services block chose "Rohlíky a housky" and "Kváskový chléb"; "Kontakt" shows all. */
function storeHighlights(): void {
  const doc = demoSite() as Doc;
  doc.nodes.ref_rolls = { id: "ref_rolls", type: "item_ref", item_id: "service_rolls" };
  doc.nodes.ref_bread = { id: "ref_bread", type: "item_ref", item_id: "service_bread" };
  doc.nodes.services_1.show = "chosen";
  doc.nodes.services_1.chosen = list(["ref_rolls", "ref_bread"]);
  doc.nodes.services_all = {
    id: "services_all",
    type: "services",
    layout: "cards",
    heading: text("Všechny služby"),
    show: "all",
    chosen: list([]),
  };
  doc.nodes.page_contact.blocks.nodes.push("services_all");
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error("could not store the site");
}

test("type a service's name, undo it, and save another", async ({ page }) => {
  await openLists(page, "offer");
  const name = item(page, /^Service 1/).getByRole("textbox", { name: "Name" });
  await caretAtEnd(page, name);
  await page.keyboard.type(" XL");
  await expect(item(page, "Service 1: Kváskový chléb XL")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(item(page, "Service 1: Kváskový chléb")).toBeVisible();

  const price = item(page, /^Service 1/).getByRole("textbox", { name: "Price (optional)" });
  await caretAtEnd(page, price);
  for (let i = 0; i < 4; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("5 Kč");
  await saveSettings(page);
  await page.reload();
  await expect(
    item(page, /^Service 1/).getByRole("textbox", { name: "Price (optional)" }),
  ).toHaveText("85 Kč");

  await openEditor(page);
  await expect(canvas(page)).toContainText("85 Kč");
});

test("Move a service", async ({ page }) => {
  await openLists(page, "offer");
  const cakes = item(page, /^Service 3/);
  await expect(cakes.getByRole("button", { name: "Move down" })).toBeDisabled();
  await cakes.getByRole("button", { name: "Move up" }).click();
  expect(await serviceTitles(page)).toEqual([
    "Service 1: Kváskový chléb",
    "Service 2: Dorty na objednávku",
    "Service 3: Rohlíky a housky",
  ]);
  await saveSettings(page);
  await openEditor(page);
  await expect(canvas(page).locator("section.services .service-name")).toHaveText([
    "Kváskový chléb",
    "Dorty na objednávku",
    "Rohlíky a housky",
  ]);
});

test("Delete a highlighted service", async ({ page }) => {
  storeHighlights();
  await openLists(page, "offer");
  await item(page, /^Service 2/)
    .getByRole("button", { name: "Delete" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Delete Rohlíky a housky?" });
  await expect(dialog).toContainText("Shown on 2 pages.");
  await dialog.getByRole("button", { name: "Delete" }).click();
  expect(await serviceTitles(page)).toEqual([
    "Service 1: Kváskový chléb",
    "Service 2: Dorty na objednávku",
  ]);
  await saveSettings(page);
  await openEditor(page);
  await expect(canvas(page).locator("section.services .service-name")).toHaveText([
    "Kváskový chléb",
  ]);

  await openLists(page, "offer");
  await item(page, /^Service 2/)
    .getByRole("button", { name: "Delete" })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  expect(await serviceTitles(page)).toHaveLength(2);
});

test("an item no page shows is deleted at once, and Undo brings it back", async ({ page }) => {
  await openLists(page, "offer");
  await questions(page).getByRole("button", { name: "Add a question" }).click();
  await page.keyboard.type("Vozíte domů?");
  await item(page, /^Question 1/)
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(item(page, /^Question 1/)).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(item(page, "Question 1: Vozíte domů?")).toBeVisible();
});

test("First question", async ({ page }) => {
  await openLists(page, "offer");
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  await questions(page).getByRole("button", { name: "Add a question" }).click();
  await page.keyboard.type("Vozíte domů?");
  await expect(item(page, "Question 1: Vozíte domů?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
});

test("Services on two pages", async ({ page }) => {
  storeHighlights();
  await openLists(page, "offer");
  await expect(services(page)).toContainText("Shown on: Úvod, Kontakt");
  await expect(questions(page)).toContainText("No page shows this list yet.");
  await services(page).getByRole("link", { name: "Kontakt" }).click();
  await expect(page).toHaveURL(paths().edit("page_contact"));
});

test("a page link saves unsaved changes first", async ({ page }) => {
  await openLists(page, "offer");
  await questions(page).getByRole("button", { name: "Add a question" }).click();
  await page.keyboard.type("Vozíte domů?");
  page.once("dialog", (dialog) => void dialog.accept());
  await services(page).getByRole("link", { name: "Úvod" }).click();
  await expect(page).toHaveURL(paths().edit("page_home"));
  const site = readSite(testDb(), state().projectId) as { document: Doc } | undefined;
  const faqs = site?.document.nodes[site.document.document_id].faqs.nodes;
  expect(faqs).toHaveLength(1);
});

/** The stored primary document's node. */
function storedNode(id: string) {
  const site = readSite(testDb(), state().projectId) as { document: Doc } | undefined;
  return site?.document.nodes[id];
}

test("Bold in an answer", async ({ page }) => {
  await openLists(page, "offer");
  await questions(page).getByRole("button", { name: "Add a question" }).click();
  await page.keyboard.type("Vozíte domů?");
  const answer = item(page, /^Question 1/).getByRole("textbox", { name: "Answer" });
  await caretAtEnd(page, answer);
  await page.keyboard.type("Ano, po celém Kolíně.");
  await selectText(page, answer, "celém");
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(answer.locator("strong")).toHaveText("celém");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();
  const site = readSite(testDb(), state().projectId) as { document: Doc } | undefined;
  const faqId = site?.document.nodes[site.document.document_id].faqs.nodes[0];
  const stored = storedNode(faqId);
  expect(stored.answer.content).toBe("Ano, po celém Kolíně.");
  expect(stored.answer.marks).toHaveLength(1);
});

test("a link in a service's description", async ({ page }) => {
  await openLists(page, "offer");
  const description = item(page, /^Service 1/).getByRole("textbox", { name: "Description" });
  await selectText(page, description, "bochník");
  await page.getByRole("button", { name: "Link", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add link" });
  await dialog.getByLabel("An address").check();
  await dialog.getByLabel("Address", { exact: true }).fill("https://example.com/chleb");
  await dialog.getByRole("button", { name: "Add link" }).click();
  await expect(description.locator(".link")).toHaveText("bochník");
  await saveSettings(page);
  const marks = storedNode("service_bread").description.marks as unknown[];
  expect(marks).toHaveLength(1);
});

test("Change a price", async ({ page }) => {
  storeHighlights();
  await openLists(page, "offer");
  const price = item(page, /^Service 1/).getByRole("textbox", { name: "Price (optional)" });
  await caretAtEnd(page, price);
  for (let i = 0; i < 5; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("95 Kč");
  await saveSettings(page);
  for (const pageId of ["page_home", "page_contact"]) {
    await openEditor(page, paths().edit(pageId));
    await expect(canvas(page).locator(".service", { hasText: "Kváskový chléb" })).toContainText(
      "95 Kč",
    );
  }
});

test("Translate a service", async ({ page }) => {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  await openLists(page, "offer", "en");
  const name = item(page, /^Service 1/).getByRole("textbox", { name: "Name" });
  await selectText(page, name, "Kváskový chléb");
  await page.keyboard.type("Bread");
  await saveSettings(page);

  const en = readSite(testDb(), projectId, "en")?.document as Doc;
  const cs = readSite(testDb(), projectId)?.document as Doc;
  expect(en.nodes.service_bread.name.content).toBe("Bread");
  expect(cs.nodes.service_bread.name.content).toBe("Kváskový chléb");

  const reason = "Services are added and removed in Čeština";
  await expect(services(page)).toContainText(reason);
  await expect(services(page).getByRole("button", { name: "Add a service" })).toBeDisabled();
  const bread = item(page, /^Service 1/);
  await expect(bread.getByRole("button", { name: "Delete" })).toBeDisabled();
  await expect(bread.getByRole("button", { name: "Delete" })).toHaveAttribute("title", reason);
  await expect(bread.getByRole("button", { name: "Move down" })).toBeDisabled();
  await page.getByRole("link", { name: "Edit in Čeština" }).click();
  await expect(page).toHaveURL(paths().offer);
});

/** Stores the demo site changed by `change`. */
function storeChanged(change: (doc: Doc) => void): void {
  const doc = demoSite() as Doc;
  change(doc);
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error("could not store the site");
}

test("Go to an item's problem", async ({ page }) => {
  storeChanged((doc) => {
    doc.nodes.service_cakes.name = text("");
  });
  await openLists(page, "offer");
  await page
    .getByRole("button", { name: "Service 3 needs a name; edit it in What you offer." })
    .click();
  await page.keyboard.type("Dorty");
  await expect(item(page, "Service 3: Dorty")).toBeVisible();
});

test("An item's problem leads to its field", async ({ page }) => {
  storeChanged((doc) => {
    const faq = (id: string, question: string, answer: string) => {
      doc.nodes[id] = { id, type: "faq_item", question: text(question), answer: text(answer) };
    };
    faq("faq-1", "Vozíte domů?", "Ano.");
    faq("faq-2", "Pečete bez lepku?", "");
    doc.nodes[doc.document_id].faqs = list(["faq-1", "faq-2"]);
  });
  await page.goto(paths().dashboard);
  await page
    .getByRole("region", { name: "Problems" })
    .getByRole("link", { name: /Question 2 needs its answer/ })
    .click();
  await expect(page).toHaveURL(`${paths().offer}?focus=offer-faq-2-answer`);
  await expect(item(page, /^Question 2/)).toBeVisible();
  await page.keyboard.type("Zatím ne.");
  await expect(item(page, /^Question 2/).getByRole("textbox", { name: "Answer" })).toHaveText(
    "Zatím ne.",
  );
});
