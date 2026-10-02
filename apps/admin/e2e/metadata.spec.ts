import type { Page } from "@playwright/test";
import { expect, openEditor, paths, resetPublishing, test } from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const _details = (page: Page) => page.getByRole("complementary", { name: "Details" });
const pageSettings = (page: Page) => page.getByRole("region", { name: "Page", exact: true });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });

/** Chooses the demo image (`hero.png`) in the media library the button opened. */
async function chooseDemoImage(page: Page) {
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(library(page)).toBeHidden();
}

async function _save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test.beforeEach(() => resetPublishing());

test("a page's share image: choose it, remove it, undo", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await expect(pageSettings(page).getByText("No share image")).toBeVisible();
  await page.locator("#page-settings-share_image").click();
  await chooseDemoImage(page);
  const thumbnail = pageSettings(page).locator(".image-setting img");
  await expect(thumbnail).toBeVisible();
  await pageSettings(page).getByRole("button", { name: "Remove" }).click();
  await expect(thumbnail).toBeHidden();
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(thumbnail).toBeVisible();
});

test("a missing description problem leads to the page's description", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await pageSettings(page).getByLabel("Description for search engines").fill("");
  // Away from the page: the problem brings it back.
  await page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("link", { name: "Úvod" })
    .click();
  await expect(page).toHaveURL(/\/edit\/page_home\/$/);
  const problem = problems(page).getByRole("button", { name: /"Kontakt" has no description/ });
  await problem.click();
  await expect(page).toHaveURL(/\/edit\/page_contact\/$/);
  await expect(pageSettings(page).getByLabel("Description for search engines")).toBeFocused();
});
