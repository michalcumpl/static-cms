import type { Page } from "@playwright/test";
import { bakeryPort, spaPort } from "../playwright.config";
import { expect, paths, state, test } from "./fixtures";

// Starting from your current website (site-import): the New project page, the import's progress,
// its review, and the Overview's link to it. The fixture sites run on local ports.

const newProject = () => `/w/${state().workspaceId}/new`;
const importForm = (page: Page) =>
  page.getByRole("form", { name: "Start from your current website" });

async function startImport(page: Page, address: string, confirm = true) {
  await page.goto(newProject());
  await importForm(page).getByLabel("Your website's address").fill(address);
  if (confirm) await importForm(page).getByRole("checkbox").check();
  await importForm(page).getByRole("button", { name: "Import website" }).click();
}

test("New project: start empty", async ({ page }) => {
  await page.goto(newProject());
  const form = page.getByRole("form", { name: "Start empty" });
  await form.getByLabel("Name").fill("Kadeřnictví Eva");
  await form.getByRole("button", { name: "Create project" }).click();
  await expect(page).toHaveURL(/\/p\/p_[\w-]+\/edit\/$/);
});

test("No confirmation: nothing starts", async ({ page }) => {
  await startImport(page, "pekarna-ulipy.cz", false);
  await expect(importForm(page).getByRole("alert")).toHaveText(
    "Confirm that you may use this website's content.",
  );
  await expect(page).toHaveURL(new RegExp(`${newProject()}`));
});

test("Not a web address: refused", async ({ page }) => {
  await startImport(page, "ftp://pekarna-ulipy.cz");
  await expect(importForm(page).getByRole("alert")).toHaveText(
    "Only public web addresses can be imported, such as pekarna.cz.",
  );
});

test("Import the bakery: progress, then the review, then done reviewing", async ({ page }) => {
  await startImport(page, `http://127.0.0.1:${bakeryPort}/`);
  await expect(page).toHaveURL(/\/imports\/im_/);
  // Leaving and coming back picks the import up again.
  const progress = page.url();
  await page.goto("/");
  await page.goto(progress);

  await expect(page).toHaveURL(/\/p\/p_[\w-]+\/import$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Import review" })).toBeVisible();
  await expect(page.getByText("5 pages", { exact: true })).toBeVisible();
  const table = page.getByRole("table", { name: "Pages, with their old and new addresses" });
  await expect(
    table.getByRole("row", { name: /Kontakt \/kontakt\.html \/kontakt\// }),
  ).toBeVisible();
  await expect(
    page.getByText("A form; the site has email and phone buttons instead."),
  ).toBeVisible();
  await expect(
    page.getByText("The email address was hidden by an anti-spam script; enter it in Business."),
  ).toBeVisible();
  // Images without a description are what's left to do, each leading to its place.
  const todo = page.getByRole("region", { name: "Before you publish" });
  await expect(todo.getByRole("link").first()).toHaveAttribute("href", /\/edit\//);

  const review = page.url();
  const dashboard = review.replace(/import$/, "");
  await page.goto(dashboard);
  await expect(page.getByRole("link", { name: "Import review" })).toBeVisible();
  await page.goto(review);
  await page.getByRole("button", { name: "Done reviewing" }).click();
  await expect(page).toHaveURL(new RegExp(`^${dashboard.replace(/\/$/, "")}/?$`));
  await expect(page.getByRole("link", { name: "Import review" })).toHaveCount(0);
});

test("Built in the browser: the import fails with a message", async ({ page }) => {
  await startImport(page, `http://127.0.0.1:${spaPort}/`);
  await expect(
    page.getByText(
      "This website builds its pages in the browser with JavaScript; we can't read it yet.",
    ),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("link", { name: "Back to New project" }).click();
  await expect(page).toHaveURL(new RegExp(newProject()));
});

test("A project not made by an import has no review link", async ({ page }) => {
  await page.goto(paths().dashboard);
  await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Import review" })).toHaveCount(0);
});
