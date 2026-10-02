import type { Page } from "@playwright/test";
import { canvas, expect, openEditor, paths, test } from "./fixtures";

test.describe("editor addresses", () => {
  test("/edit/ opens the home page", async ({ page }) => {
    await openEditor(page);
    await expect(canvas(page).locator(".hero h1")).toHaveText("Čerstvý chléb každé ráno");
  });

  test("/edit/<page-id>/ opens that page", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    await expect(canvas(page).locator("h1")).toHaveText("Kontakt");
  });

  test("an unknown page ID shows not-found", async ({ page }) => {
    const response = await page.goto(paths().edit("does-not-exist"));
    // The editor is rendered in the browser, so the not-found page comes from the client.
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Pages" });
const menuSection = (page: Page) => sidebar(page).getByRole("region", { name: "Menu" });
const unlistedSection = (page: Page) => sidebar(page).getByRole("region", { name: "Not in menu" });
const settings = (page: Page) => page.getByRole("region", { name: "Page", exact: true });
const canvasMenu = (page: Page) =>
  canvas(page)
    .locator(".site-nav li")
    .evaluateAll((items) => items.map((i) => i.textContent?.trim()));
const status = (page: Page) => page.getByRole("toolbar", { name: "Editing" }).getByRole("status");

test.describe("sidebar", () => {
  test("add a page: it opens, has a slug and joins the menu", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Page" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a page" });
    await dialog.getByLabel("Title").fill("Ceník");
    await dialog.getByRole("button", { name: "Add page" }).click();

    await expect(canvas(page).locator("h1")).toHaveText("Ceník");
    await expect(page).toHaveURL(/\/edit\/n[0-9a-f-]+\/$/);
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("cenik");
    expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt", "Ceník"]);
    await expect(menuSection(page).getByRole("link", { name: "Ceník" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("undoing an added page while on it goes back to home", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Page" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a page" });
    await dialog.getByLabel("Title").fill("Ceník");
    await dialog.getByRole("button", { name: "Add page" }).click();
    await expect(canvas(page).locator("h1")).toHaveText("Ceník");

    await page
      .getByRole("toolbar", { name: "Editing" })
      .getByRole("button", { name: "Undo" })
      .click();
    await expect(canvas(page).locator(".hero h1")).toHaveText("Čerstvý chléb každé ráno");
    await expect(page).toHaveURL(/\/edit\/$/);
    expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt"]);
  });

  test("an empty title asks for one", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Page" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a page" });
    await dialog.getByRole("button", { name: "Add page" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Enter a title for the page.");
  });

  test("reorder the menu with the move buttons", async ({ page }) => {
    await openEditor(page);
    await menuSection(page).getByRole("button", { name: "Move Kontakt up" }).click();
    expect(await canvasMenu(page)).toEqual(["Kontakt", "Úvod"]);
    await expect(status(page)).toHaveText("Unsaved changes");
  });

  test("hide a page from the menu", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    await settings(page).getByLabel("Show in menu").uncheck();
    expect(await canvasMenu(page)).toEqual(["Úvod"]);
    await expect(unlistedSection(page).getByRole("link", { name: "Kontakt" })).toBeVisible();
    await expect(canvas(page).locator("h1")).toHaveText("Kontakt");
  });

  test("add an external link to the menu, and refuse an unsafe one", async ({ page }) => {
    await openEditor(page);
    await sidebar(page).getByRole("button", { name: "+ Link" }).click();
    const dialog = page.getByRole("dialog", { name: "Add a link to the menu" });
    await dialog.getByLabel("Label").fill("Facebook");
    await dialog.getByLabel("Address").fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Add link" }).click();
    await expect(dialog.getByRole("alert")).toContainText("isn't allowed");

    await dialog.getByLabel("Address").fill("https://facebook.com/pekarna");
    await dialog.getByRole("button", { name: "Add link" }).click();
    await expect(dialog).toBeHidden();
    expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt", "Facebook"]);
  });
});

test.describe("page settings", () => {
  test("edit the title: the canvas, sidebar, menu label and slug follow", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    const title = settings(page).getByLabel("Title");
    await title.fill("");
    await title.pressSequentially("O nás");
    await expect(canvas(page).locator("h1")).toHaveText("O nás");
    await expect(menuSection(page).getByRole("link", { name: "O nás" })).toBeVisible();
    expect(await canvasMenu(page)).toEqual(["Úvod", "O nás"]);
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("o-nas");
    // The caret stays at the end while typing.
    expect(await title.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(5);
  });

  test("normalise the slug when leaving the field", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    const slug = settings(page).getByLabel("Address (slug)");
    await slug.fill("O Nás!");
    await expect(settings(page).getByText("Address: /o-nas/")).toBeVisible();
    await slug.press("Tab");
    await expect(slug).toHaveValue("o-nas");
  });

  test("set as home: the home marker moves and slugs stay", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    await settings(page).getByRole("button", { name: "Set as home" }).click();
    await expect(settings(page).getByText("This is the home page.")).toBeVisible();
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("kontakt");
    const contactRow = menuSection(page).getByRole("listitem").filter({ hasText: "Kontakt" });
    await expect(contactRow.getByText("Home", { exact: true })).toBeVisible();
    const homeRow = menuSection(page).getByRole("listitem").filter({ hasText: "Úvod" });
    await expect(homeRow.getByText("Home", { exact: true })).toHaveCount(0);
  });

  test("the home page can't be deleted", async ({ page }) => {
    await openEditor(page);
    const button = settings(page).getByRole("button", { name: "Delete" });
    await expect(button).toBeDisabled();
    await expect(settings(page).getByText("Set another page as home first.")).toBeVisible();
  });

  test("delete a page with links to it: home is shown and the links are problems", async ({
    page,
  }) => {
    await openEditor(page, paths().edit("page_contact"));
    await settings(page).getByRole("button", { name: "Delete" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete “Kontakt”?" });
    await expect(dialog).toContainText("2 links elsewhere in the site point to it.");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(canvas(page).locator("h1")).toHaveText("Kontakt");

    await settings(page).getByRole("button", { name: "Delete" }).click();
    await dialog.getByRole("button", { name: "Delete page" }).click();
    await expect(canvas(page).locator(".hero h1")).toHaveText("Čerstvý chléb každé ráno");
    await expect(page).toHaveURL(/\/edit\/$/);
    expect(await canvasMenu(page)).toEqual(["Úvod"]);
    // The call to action and the text link (a text link is listed, but can't be selected).
    const problems = page.getByRole("region", { name: "Problems" });
    await expect(
      problems.getByRole("listitem").filter({ hasText: "points to a page that no longer exists" }),
    ).toHaveCount(2);
  });

  test("duplicate a page", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    await settings(page).getByRole("button", { name: "Duplicate" }).click();
    await expect(canvas(page).locator("h1")).toHaveText("Kontakt (copy)");
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("kontakt-copy");
    expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt", "Kontakt (copy)"]);
  });

  test("undo from a panel field reverts the title with its slug and menu label", async ({
    page,
  }) => {
    await openEditor(page, paths().edit("page_contact"));
    const title = settings(page).getByLabel("Title");
    await title.click();
    await title.press("End");
    await title.pressSequentially("y");
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("kontakty");
    await title.press("ControlOrMeta+z");
    await expect(title).toHaveValue("Kontakt");
    await expect(settings(page).getByLabel("Address (slug)")).toHaveValue("kontakt");
    expect(await canvasMenu(page)).toEqual(["Úvod", "Kontakt"]);
    await expect(title).toBeFocused();
    await title.press("ControlOrMeta+Shift+z");
    await expect(title).toHaveValue("Kontakty");
  });

  test("clicking a slug problem opens that page and focuses its slug", async ({ page }) => {
    await openEditor(page, paths().edit("page_contact"));
    const slug = settings(page).getByLabel("Address (slug)");
    await slug.fill("uvod");
    await slug.press("Tab");
    await sidebar(page).getByRole("link", { name: "Úvod" }).click();
    await expect(canvas(page).locator(".hero h1")).toBeVisible();

    const problems = page.getByRole("region", { name: "Problems" });
    await problems.getByRole("button", { name: /have the same address "uvod"/ }).click();
    await expect(canvas(page).locator("h1")).toHaveText("Kontakt");
    await expect(settings(page).getByLabel("Address (slug)")).toBeFocused();
  });
});
