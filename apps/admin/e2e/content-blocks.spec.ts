import type { Page } from "@playwright/test";
import { blockButton, canvas, expect, openEditor, paths, test } from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const buttonPanel = (page: Page) => page.getByRole("region", { name: /^Buttons?$/ });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });

/** Puts the caret at the end of the last block, so inserted blocks go after it. */
async function caretInLastBlock(page: Page) {
  await canvas(page).locator(".rich-text p").last().click();
  await page.keyboard.press("End");
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("a call to action: point its button at a page, add a call button, preview", async ({
  page,
}) => {
  await openEditor(page, paths().edit("page_contact"));
  await caretInLastBlock(page);
  await blockButton(page, "Call to action").click();
  const cta = canvas(page).locator("section.cta");
  await expect(cta.locator("h2")).toHaveText("Nadpis");

  await cta.locator(".button").first().click();
  await expect(buttonPanel(page)).toBeVisible();
  await buttonPanel(page).getByLabel("Page", { exact: true }).selectOption({ label: "Kontakt" });

  await buttonPanel(page).getByRole("button", { name: "Add a button" }).click();
  await expect(cta.locator(".button")).toHaveCount(2);
  await expect(buttonPanel(page).getByRole("button", { name: "Add a button" })).toBeHidden();
  await cta.locator(".button-secondary").click();
  await buttonPanel(page).getByLabel("An address").check();
  const address = buttonPanel(page).getByLabel("Address", { exact: true });
  await address.fill("javascript:alert(1)");
  await address.press("Enter");
  await expect(buttonPanel(page).getByRole("alert")).toContainText("isn't allowed");
  await address.fill("tel:+420321123456");
  await address.press("Enter");
  await expect(buttonPanel(page).getByRole("alert")).toBeHidden();
  await save(page);

  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toContain(`<a class="button" href="${paths().preview}kontakt/">Tlačítko</a>`);
  expect(preview).toContain(
    '<a class="button button-secondary" href="tel:+420321123456">Tlačítko</a>',
  );
});

test("give the hero a button", async ({ page }) => {
  await openEditor(page);
  const hero = canvas(page).locator("section.hero");
  await hero.locator(".button").click();
  await buttonPanel(page).getByRole("button", { name: "Remove button" }).click();
  await expect(hero.locator(".button")).toHaveCount(0);

  await hero.locator("h1").click();
  await buttonPanel(page).getByRole("button", { name: "Add a button" }).click();
  await expect(hero.locator(".button")).toHaveText("Tlačítko");
});

test("testimonials: two, one with a photo, in the preview", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await caretInLastBlock(page);
  await blockButton(page, "Testimonials").click();
  const block = canvas(page).locator("section.testimonials");

  await block.locator("blockquote").first().click();
  await page.keyboard.type("Nejlepší chleba v Kolíně.");
  await block.locator(".testimonial-name").first().click();
  await page.keyboard.type("Jana Nováková");
  await block.getByRole("button", { name: "Add photo…" }).first().click();
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(library(page)).toBeHidden();

  await block.locator(".testimonial-name").first().click();
  await toolbar(page).getByRole("button", { name: "Add item" }).click();
  await expect(block.locator(".testimonial")).toHaveCount(2);
  await block.locator("blockquote").nth(1).click();
  await page.keyboard.type("Dort na svatbu byl skvělý.");
  await block.locator(".testimonial-name").nth(1).click();
  await page.keyboard.type("Petr");
  await save(page);

  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview.match(/<figure class="testimonial">/g)).toHaveLength(2);
  expect(preview).toContain("<blockquote><p>Nejlepší chleba v Kolíně.</p></blockquote>");
  expect(preview).toMatch(/<img [^>]*class="testimonial-photo"/);
  expect(preview).toContain('<span class="testimonial-name">Petr</span>');
});
