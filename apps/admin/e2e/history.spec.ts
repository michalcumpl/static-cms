import type { Page } from "@playwright/test";
import { projectPaths } from "../src/lib/project-paths";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
import {
  canvas,
  caretAtEnd,
  connectTestWorkspace,
  expect,
  openEditor,
  paths,
  resetPublishing,
  state,
  test,
  testDb,
} from "./fixtures";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = Record<string, any>;

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const versions = (page: Page) =>
  page.getByRole("list", { name: "Saved versions" }).getByRole("listitem");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

async function confirmRestore(page: Page) {
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("status")).toContainText("Restored the version of");
}

test.beforeEach(() => resetPublishing());

test("save twice, preview the first version from the history, restore it", async ({ page }) => {
  await openEditor(page);
  const heading = canvas(page).locator(".hero h1");
  await caretAtEnd(page, heading);
  await page.keyboard.type(" A");
  await save(page);
  await caretAtEnd(page, heading);
  await page.keyboard.type("B");
  await save(page);

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(versions(page).first()).toContainText("Current");
  const first = versions(page).nth(1);
  const preview = await first.getByRole("link", { name: /Preview/ }).getAttribute("href");
  const previewHtml = await (await page.request.get(preview as string)).text();
  expect(previewHtml).toContain("<h1>Čerstvý chléb každé ráno A</h1>");
  expect(previewHtml).toContain("Version of");

  await first.getByRole("button", { name: /Restore/ }).click();
  await confirmRestore(page);
  await expect(versions(page).first()).toContainText("Restored from");
  await page.getByRole("status").getByRole("link", { name: "Open the editor" }).click();
  await expect(canvas(page).locator(".hero h1")).toHaveText("Čerstvý chléb každé ráno A");
});

test("restoring Czech brings its phone number back in English", async ({ page }) => {
  const { projectId, owner } = state();
  const original = readSite(testDb(), projectId)?.versionId as string;
  addLanguage(testDb(), projectId, "en", owner.id);
  const site = readSite(testDb(), projectId);
  const doc = structuredClone(site?.document) as Doc;
  doc.nodes.business_1.phone = "+420321123456";
  saveSite(testDb(), projectId, owner.id, doc, site?.version ?? "");

  await page.goto(paths().history);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("listitem")
    .filter({ has: page.locator(`a[href$="/history/${original}/"]`) })
    .getByRole("button", { name: /Restore/ })
    .click();
  await expect(page.getByRole("dialog")).toContainText("change for every language");
  await confirmRestore(page);

  await openEditor(page, projectPaths(projectId, "en").edit());
  await page
    .getByRole("complementary", { name: "Details" })
    .getByRole("tab", { name: "Business" })
    .click();
  await expect(page.getByLabel("Phone")).toHaveValue("");
});

test("the history marks the live and published versions", async ({ page }) => {
  await connectTestWorkspace();
  await openEditor(page);
  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type(" (new)");
  await save(page);

  await page.goto(paths().history);
  await page.waitForLoadState("networkidle");
  await expect(versions(page).first()).toContainText("Current");
  await expect(versions(page).nth(1)).toContainText("Live");
});

test("open the English history from the English editor", async ({ page }) => {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  await openEditor(page, projectPaths(projectId, "en").edit());
  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history\?lang=en$/);
  await expect(page.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
});
