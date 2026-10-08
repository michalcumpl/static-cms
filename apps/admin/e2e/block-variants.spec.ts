import type { Page } from "@playwright/test";
import { demoSite } from "../src/lib/server/demo";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { canvas, caretAtEnd, expect, openEditor, paths, state, test, testDb } from "./fixtures";

// Choosing a block's look in the block panel (block-variants design decision 3).

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const look = (page: Page) => page.getByRole("group", { name: "Look" });

/** Stores the demo site with its hero's photo removed. */
function storeHeroWithoutPhoto() {
  // biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
  const doc = demoSite() as { nodes: Record<string, any> };
  const [imageId] = doc.nodes.hero_1.image.nodes;
  doc.nodes.hero_1.image = { nodes: [], marks: [], annotations: [] };
  delete doc.nodes[imageId];
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  const result = saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");
  if (!result.ok) throw new Error("could not store the site");
}

test("Make the hero a full photo", async ({ page }) => {
  await openEditor(page);
  const hero = canvas(page).locator("section.hero");
  await caretAtEnd(page, hero.locator("h1"));
  await expect(look(page).getByRole("radio", { name: "Beside the text" })).toBeChecked();

  await look(page).getByRole("radio", { name: "Full photo" }).check();
  await expect(hero).toHaveClass(/hero-cover/);
  const photo = await hero.locator("img").boundingBox();
  const heroBox = await hero.boundingBox();
  // The photo fills the band, with the heading over it.
  expect(photo?.width).toBeCloseTo(heroBox?.width ?? 0, 0);
  await expect(hero.locator("h1")).toBeVisible();

  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(hero).not.toHaveClass(/hero-cover/);
  await expect(hero.locator(".hero-inner img")).toBeVisible();
});

test("Practice areas as an accordion", async ({ page }) => {
  await openEditor(page);
  const services = canvas(page).locator("section.services");
  await caretAtEnd(page, services.locator("h2"));
  await look(page).getByRole("radio", { name: "Accordion" }).check();
  await expect(services).toHaveClass(/services-as-accordion/);
  // The descriptions stay open on the canvas, so they can be edited.
  await expect(services.locator(".service-description").first()).toBeVisible();

  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  const preview = await (await page.request.get(paths().preview)).text();
  expect(preview).toContain('<section class="block services services-as-accordion">');
  expect(preview).toMatch(
    /<details>\s*<summary><span class="service-name">Kváskový chléb<\/span><span class="service-price">89 Kč<\/span><\/summary>/,
  );
  expect(preview).not.toContain("<details open");
});

test("Full photo without a photo", async ({ page }) => {
  storeHeroWithoutPhoto();
  await openEditor(page);
  const hero = canvas(page).locator("section.hero");
  await caretAtEnd(page, hero.locator("h1"));
  await look(page).getByRole("radio", { name: "Full photo" }).check();
  await expect(
    page.getByText("Add a photo to the hero; until then the text shows as usual."),
  ).toBeVisible();
  await expect(hero).not.toHaveClass(/hero-cover/);
  await expect(hero.locator("h1")).toBeVisible();
});
