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

// Cards on the canvas and their links (cards design decision 4).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const text = (content: string) => ({ content, marks: [], annotations: [] });
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const handle = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const actions = (page: Page) => page.getByRole("menu", { name: / actions$/ });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const cardPanel = (page: Page) => page.getByRole("region", { name: "Card" });
const cards = (page: Page) => canvas(page).locator("section.cards .card");

async function insertCards(page: Page) {
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Cards");
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("Insert cards", async ({ page }) => {
  await insertCards(page);
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).first().getByRole("button", { name: "Add image" })).toBeVisible();
  // The caret is in the first card's title.
  await page.keyboard.type("Výstavy");
  await expect(cards(page).first().locator(".card-title")).toHaveText("Výstavy");
});

test("Last card can't be deleted", async ({ page }) => {
  await insertCards(page);
  for (const name of ["Card 3", "Card 2"]) {
    await cards(page).last().locator(".card-title").click();
    await handle(page, name).click();
    await actions(page).getByRole("menuitem", { name: "Delete" }).click();
  }
  await expect(cards(page)).toHaveCount(1);
  await cards(page).first().locator(".card-title").click();
  await handle(page, "Card 1").click();
  await expect(actions(page).getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("Category tile", async ({ page }) => {
  await insertCards(page);
  const first = cards(page).first();
  await page.keyboard.type("Kontakt");
  await first.getByRole("button", { name: "Add image" }).click();
  await library(page).getByRole("option").first().click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await page
    .getByRole("region", { name: "Image" })
    .getByLabel(/Decorative/)
    .check();
  await first.locator(".card-title").click();
  await cardPanel(page).getByLabel("A page of the site").check();
  await cardPanel(page).getByRole("combobox", { name: "Page" }).selectOption({ label: "Kontakt" });
  for (const [i, title] of [
    [1, "Dva"],
    [2, "Tři"],
  ] as const) {
    await cards(page).nth(i).locator(".card-title").click();
    await page.keyboard.type(title);
  }
  await expect(first.locator("img")).toBeVisible();
  await save(page);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toMatch(/<h2 class="card-title"><a href="[^"]*kontakt\/">Kontakt<\/a><\/h2>/);
});

test("Link to a project", async ({ page }) => {
  const doc = demoSite() as Doc;
  doc.nodes.project_petrof = {
    id: "project_petrof",
    type: "project",
    name: text("PETROF 160"),
    category_id: "",
    summary: text(""),
    body: list([]),
    facts: list([]),
    cover: list([]),
    photos: list([]),
    video_url: "",
    slug: "petrof-160",
  };
  doc.nodes.site_1.projects = list(["project_petrof"]);
  doc.nodes.site_1.projects_page_id = "page_contact";
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  if (!saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "").ok) throw new Error();

  await insertCards(page);
  await page.keyboard.type("PETROF");
  await cardPanel(page).getByLabel("A project or service").check();
  await cardPanel(page)
    .getByRole("combobox", { name: "Project or service" })
    .selectOption({ label: "PETROF 160" });
  for (const [i, title] of [
    [1, "Dva"],
    [2, "Tři"],
  ] as const) {
    await cards(page).nth(i).locator(".card-title").click();
    await page.keyboard.type(title);
  }
  await save(page);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toMatch(/<a href="[^"]*kontakt\/petrof-160\/">PETROF<\/a>/);
});
