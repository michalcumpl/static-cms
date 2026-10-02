import type { Page } from "@playwright/test";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { expect, openEditor, state, test, testDb } from "./fixtures";

// The problems panel sits in the editor's left column, under the pages (project-tabs, specs
// site-editing "Problems panel").

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = Record<string, any>;

/** Adds a text block with `count` empty headings to the home page of the saved site: each is a problem. */
function addEmptyHeadings(count: number) {
  const { projectId, owner } = state();
  const site = readSite(testDb(), projectId);
  if (!site) throw new Error("no document");
  const doc = structuredClone(site.document) as Doc;
  const headings = Array.from({ length: count }, (_, i) => `heading_extra_${i}`);
  for (const id of headings) {
    doc.nodes[id] = {
      id,
      type: "subheading",
      content: { content: "", marks: [], annotations: [] },
      level: 2,
    };
  }
  doc.nodes.block_extra = {
    id: "block_extra",
    type: "rich_text",
    body: { nodes: headings, marks: [], annotations: [] },
  };
  doc.nodes.page_home.blocks.nodes.push("block_extra");
  const result = saveSite(testDb(), projectId, owner.id, doc, site.version);
  if (!result.ok) throw new Error("could not save");
}

const pages = (page: Page) => page.getByRole("complementary", { name: "Pages" });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });
const details = (page: Page) => page.getByRole("complementary", { name: "Details" });

test("the problems are under the pages in the left column, not in the details", async ({
  page,
}) => {
  addEmptyHeadings(3);
  await openEditor(page);
  await expect(problems(page)).toBeVisible();
  await expect(details(page).getByRole("region", { name: /^Problems/ })).toHaveCount(0);
  const pagesBox = await pages(page).boundingBox();
  const problemsBox = await problems(page).boundingBox();
  const canvasBox = await page.locator(".site-canvas").boundingBox();
  expect(problemsBox?.y).toBeGreaterThanOrEqual((pagesBox?.y ?? 0) + (pagesBox?.height ?? 0) - 1);
  // The same column: left of the canvas.
  expect((problemsBox?.x ?? 0) + (problemsBox?.width ?? 0)).toBeLessThanOrEqual(canvasBox?.x ?? 0);
});

test("a long list scrolls inside its panel and the pages stay in view", async ({ page }) => {
  addEmptyHeadings(30);
  await openEditor(page);
  const column = page.locator(".left-problems");
  await expect(problems(page)).toContainText("30");
  const scrolls = await column.evaluate((el) => el.scrollHeight > el.clientHeight);
  expect(scrolls).toBe(true);
  const pagesBox = await pages(page).boundingBox();
  const columnBox = await column.boundingBox();
  const viewport = page.viewportSize();
  expect((pagesBox?.y ?? 0) + (pagesBox?.height ?? 0)).toBeLessThanOrEqual(columnBox?.y ?? 0);
  expect((columnBox?.y ?? 0) + (columnBox?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);
});
