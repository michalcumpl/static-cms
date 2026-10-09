import type { Page } from "@playwright/test";
import { addLanguage, readSite } from "../src/lib/server/site-documents";
import {
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  openWebsite,
  paths,
  saveSettings,
  state,
  test,
  testDb,
} from "./fixtures";

// Templates in the editor and the panel (template-system): hiding blocks, pages from layouts,
// and the Website section's template and home page sections.

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const sidebar = (page: Page) => page.getByRole("complementary", { name: "Pages" });
const services = (page: Page) => canvas(page).locator("section.services");
const hiddenLabel = (page: Page) => page.locator(".cs-hidden-label");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test.describe("showing and hiding blocks", () => {
  test("Hide a block: dimmed and labelled, off the preview, and undo shows it", async ({
    page,
  }) => {
    await openEditor(page);
    await caretAtEnd(page, services(page).locator("h2"));
    const show = page.getByRole("switch", { name: "Show on website" });
    await expect(show).toBeChecked();

    await show.uncheck();
    await expect(services(page)).toHaveAttribute("data-hidden", "");
    await expect(services(page)).toHaveCSS("opacity", "0.45");
    await expect(hiddenLabel(page)).toHaveText("Hidden · not on the website");
    await expect(page.getByText("Visitors don't see this block.")).toBeVisible();
    // Still editable, and still in place.
    await expect(services(page).locator("h2")).toHaveText("Co pečeme");

    await save(page);
    const preview = await (await page.request.get(paths().preview)).text();
    expect(preview).not.toContain("Co pečeme");
    expect(preview).toContain("Čerstvý chléb každé ráno");

    await toolbar(page).getByRole("button", { name: "Undo" }).click();
    await expect(services(page)).not.toHaveAttribute("data-hidden", "");
    await expect(hiddenLabel(page)).toHaveCount(0);
  });

  test("hides and shows a block from its handle menu", async ({ page }) => {
    await openEditor(page);
    await caretAtEnd(page, services(page).locator("h2"));
    await page.getByRole("button", { name: "Services block", exact: true }).click();
    await page.getByRole("menuitem", { name: "Hide on website" }).click();
    await expect(hiddenLabel(page)).toBeVisible();

    await page.getByRole("button", { name: "Services block", exact: true }).click();
    await page.getByRole("menuitem", { name: "Show on website" }).click();
    await expect(hiddenLabel(page)).toHaveCount(0);
  });
});

test.describe("adding pages from layouts", () => {
  test("Add a page from a layout: the Services layout fills in its title", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Page" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a page" });
    await expect(dialog.getByRole("radio", { name: /^Blank page/ })).toBeChecked();
    await dialog.getByRole("radio", { name: /^Services/ }).check();
    await expect(dialog.getByLabel("Title")).toHaveValue("Služby");
    await dialog.getByRole("button", { name: "Add page" }).click();

    await expect(canvas(page).locator("h1")).toHaveText("Služby");
    await expect(
      page.getByRole("region", { name: "Page", exact: true }).getByLabel("Address (slug)"),
    ).toHaveValue("sluzby");
    await expect(services(page)).toBeVisible();
    await expect(canvas(page).locator("section.cta")).toBeVisible();

    await toolbar(page).getByRole("button", { name: "Undo" }).click();
    await expect(page).toHaveURL(/\/edit\/$/);
  });

  test("Owner's own title kept", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Page" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a page" });
    await dialog.getByLabel("Title").fill("Co děláme");
    await dialog.getByRole("radio", { name: /^Services/ }).check();
    await expect(dialog.getByLabel("Title")).toHaveValue("Co děláme");
  });
});

test.describe("the Website section", () => {
  test("Template named", async ({ page }) => {
    await openWebsite(page);
    await expect(page.getByText("Template: Standard")).toBeVisible();
    await expect(page.getByText("A calm, clear look that suits any trade.")).toBeVisible();
  });

  test("Turn off a home page section: saved with the section, hidden in the editor", async ({
    page,
  }) => {
    await openWebsite(page);
    const card = page.getByRole("region", { name: "Home page sections" });
    await card.getByRole("switch", { name: "Services block · Co pečeme" }).uncheck();
    await saveSettings(page);
    const preview = await (await page.request.get(paths().preview)).text();
    expect(preview).not.toContain("Co pečeme");

    await card.getByRole("link", { name: "Edit home page" }).click();
    await expect(services(page)).toHaveAttribute("data-hidden", "");
    await expect(hiddenLabel(page)).toBeVisible();
  });

  test("switches the home page of the language shown", async ({ page }) => {
    const { projectId, owner } = state();
    addLanguage(testDb(), projectId, "en", owner.id);
    await openWebsite(page, "en");
    const card = page.getByRole("region", { name: "Home page sections" });
    await card.getByRole("switch", { name: "Services block · Co pečeme" }).uncheck();
    await saveSettings(page);
    const hidden = (lang?: string) => {
      const doc = readSite(testDb(), projectId, lang)?.document as
        | { nodes: Record<string, { hidden?: boolean }> }
        | undefined;
      return doc?.nodes.services_1?.hidden;
    };
    expect(hidden("en")).toBe(true);
    expect(hidden()).toBe(false);
  });

  test("Unsaved switch: asks to save first", async ({ page }) => {
    await openWebsite(page);
    const card = page.getByRole("region", { name: "Home page sections" });
    await card.getByRole("switch", { name: "Services block · Co pečeme" }).uncheck();
    let question = "";
    page.once("dialog", (dialog) => {
      question = dialog.message();
      void dialog.dismiss();
    });
    await card.getByRole("link", { name: "Edit home page" }).click();
    await expect.poll(() => question).toContain("saved before the editor opens");
    await expect(page).toHaveURL(/\/website\/?$/);
  });
});
