import type { Browser, BrowserContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { users } from "../src/lib/server/db/schema";
import { demoSite } from "../src/lib/server/demo";
import { createWorkspace } from "../src/lib/server/members";
import { createProject } from "../src/lib/server/site-documents";
import { expect, paths, signIn, state, test, testDb } from "./fixtures";

// The interface language (admin-foundation, specs/admin-interface "Interface language"): a
// browser that prefers Czech gets Czech; the switch changes it at once and the account keeps it.

test.use({ locale: "cs-CZ" });

/** The language links under the sign-in form. */
const languageLinks = (page: Page, label: "Jazyk rozhraní" | "Interface language") =>
  page.getByRole("navigation", { name: label });

/** Forgets a language stored on an account, so the browser's preference counts again. */
const forgetLanguage = (userId: string) =>
  testDb().update(users).set({ uiLanguage: null }).where(eq(users.id, userId)).run();

async function czechContext(browser: Browser, user?: { id: string; email: string }) {
  const context = await browser.newContext({ locale: "cs-CZ" });
  if (user) await signIn(context, user);
  return context;
}

test.describe("before signing in", () => {
  test.use({ anonymous: true });

  test("Czech browser, first visit", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
    await expect(page.getByRole("heading", { name: "Přihlášení" })).toBeVisible();
    await expect(page.getByLabel("E-mailová adresa")).toBeVisible();
  });

  test("switching to English and back applies at once and is remembered", async ({ page }) => {
    await page.goto("/signin");
    await page.waitForLoadState("networkidle");
    await languageLinks(page, "Jazyk rozhraní").getByRole("button", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await page.reload();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.waitForLoadState("networkidle");
    await languageLinks(page, "Interface language")
      .getByRole("button", { name: "Čeština" })
      .click();
    await expect(page.getByRole("heading", { name: "Přihlášení" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "cs");
  });
});

test.describe("signed in", () => {
  test.use({ anonymous: true });
  const contexts: BrowserContext[] = [];
  test.afterEach(async () => {
    for (const context of contexts.splice(0)) await context.close();
    forgetLanguage(state().outsider.id);
  });

  test("the choice follows the person to another device", async ({ browser }) => {
    const { outsider } = state();
    forgetLanguage(outsider.id);
    const laptop = await czechContext(browser, outsider);
    contexts.push(laptop);
    const page = await laptop.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Projekty" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: `Účet: ${outsider.email}` }).click();
    const menu = page.getByRole("menu", { name: "Účet" });
    await expect(menu.getByRole("menuitemradio", { name: "Čeština" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    // Opened with the mouse, the current language has focus and nothing else looks chosen.
    await expect(menu.getByRole("menuitemradio", { name: "Čeština" })).toBeFocused();
    await expect(menu.getByRole("menuitemradio", { name: "English" })).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
    await menu.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // A phone whose browser prefers Czech, signed in as the same person: English.
    const phone = await czechContext(browser, outsider);
    contexts.push(phone);
    const other = await phone.newPage();
    await other.goto("/");
    await expect(other.getByRole("heading", { name: "Projects" })).toBeVisible();
    await expect(other.locator("html")).toHaveAttribute("lang", "en");
  });

  test("counts websites with Czech plural forms", async ({ browser }) => {
    const { outsider } = state();
    forgetLanguage(outsider.id);
    const db = testDb();
    const workspaceId = createWorkspace(db, "Studio Kolín", outsider.id);
    const add = (count: number) => {
      for (let i = 0; i < count; i++) {
        createProject(db, workspaceId, `Web ${i + 1}`, demoSite(), outsider.id);
      }
    };
    const context = await czechContext(browser, outsider);
    contexts.push(context);
    const page = await context.newPage();

    add(1);
    await page.goto("/");
    await expect(page.getByText("1 web", { exact: true })).toBeVisible();
    add(2);
    await page.goto("/");
    await expect(page.getByText("3 weby", { exact: true })).toBeVisible();
    add(2);
    await page.goto("/");
    await expect(page.getByText("5 webů", { exact: true })).toBeVisible();
  });

  test("History lists dates in the Czech format", async ({ browser }) => {
    const { owner } = state();
    forgetLanguage(owner.id);
    const context = await czechContext(browser, owner);
    contexts.push(context);
    const page = await context.newPage();
    await page.goto(paths().versionsPage);
    const versions = page.getByRole("list", { name: "Uložené verze" });
    await expect(versions).toContainText(/\d{1,2}\. \d{1,2}\. \d{4} \d{1,2}:\d{2}/);
  });
});
