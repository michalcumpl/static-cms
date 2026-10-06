import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  canvas,
  expect,
  openBusiness,
  openEditor,
  paths,
  resetPublishing,
  saveSettings,
  test,
} from "./fixtures";

// The business blocks in the editor. The details themselves are edited in the panel's Business
// section (see settings.spec.ts); here they are set there, and the editor shows them.

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const business = (page: Page) => page.getByRole("region", { name: "Business", exact: true });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });

/** Puts the caret at the end of the last block, so inserted blocks go after it. */
async function caretInLastBlock(page: Page) {
  await canvas(page).locator(".rich-text p").last().click();
  await page.keyboard.press("End");
}

async function insert(page: Page, label: "Contact" | "Opening hours") {
  await caretInLastBlock(page);
  await addBlockAfterCaret(page, label);
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test.beforeEach(() => resetPublishing());

test("a contact block shows the phone, which the block panel can hide", async ({ page }) => {
  await openBusiness(page);
  const phone = business(page).getByLabel("Phone");
  await phone.fill("321 123 456");
  await phone.press("Tab");
  await saveSettings(page);

  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Contact");
  const block = canvas(page).locator("section.contact");
  await expect(block.locator("h2")).toHaveText("Kontakt");
  await expect(block.locator('a[href="tel:+420321123456"]')).toBeVisible();

  await block.locator("h2").click();
  const panel = page.getByRole("region", { name: "Contact block" });
  await panel.getByLabel("Phone").uncheck();
  await expect(block.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("opening hours with a lunch break show on the canvas", async ({ page }) => {
  await openBusiness(page);
  await business(page).getByRole("button", { name: "Open on Monday" }).click();
  await business(page).getByLabel("Monday closes").fill("12:00");
  await business(page)
    .getByRole("group", { name: "Monday" })
    .getByRole("button", { name: "Add range" })
    .click();
  await saveSettings(page);

  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Opening hours");
  await expect(canvas(page).locator("section.opening-hours table")).toContainText(
    "8:00–12:00, 13:00–17:00",
  );
});

test("details follow the settings, and the block leads to them", async ({ page }) => {
  await openBusiness(page);
  await business(page).getByLabel("Street and number").fill("Lipová 12");
  await business(page).getByLabel("City").fill("Kolín 2");
  await saveSettings(page);

  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Contact");
  await expect(canvas(page).locator("section.contact address")).toContainText("Kolín 2");
  await expect(canvas(page).locator("footer address")).toContainText("Kolín 2");
  await save(page);
  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toContain('<section class="block contact">');

  await canvas(page)
    .locator("section.contact")
    .getByRole("button", { name: "Edit business details" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${paths().business}\\?focus=`));
  await expect(business(page).getByLabel("Name", { exact: true })).toBeFocused();
});

test("unsaved changes are saved first when the block leads to the settings", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Contact");
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Unsaved changes");
  page.once("dialog", (dialog) => void dialog.accept());
  await canvas(page)
    .locator("section.contact")
    .getByRole("button", { name: "Edit business details" })
    .click();
  await expect(page).toHaveURL(new RegExp(`${paths().business}\\?focus=`));
  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toContain('<section class="block contact">');
});

test("an overlap problem in the editor opens the Business section at the day", async ({ page }) => {
  await openBusiness(page);
  const wednesday = business(page).getByRole("group", { name: "Wednesday" });
  await wednesday.getByRole("button", { name: "Open on Wednesday" }).click();
  await wednesday.getByRole("button", { name: "Add range" }).click();
  await business(page).getByLabel("Wednesday opens (2)").fill("12:00");
  await saveSettings(page);

  await openEditor(page);
  await problems(page)
    .getByRole("button", { name: /Wednesday's hours overlap/ })
    .click();
  await expect(business(page).getByLabel("Wednesday opens (1)")).toBeFocused();
});

test("Choose a shop", async ({ page }) => {
  // Two locations, set up in the Business section.
  await openBusiness(page);
  const main = business(page).getByRole("group", { name: "Main location" });
  // The name last: once named, a location is headed by its name.
  await main.getByLabel("City").fill("Kolín");
  await main.getByLabel("Name of the location").fill("Kolín – Lipová");
  await business(page).getByRole("button", { name: "Add a location" }).click();
  await business(page)
    .getByRole("group", { name: "Location 2" })
    .getByLabel("Name of the location")
    .fill("Kutná Hora");
  const branch = business(page).getByRole("group", { name: "Kutná Hora" });
  await branch.getByLabel("City").fill("Kutná Hora");
  await saveSettings(page);

  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Contact");
  const contact = canvas(page).locator("section.contact");
  await expect(contact.locator("h3")).toHaveText(["Kolín – Lipová", "Kutná Hora"]);

  const panel = page.getByRole("region", { name: "Locations shown" });
  await panel.getByLabel("Location").selectOption({ label: "Kutná Hora" });
  await expect(contact.locator("h3")).toHaveCount(0);
  await expect(contact).toContainText("Kutná Hora");
  await expect(contact).not.toContainText("Kolín");

  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(contact.locator("h3")).toHaveText(["Kolín – Lipová", "Kutná Hora"]);
});
