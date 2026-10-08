import type { Page } from "@playwright/test";
import { projectPaths } from "../src/lib/project-paths";
import { demoSite } from "../src/lib/server/demo";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
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

// Collection blocks on the canvas (business-collections, site-editing delta).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const handle = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const actions = (page: Page) => page.getByRole("menu", { name: / actions$/ });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const text = (content: string) => ({ content, marks: [], annotations: [] });

/**
 * The home page's services block shows chosen services, "Kváskový chléb" and "Dorty na
 * objednávku"; "Kontakt" gets a services block showing them all.
 */
function storeHighlights(extra?: (doc: Doc) => void): void {
  const doc = demoSite() as Doc;
  doc.nodes.ref_bread = { id: "ref_bread", type: "item_ref", item_id: "service_bread" };
  doc.nodes.ref_cakes = { id: "ref_cakes", type: "item_ref", item_id: "service_cakes" };
  doc.nodes.services_1.show = "chosen";
  doc.nodes.services_1.chosen = list(["ref_bread", "ref_cakes"]);
  doc.nodes.services_all = {
    id: "services_all",
    type: "services",
    layout: "cards",
    heading: text("Všechny služby"),
    show: "all",
    chosen: list([]),
  };
  doc.nodes.page_contact.blocks.nodes.push("services_all");
  extra?.(doc);
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error("could not store the site");
}

const serviceNames = (page: Page) =>
  canvas(page).locator("section.services .service-name").allTextContents();

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("Edit a highlighted service", async ({ page }) => {
  storeHighlights();
  await openEditor(page);
  const price = canvas(page).locator("section.services .service-price").first();
  await caretAtEnd(page, price);
  await page.keyboard.type(" za bochník");
  await page.getByRole("link", { name: "Kontakt", exact: true }).first().click();
  await expect(canvas(page).locator("section.services .service-price").first()).toHaveText(
    "89 Kč za bochník",
  );
});

test("Remove a highlight", async ({ page }) => {
  storeHighlights();
  await openEditor(page);
  await canvas(page).getByText("Dorty na objednávku").click();
  await handle(page, "Service 2").click();
  const menu = actions(page);
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toHaveCount(0);
  await menu.getByRole("menuitem", { name: "Remove from this block" }).click();
  await expect.poll(() => serviceNames(page)).toEqual(["Kváskový chléb"]);
  await page.getByRole("link", { name: "Kontakt", exact: true }).first().click();
  await expect
    .poll(() => serviceNames(page))
    .toEqual(["Kváskový chléb", "Rohlíky a housky", "Dorty na objednávku"]);
});

test("Add an existing service to the highlights", async ({ page }) => {
  storeHighlights();
  await openEditor(page);
  await canvas(page).getByText("Co pečeme").click();
  const panel = page.getByRole("region", { name: "Services" });
  await panel.getByLabel("Add to this block").selectOption({ label: "Rohlíky a housky" });
  await panel.getByRole("button", { name: "Add", exact: true }).click();
  await expect
    .poll(() => serviceNames(page))
    .toEqual(["Kváskový chléb", "Dorty na objednávku", "Rohlíky a housky"]);
});

test("Delete a shown service", async ({ page }) => {
  storeHighlights();
  await openEditor(page, paths().edit("page_contact"));
  await canvas(page).getByText("Kváskový chléb").click();
  await handle(page, "Service 1").click();
  const del = actions(page).getByRole("menuitem", { name: /^Delete/ });
  await expect(del).toContainText("Also shown on 1 other page");
  await del.click();
  await expect.poll(() => serviceNames(page)).toEqual(["Rohlíky a housky", "Dorty na objednávku"]);
  await page.getByRole("link", { name: "Úvod", exact: true }).first().click();
  await expect.poll(() => serviceNames(page)).toEqual(["Dorty na objednávku"]);
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => serviceNames(page)).toEqual(["Kváskový chléb", "Dorty na objednávku"]);
});

test("Same service twice on one page", async ({ page }) => {
  storeHighlights((doc) => {
    doc.nodes.page_contact.blocks.nodes = doc.nodes.page_contact.blocks.nodes.filter(
      (id: string) => id !== "services_all",
    );
    doc.nodes.page_home.blocks.nodes.push("services_all");
  });
  await openEditor(page);
  const previews = canvas(page).locator(".item-preview");
  await expect(previews).toHaveCount(2);
  await previews.filter({ hasText: "Kváskový chléb" }).click();
  await expect(toolbar(page).getByRole("button", { name: "Bold" })).toBeVisible();
  await page.keyboard.type("Nový ");
  await expect(canvas(page).locator("section.services").first()).toContainText(
    "Nový Kváskový chléb",
  );
  // The preview follows the edit.
  await expect(previews.filter({ hasText: "Nový Kváskový chléb" })).toHaveCount(1);
});

test("New FAQ block, and Add a question", async ({ page }) => {
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Questions");
  const faq = canvas(page).locator("section.faq");
  await expect(faq.locator("summary")).toHaveText(["Nová otázka"]);
  await caretAtEnd(page, faq.locator("summary").first());
  await toolbar(page).getByRole("button", { name: "Add item" }).click();
  await expect(faq.locator("summary")).toHaveCount(2);
  await page.keyboard.type("Rozvážíte?");
  await expect(faq.locator("summary").nth(1)).toHaveText("Rozvážíte?Nová otázka");
  await save(page);
});

test("Switch to chosen", async ({ page }) => {
  await openEditor(page);
  await canvas(page).getByText("Co pečeme").click();
  const panel = page.getByRole("region", { name: "Services" });
  await panel.getByLabel("Chosen services").check();
  await expect
    .poll(() => serviceNames(page))
    .toEqual(["Kváskový chléb", "Rohlíky a housky", "Dorty na objednávku"]);
  await canvas(page).getByText("Rohlíky a housky").click();
  await handle(page, "Service 2").click();
  await actions(page).getByRole("menuitem", { name: "Remove from this block" }).click();
  await expect.poll(() => serviceNames(page)).toEqual(["Kváskový chléb", "Dorty na objednávku"]);
  await save(page);
  const stored = readSite(testDb(), state().projectId)?.document as Doc;
  expect(stored.nodes[stored.document_id].services.nodes).toHaveLength(3);
});

test.describe("in English", () => {
  const english = () => projectPaths(state().projectId, "en");

  test.beforeEach(() => {
    const { projectId, owner } = state();
    addLanguage(testDb(), projectId, "en", owner.id);
  });

  test("Translate a service in English", async ({ page }) => {
    await openEditor(page, english().edit());
    const name = canvas(page).locator(".service-name").first();
    await name.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("Bread");
    await save(page);
    const en = readSite(testDb(), state().projectId, "en")?.document as Doc;
    const cs = readSite(testDb(), state().projectId)?.document as Doc;
    expect(en.nodes.service_bread.name.content).toBe("Bread");
    expect(cs.nodes.service_bread.name.content).toBe("Kváskový chléb");
    expect(en.nodes[en.document_id].services.nodes).toEqual(
      cs.nodes[cs.document_id].services.nodes,
    );
  });

  test("No new services in English", async ({ page }) => {
    await openEditor(page, english().edit());
    await canvas(page).getByText("Rohlíky a housky").click();
    await handle(page, "Service 2").click();
    const menu = actions(page);
    for (const name of ["Move up", "Move down", "Duplicate", "Delete"]) {
      const entry = menu.getByRole("menuitem", { name: new RegExp(`^${name}`) });
      await expect(entry).toBeDisabled();
    }
    await expect(menu).toContainText("Services are added and removed in Čeština");
    await page.keyboard.press("Escape");
    await expect(toolbar(page).getByRole("button", { name: "Add item" })).toBeDisabled();
  });
});
