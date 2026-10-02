import type { Page } from "@playwright/test";
import { canvas, expect, openEditor, openPageMenu, pageAction, paths, test } from "./fixtures";

// The "⋯" menu of every entry in the editor's pages list (project-tabs, site-editing "Page
// actions menu").

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Pages" });
const status = (page: Page) => page.getByRole("toolbar", { name: "Editing" }).getByRole("status");
const canvasMenu = (page: Page) =>
  canvas(page)
    .locator(".site-nav li")
    .evaluateAll((items) => items.map((i) => i.textContent?.trim()));

test("delete from the list, confirm, and undo it", async ({ page }) => {
  await openEditor(page);
  await pageAction(page, "Kontakt", "Delete");
  const dialog = page.getByRole("dialog", { name: "Delete “Kontakt”?" });
  await expect(dialog).toContainText("2 links elsewhere in the site point to it.");
  await dialog.getByRole("button", { name: "Delete page" }).click();
  expect(await canvasMenu(page)).toEqual(["Úvod"]);
  await canvas(page).locator(".hero h1").click();
  await page.keyboard.press("ControlOrMeta+z");
  expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt"]);
});

test("move a page in the menu from its menu", async ({ page }) => {
  await openEditor(page);
  await pageAction(page, "Kontakt", "Move up");
  expect(await canvasMenu(page)).toEqual(["Kontakt", "Úvod"]);
});

test("the home page can't be deleted or set as home again, and the menu says why", async ({
  page,
}) => {
  await openEditor(page);
  const menu = await openPageMenu(page, "Úvod");
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(menu.getByRole("menuitem", { name: "Set as home" })).toContainText(
    "Already the home page",
  );
  await expect(menu.getByRole("menuitem", { name: "Move up" })).toContainText(
    "Already first in the menu",
  );
});

test("rename a page: its slug and menu label follow", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await pageAction(page, "Kontakt", "Rename");
  const dialog = page.getByRole("dialog", { name: "Rename “Kontakt”" });
  await dialog.getByLabel("Title").fill("Napište nám");
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(canvas(page).locator("h1")).toHaveText("Napište nám");
  expect(await canvasMenu(page)).toEqual(["Úvod", "Napište nám"]);
  await expect(page.getByLabel("Address (slug)")).toHaveValue("napiste-nam");
});

test("an empty title is refused when renaming", async ({ page }) => {
  await openEditor(page);
  await pageAction(page, "Kontakt", "Rename");
  const dialog = page.getByRole("dialog", { name: "Rename “Kontakt”" });
  await dialog.getByLabel("Title").fill("");
  await dialog.getByRole("button", { name: "Rename" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Enter a title for the page.");
});

test("a page not in the menu offers Show in menu and no moves", async ({ page }) => {
  await openEditor(page);
  await pageAction(page, "Kontakt", "Remove from menu");
  expect(await canvasMenu(page)).toEqual(["Úvod"]);
  const menu = await openPageMenu(page, "Kontakt");
  await expect(menu.getByRole("menuitem", { name: "Show in menu" })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Move up" })).toHaveCount(0);
  await menu.getByRole("menuitem", { name: "Show in menu" }).click();
  expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt"]);
});

test("an external link's menu edits, moves and removes it", async ({ page }) => {
  await openEditor(page);
  await sidebar(page).getByRole("button", { name: "+ Link" }).click();
  const add = page.getByRole("dialog", { name: "Add a link to the menu" });
  await add.getByLabel("Label").fill("Facebook");
  await add.getByLabel("Address").fill("https://facebook.com/pekarna");
  await add.getByRole("button", { name: "Add link" }).click();
  expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt", "Facebook"]);

  await pageAction(page, "Facebook", "Move up");
  expect(await canvasMenu(page)).toEqual(["Úvod", "Facebook", "Kontakt"]);
  await pageAction(page, "Facebook", "Remove from menu");
  expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt"]);
});

test("the menu works from the keyboard and returns focus on Escape", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  const button = sidebar(page).getByRole("button", { name: "Actions for “Kontakt”" });
  await button.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Actions for “Kontakt”" });
  await expect(menu.getByRole("menuitem", { name: "Rename" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();

  await page.keyboard.press("Enter");
  for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Delete “Kontakt”?" })).toBeVisible();
});

test("each action is one undoable step", async ({ page }) => {
  await openEditor(page);
  await pageAction(page, "Kontakt", "Duplicate");
  await expect(canvas(page).locator("h1")).toHaveText("Kontakt (copy)");
  await expect(status(page).first()).toHaveText("Unsaved changes");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(sidebar(page).getByRole("link", { name: "Kontakt (copy)" })).toHaveCount(0);
});
