import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  addBlockAfterCaret,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  openLists,
  pageAction,
  paths,
  saveSettings,
  state,
  test,
  testDb,
} from "./fixtures";

// Projects, their categories and the pages of services and projects (collection-pages).

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { document_id: string; nodes: Record<string, any> };
const list = (nodes: string[]) => ({ nodes, marks: [], annotations: [] });
const text = (content: string) => ({ content, marks: [], annotations: [] });

const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const projectsList = (page: Page) => page.getByRole("region", { name: "Projects" });
const servicesList = (page: Page) => page.getByRole("region", { name: "Services" });
const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });

/**
 * The demo site with categories "Výstavy" and "Eventy", six projects (Eventy: 2 and 5) listed on
 * "Kontakt", and, with `block`, a projects block on "Kontakt" showing "Eventy".
 */
function storeProjects(options: { block?: boolean; listing?: boolean } = {}): void {
  const doc = demoSite() as Doc;
  const { nodes } = doc;
  nodes.category_vystavy = {
    id: "category_vystavy",
    type: "project_category",
    name: text("Výstavy"),
  };
  nodes.category_eventy = { id: "category_eventy", type: "project_category", name: text("Eventy") };
  nodes.site_1.project_categories = list(["category_vystavy", "category_eventy"]);
  const ids = Array.from({ length: 6 }, (_, i) => {
    const id = `project_${i + 1}`;
    nodes[`cover_${i + 1}`] = {
      ...nodes.image_hero,
      id: `cover_${i + 1}`,
      alt: `Projekt ${i + 1}`,
    };
    nodes[id] = {
      id,
      type: "project",
      name: text(`Projekt ${i + 1}`),
      category_id: [2, 5].includes(i + 1) ? "category_eventy" : "category_vystavy",
      summary: text(""),
      body: list([]),
      facts: list([]),
      cover: list([`cover_${i + 1}`]),
      photos: list([]),
      video_url: "",
      slug: `projekt-${i + 1}`,
    };
    return id;
  });
  nodes.site_1.projects = list(ids);
  if (options.listing !== false) nodes.site_1.projects_page_id = "page_contact";
  if (options.block) {
    nodes.projects_eventy = {
      id: "projects_eventy",
      type: "projects",
      heading: text("Eventy"),
      show: "all",
      chosen: list([]),
      category_id: "category_eventy",
      limit: 0,
    };
    nodes.page_contact.blocks.nodes.push("projects_eventy");
  }
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error(`could not store the site: ${JSON.stringify(result)}`);
}

function stored(): Doc {
  return (readSite(testDb(), state().projectId) as { document: Doc }).document;
}

test("Add a project", async ({ page }) => {
  storeProjects({ block: true });
  await openLists(page, "offer");
  await projectsList(page).getByRole("button", { name: "Add a project" }).click();
  await page.keyboard.type("PETROF 160");
  const petrof = page.getByRole("group", { name: "Project 7: PETROF 160" });
  await petrof.getByLabel("Category").selectOption({ label: "Eventy" });
  await petrof.getByRole("button", { name: "Add a fact" }).click();
  await page.keyboard.type("Rok");
  await petrof.getByRole("textbox", { name: "Value" }).click();
  await page.keyboard.type("2024");
  await petrof
    .getByRole("group", { name: "Cover" })
    .getByRole("button", { name: "Choose…" })
    .click();
  await library(page).getByRole("option").first().click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await petrof.getByLabel(/Description/).fill("Klavír v expozici");
  await petrof.getByRole("button", { name: "Add photos" }).click();
  await library(page).getByRole("option").first().click();
  await library(page).getByRole("button", { name: "Add 1 image" }).click();
  await expect(petrof.locator(".photo-row")).toHaveCount(1);
  await petrof
    .locator(".photo-row")
    .getByLabel(/Description/)
    .fill("Detail podia");
  // Projects have pages under "Kontakt", so the new one got an address from its name.
  await expect(petrof.getByLabel("Address", { exact: true })).toHaveValue("petrof-160");
  await saveSettings(page);

  const doc = stored();
  const id = doc.nodes.site_1.projects.nodes.at(-1);
  expect(doc.nodes[id]).toMatchObject({ category_id: "category_eventy", slug: "petrof-160" });
  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toMatch(/kontakt\/petrof-160\/"/);
  const petrofPage = await (await page.request.get(`${paths().preview}kontakt/petrof-160/`)).text();
  expect(petrofPage).toContain('<h1 class="page-title">PETROF 160</h1>');
  expect(petrofPage).toMatch(/<dt>Rok<\/dt>\s*<dd>2024<\/dd>/);
});

test("Delete a category", async ({ page }) => {
  storeProjects({ block: true });
  await openLists(page, "offer");
  const eventy = page.locator(".category-row").nth(1);
  await eventy.getByRole("button", { name: "Delete" }).click();
  await expect(eventy.getByRole("alert")).toContainText("Projects in it: 2. Blocks showing it: 1.");
  await eventy.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator(".category-row")).toHaveCount(1);
  await expect(
    page.getByRole("group", { name: "Project 2: Projekt 2" }).getByLabel("Category"),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".category-row")).toHaveCount(2);
  await expect(
    page.getByRole("group", { name: "Project 2: Projekt 2" }).getByLabel("Category"),
  ).toHaveValue("category_eventy");
});

test("Give the practice areas pages", async ({ page }) => {
  await openLists(page, "offer");
  await servicesList(page).getByLabel("Each service has its own page").check();
  await servicesList(page).getByLabel("Listed on the page").selectOption({ label: "Kontakt" });
  const bread = page.getByRole("group", { name: "Service 1: Kváskový chléb" });
  await expect(bread.getByLabel("Address", { exact: true })).toHaveValue("kvaskovy-chleb");
  await bread.getByRole("button", { name: "Add text" }).click();
  await page.keyboard.type("Pečeme z vlastního kvasu.");
  await expect(bread.getByRole("link", { name: "Open page" })).toHaveAttribute(
    "href",
    /preview\/kontakt\/kvaskovy-chleb\/$/,
  );
  await saveSettings(page);
  const breadPage = await (
    await page.request.get(`${paths().preview}kontakt/kvaskovy-chleb/`)
  ).text();
  expect(breadPage).toContain('<h1 class="page-title">Kváskový chléb</h1>');
  expect(breadPage).toContain("<p>Pečeme z vlastního kvasu.</p>");
  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toContain('<a href="/p/');
  expect(home).toMatch(
    /<p class="service-name"><a href="[^"]*kontakt\/kvaskovy-chleb\/">Kváskový chléb<\/a><\/p>/,
  );
});

test("Category page", async ({ page }) => {
  storeProjects();
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Projects");
  const tiles = canvas(page).locator("section.projects .project-tile");
  await expect(tiles).toHaveCount(6);
  await page.getByLabel("Category", { exact: true }).selectOption({ label: "Výstavy" });
  await expect(tiles).toHaveCount(4);
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(tiles).toHaveCount(6);
});

test("Latest work on the home page", async ({ page }) => {
  storeProjects();
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Projects");
  await page.getByLabel("How many").selectOption("4");
  await expect(canvas(page).locator("section.projects .project-tile")).toHaveCount(4);
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact.match(/<li class="project-tile">/g)).toHaveLength(4);
  expect(contact).toMatch(
    /<p class="projects-more"><a href="[^"]*kontakt\/">Všechny projekty<\/a><\/p>/,
  );
});

test("New project from the canvas", async ({ page }) => {
  storeProjects();
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Projects");
  await page.getByRole("button", { name: "New project" }).click();
  const tiles = canvas(page).locator("section.projects .project-tile");
  await expect(tiles).toHaveCount(7);
  await page.keyboard.type("Mustang");
  await expect(tiles.last().locator(".project-name")).toHaveText("Mustang");
});

test("Delete the page that lists the projects", async ({ page }) => {
  storeProjects();
  await openEditor(page, paths().edit("page_contact"));
  await pageAction(page, "Kontakt", "Delete");
  const dialog = page.getByRole("dialog", { name: "Delete “Kontakt”?" });
  await expect(dialog).toContainText(
    "It lists the projects: their own pages will no longer be published.",
  );
  await dialog.getByRole("button", { name: "Delete page" }).click();
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  expect(stored().nodes.site_1.projects_page_id).toBe("page_contact");
});
