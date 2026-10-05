import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { memberships, workspaces } from "../src/lib/server/db/schema";
import { createWorkspace } from "../src/lib/server/members";
import { canvas, expect, openEditor, state, test, testDb } from "./fixtures";

const bar = (page: Page) => page.locator("header.app-bar");

test("the top bar shows the mark and the account, which holds the language", async ({ page }) => {
  await page.goto("/");
  await expect(bar(page).getByRole("link", { name: "Webmio, your projects" })).toBeVisible();
  // Two controls only: no language buttons of their own.
  await expect(bar(page).getByRole("button")).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  await bar(page).getByRole("button", { name: "Account: jana@example.cz" }).click();
  const languages = page
    .getByRole("menu", { name: "Account" })
    .getByRole("group", { name: "Interface language" });
  await expect(languages.getByRole("menuitemradio", { name: "English" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(languages.getByRole("menuitemradio", { name: "Čeština" })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  // Entries look clickable, like every menu's.
  await expect(languages.getByRole("menuitemradio", { name: "Čeština" })).toHaveCSS(
    "cursor",
    "pointer",
  );
});

test("Product name", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await bar(page).getByRole("button", { name: "Account: jana@example.cz" }).click();
  await page.getByRole("menuitemradio", { name: "Čeština" }).click();
  try {
    await expect(bar(page).getByRole("link", { name: "Webmio, vaše projekty" })).toBeVisible();
    await expect(page).toHaveTitle("Projekty – Webmio");
  } finally {
    // The language is stored on the account; later tests expect English.
    await bar(page)
      .getByRole("button", { name: /^Účet: / })
      .click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(bar(page).getByRole("link", { name: "Webmio, your projects" })).toBeVisible();
  }
});

test("switch workspace from the top bar", async ({ page }) => {
  const { owner, workspaceId } = state();
  const second = createWorkspace(testDb(), "Studio Kolín", owner.id);
  try {
    await page.goto(`/w/${workspaceId}/members`);
    // The bar's menus work once its script has taken over.
    await page.waitForLoadState("networkidle");
    const switcher = bar(page).getByRole("button", { name: /Pekárna U Lípy/ });
    await switcher.click();
    const menu = page.getByRole("menu", { name: "Switch workspace" });
    await menu.getByRole("menuitem", { name: /^Studio Kolín/ }).click();
    await expect(page).toHaveURL(new RegExp(`/\\?workspace=${second}$`));
    await expect(page.getByRole("heading", { name: "Studio Kolín" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pekárna U Lípy" })).toHaveCount(0);
    await expect(bar(page).getByRole("button", { name: /Studio Kolín/ })).toBeVisible();
  } finally {
    testDb().delete(memberships).where(eq(memberships.workspaceId, second)).run();
    testDb().delete(workspaces).where(eq(workspaces.id, second)).run();
  }
});

test.describe("signing out", () => {
  test("from the account menu ends the session", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await bar(page).getByRole("button", { name: "Account: jana@example.cz" }).click();
    await page
      .getByRole("menu", { name: "Account" })
      .getByRole("menuitem", { name: /^Sign out/ })
      .click();
    await expect(page).toHaveURL(/\/signin$/);
    await page.goto("/");
    await expect(page).toHaveURL(/\/signin/);
  });
});

test("the editor keeps its space under a compact bar, and the canvas keeps the site's look", async ({
  page,
}) => {
  await openEditor(page);
  const barBox = await bar(page).boundingBox();
  expect(barBox?.height).toBe(44);
  const toolbar = page.getByRole("toolbar", { name: "Editing" });
  expect((await toolbar.boundingBox())?.y).toBeGreaterThanOrEqual(44);
  // The canvas fills the window below the bar: the page itself doesn't need to scroll to show it.
  const editor = await page.locator(".editor").boundingBox();
  expect(Math.round((editor?.y ?? 0) + (editor?.height ?? 0))).toBeGreaterThanOrEqual(
    page.viewportSize()?.height ?? 0,
  );
  // The site's theme, not the admin's: the demo site's Georgia headings and its own primary colour.
  const heading = canvas(page).locator(".hero h1");
  await expect(heading).toHaveCSS("font-family", /Georgia/);
  await expect(canvas(page).locator(".button").first()).toHaveCSS(
    "background-color",
    "rgb(138, 75, 31)",
  );
  await expect(toolbar).toHaveCSS("font-family", /DM Sans|system-ui/);
});

test("buttons show a focus ring and are large enough for fingers on touch screens", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const { signIn } = await import("./fixtures");
  await signIn(context);
  const page = await context.newPage();
  await page.goto("/");
  const account = bar(page).getByRole("button", { name: "Account: jana@example.cz" });
  const box = await account.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await context.close();
});

test("a focused control shows the focus ring", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(bar(page).getByRole("link", { name: "Webmio, your projects" })).toBeFocused();
  await expect(bar(page).getByRole("link", { name: "Webmio, your projects" })).toHaveCSS(
    "outline-style",
    "solid",
  );
});
