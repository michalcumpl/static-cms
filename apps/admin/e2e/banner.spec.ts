import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  blockOrder,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  paths,
  selectText,
  test,
} from "./fixtures";

// Banners in the editor (banner-block, site-editing delta "Banner in the editor").

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const buttonPanel = (page: Page) => page.getByRole("region", { name: /^Buttons?$/ });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const banner = (page: Page) => canvas(page).locator("section.banner");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

/** Inserts a banner right after the home page's hero and names it "Last minute". */
async function insertBanner(page: Page) {
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator("section.hero h1"));
  await addBlockAfterCaret(page, "Banner");
  await expect(banner(page).locator("h2")).toHaveText("Nadpis");
  await selectText(page, banner(page).locator("h2"), "Nadpis");
  await page.keyboard.type("Last minute");
  await expect(banner(page).locator("h2")).toHaveText("Last minute");
}

test("Insert a banner mid-page", async ({ page }) => {
  await insertBanner(page);
  // Without a photo, a band in the primary colour.
  await expect(banner(page)).toHaveClass(/banner-plain/);
  await expect(banner(page)).toHaveCSS("background-color", /rgb/);
  // Between blocks, not at the top or the end.
  const order = await blockOrder(page);
  expect(order.indexOf("banner")).toBeGreaterThan(0);
  expect(order.at(-1)).not.toBe("banner");
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(banner(page)).toHaveCount(0);
});

test("Give the banner a photo and a button", async ({ page }) => {
  await insertBanner(page);
  await banner(page).getByRole("button", { name: "Add photo…" }).click();
  await library(page)
    .getByRole("option", { name: /hero\.png/ })
    .click();
  await library(page)
    .getByRole("button", { name: /^(Use this image|Add 1 image)$/ })
    .click();
  await expect(library(page)).toBeHidden();
  await expect(banner(page)).toHaveClass(/banner-photo/);
  await expect(banner(page).locator("img")).toBeVisible();
  await page
    .getByRole("region", { name: "Image" })
    .getByLabel(/Description/)
    .fill("Chléb na pultu");

  await banner(page).locator("h2").click();
  await buttonPanel(page).getByRole("button", { name: "Add a button" }).click();
  await expect(banner(page).locator(".button")).toHaveText("Tlačítko");
  await expect(buttonPanel(page).getByRole("button", { name: "Add a button" })).toBeHidden();
  await banner(page).locator(".button").click();
  await buttonPanel(page).getByLabel("Page", { exact: true }).selectOption({ label: "Kontakt" });
  await save(page);

  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toContain('<section class="block banner banner-photo">');
  expect(home).toMatch(/<img class="banner-image[^"]*"[^>]*loading="lazy"/);
  expect(home).toContain("<h2>Last minute</h2>");
  expect(home).toContain(`<a class="button" href="${paths().preview}kontakt/">Tlačítko</a>`);
});
