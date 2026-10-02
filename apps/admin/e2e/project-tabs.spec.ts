import type { Page } from "@playwright/test";
import { projectPaths } from "../src/lib/project-paths";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
import {
  connectTestWorkspace,
  expect,
  paths,
  resetPublishing,
  signIn,
  state,
  test,
  testDb,
} from "./fixtures";

// The project's page as tabs (project-tabs, specs/project-page).

test.beforeEach(() => resetPublishing());

const tabs = (page: Page) => page.getByRole("navigation", { name: "Project sections" });

/** Breaks the saved site: a page without a slug is an error. */
function breakSite() {
  const { projectId, owner } = state();
  const site = readSite(testDb(), projectId);
  if (!site) throw new Error("no document");
  const doc = structuredClone(site.document) as { nodes: Record<string, { slug?: string }> };
  const contact = doc.nodes.page_contact;
  if (contact) contact.slug = "";
  const result = saveSite(testDb(), projectId, owner.id, doc, site.version);
  if (!result.ok) throw new Error("could not save");
}

test("a tab has its own address, the header and the current tab marked", async ({ page }) => {
  await page.goto(paths().pagesTab);
  await expect(page).toHaveURL(paths().pagesTab);
  await expect(page.getByRole("heading", { name: "Pekárna U Lípy", level: 1 })).toBeVisible();
  await expect(tabs(page).getByRole("link", { name: "Pages" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs(page).getByRole("link", { name: "Overview" })).not.toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const tab of ["Overview", "Pages", "Languages", "Publishing", "History", "Settings"]) {
    await expect(tabs(page).getByRole("link", { name: tab })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Preview" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the editor" })).toBeVisible();
});

test.describe("someone else's project", () => {
  test.use({ anonymous: true });

  test("every tab is not found for a non-member", async ({ page, context }) => {
    await signIn(context, state().outsider);
    for (const address of [
      paths().overview,
      paths().pagesTab,
      paths().languagesTab,
      paths().publishing,
      paths().history,
    ]) {
      expect((await page.goto(address))?.status()).toBe(404);
    }
  });
});

test("the language chosen on one tab stays on the next", async ({ page }) => {
  addLanguage(testDb(), state().projectId, "en", state().owner.id);
  await page.goto(paths().pagesTab);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Language", { exact: true }).selectOption({ label: "English" });
  await expect(page).toHaveURL(projectPaths(state().projectId, "en").pagesTab);
  await tabs(page).getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(projectPaths(state().projectId, "en").history);
  await expect(page.getByText("Every save of English is kept")).toBeVisible();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
});

test.describe("Overview", () => {
  test("shows an address after publishing, and that the site is valid", async ({ page }) => {
    await connectTestWorkspace();
    await page.goto(paths().overview);
    await page.waitForLoadState("networkidle");
    const site = page.getByRole("region", { name: "Your website" });
    await expect(site.getByText("Not published yet")).toBeVisible();
    await site.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(site.getByRole("link", { name: /netlify\.app/ }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(site.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Validation" })).toContainText("Valid");
    await expect(site).toContainText("Last saved");
  });

  test("lists the errors of the saved site and disables Publish", async ({ page }) => {
    await connectTestWorkspace();
    breakSite();
    await page.goto(paths().overview);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("region", { name: "Validation" })).toContainText("1 error");
    await expect(
      page.getByRole("region", { name: "Your website" }).getByRole("button", {
        name: "Publish",
        exact: true,
      }),
    ).toBeDisabled();
  });

  test("says when the project was never published", async ({ page }) => {
    await page.goto(paths().overview);
    await expect(page.getByText("Not published yet")).toBeVisible();
    await expect(page.getByRole("region", { name: "Languages" })).toContainText("Čeština");
  });
});

test.describe("Pages tab", () => {
  test("lists the pages in order, with home and the menu", async ({ page }) => {
    await page.goto(paths().pagesTab);
    const rows = page.getByRole("region", { name: "Pages of Čeština" }).getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Úvod");
    await expect(rows.nth(0)).toContainText("Home");
    await expect(rows.nth(0)).toContainText("In the menu");
    await expect(rows.nth(1)).toContainText("Kontakt");
    await expect(rows.nth(1)).toContainText("/kontakt/");
  });

  test("opens a page in the editor", async ({ page }) => {
    await page.goto(paths().pagesTab);
    await page.getByRole("link", { name: "Edit Kontakt" }).click();
    await expect(page).toHaveURL(/\/edit\/page_contact\/$/);
  });

  test("previews a page", async ({ page }) => {
    await page.goto(paths().pagesTab);
    await expect(page.getByRole("link", { name: "Preview Kontakt" })).toHaveAttribute(
      "href",
      `${paths().preview}kontakt/`,
    );
  });

  test("marks the pages not translated yet", async ({ page }) => {
    addLanguage(testDb(), state().projectId, "en", state().owner.id);
    await page.goto(projectPaths(state().projectId, "en").pagesTab);
    const row = page
      .getByRole("region", { name: "Pages of English" })
      .getByRole("listitem")
      .filter({ hasText: "Kontakt" });
    await expect(row).toContainText("not translated yet");
    await expect(row).toContainText("/en/kontakt/");
  });
});

test.describe("Publishing tab", () => {
  test("downloads the published languages as a ZIP", async ({ page }) => {
    await page.goto(paths().publishing);
    await page.waitForLoadState("networkidle");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download ZIP" }).click();
    expect((await downloading).suggestedFilename()).toBe("website.zip");
  });

  test("refuses the download while the saved site has errors", async ({ page }) => {
    breakSite();
    await page.goto(paths().publishing);
    await expect(page.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Export" })).toContainText(
      "Fix the problems first",
    );
  });
});
