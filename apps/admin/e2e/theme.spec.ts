import type { Page } from "@playwright/test";
import { projectPaths } from "../src/lib/project-paths";
import {
  addLanguage,
  readSite,
  saveSite,
  setLanguagePublished,
} from "../src/lib/server/site-documents";
import {
  canvas,
  connectTestWorkspace,
  expect,
  fakeNetlify,
  openEditor,
  paths,
  resetPublishing,
  state,
  test,
  testDb,
} from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const details = (page: Page) => page.getByRole("complementary", { name: "Details" });
const themeTab = (page: Page) => page.getByRole("region", { name: "Theme", exact: true });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });

async function openThemeTab(page: Page) {
  await details(page).getByRole("tab", { name: "Theme" }).click();
  await expect(themeTab(page)).toBeVisible();
}

/** A custom property of the canvas's theme, as the browser computes it. */
const canvasVar = (page: Page, name: string) =>
  canvas(page).evaluate((element, property) => {
    return getComputedStyle(element).getPropertyValue(property).trim();
  }, name);

test.beforeEach(() => resetPublishing());

/** A file of the published site, from the fake Netlify. */
async function liveFile(path: string): Promise<{ status: number; text: string }> {
  const { projectHosting } = await import("../src/lib/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const hosting = testDb()
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, state().projectId))
    .get();
  const response = await fetch(`${fakeNetlify()}/sites/${hosting?.siteName}${path}`);
  return { status: response.status, text: await response.text() };
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("apply a preset, keeping the content width, and undo it", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  await themeTab(page).getByRole("radio", { name: "Wide" }).check();
  const bakery = themeTab(page).getByRole("button", { name: /^Bakery/ });
  await bakery.click();
  await expect(bakery).toHaveAttribute("aria-pressed", "true");
  await expect(
    themeTab(page).getByLabel("Primary (links and buttons)", { exact: true }),
  ).toHaveValue("#8a3b12");
  await expect(
    themeTab(page)
      .getByRole("group", { name: "Heading font" })
      .getByRole("radio", { name: /^Lora/ }),
  ).toBeChecked();
  await expect(themeTab(page).getByRole("radio", { name: "Wide" })).toBeChecked();
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#8a3b12");
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(bakery).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#8a4b1f");
  await expect(themeTab(page).getByRole("radio", { name: "Wide" })).toBeChecked();
});

test("a typed colour restyles the canvas once it is complete, and undo turns it back", async ({
  page,
}) => {
  await openEditor(page);
  await openThemeTab(page);
  const primary = themeTab(page).getByLabel("Primary (links and buttons)", { exact: true });
  await primary.fill("#8b");
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#8a4b1f");
  await primary.fill("#8b2f2f");
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#8b2f2f");
  const button = canvas(page).locator(".button").first();
  await expect(button).toHaveCSS("background-color", "rgb(139, 47, 47)");
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#8a4b1f");
});

test("a chosen heading font shows on the canvas", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  await themeTab(page)
    .getByRole("group", { name: "Heading font" })
    .getByRole("radio", { name: /^Lora/ })
    .check();
  const heading = canvas(page).locator("h1").first();
  await expect(heading).toHaveCSS("font-family", /^"?Lora"?, Georgia/);
  await expect.poll(() => page.evaluate(() => document.fonts.check('700 1rem "Lora"'))).toBe(true);
});

test("a colour with too little contrast is shown, measured and reported", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  await themeTab(page).getByLabel("Background", { exact: true }).fill("#ffffff");
  await themeTab(page).getByLabel("Primary (links and buttons)", { exact: true }).fill("#7fb2e5");
  const pair = themeTab(page)
    .getByRole("listitem")
    .filter({ has: page.getByText("Links and buttons", { exact: true }) });
  await expect(pair).toContainText("2.23:1 · Too low");
  await expect.poll(() => canvasVar(page, "--color-primary")).toBe("#7fb2e5");
  await expect(
    problems(page).getByRole("button", { name: /Links and buttons: contrast 2\.23:1/ }),
  ).toBeVisible();
});

test("a contrast problem opens the Theme tab at its colour", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  await themeTab(page).getByLabel("Secondary (panels and lines)", { exact: true }).fill("#3b3b3b");
  await details(page).getByRole("tab", { name: "Page" }).click();
  await problems(page)
    .getByRole("button", { name: /Text on panels: contrast/ })
    .click();
  await expect(themeTab(page).getByLabel("Text", { exact: true })).toBeFocused();
});

test("choose a logo, hide the name, and both reach the preview", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  const showName = themeTab(page).getByLabel("Show the site name next to the logo");
  await expect(showName).toBeDisabled();
  await page.locator("#theme-settings-logo").click();
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(library(page)).toBeHidden();
  await expect(canvas(page).locator(".site-name img.site-logo")).toBeVisible();
  await expect(canvas(page).locator(".site-name")).toContainText("Pekárna U Lípy");
  await expect(showName).toBeChecked();

  await showName.uncheck();
  await expect(canvas(page).locator(".site-name")).not.toContainText("Pekárna U Lípy");
  await expect(canvas(page).locator(".site-name img")).toHaveAttribute("alt", "Pekárna U Lípy");
  await save(page);

  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toMatch(
    /<a class="site-name" href="[^"]+"><img class="site-logo" [^>]*alt="Pekárna U Lípy"[^>]*><\/a>/,
  );
});

test("every control of the Theme tab has a name", async ({ page }) => {
  await openEditor(page);
  await openThemeTab(page);
  const controls = themeTab(page).locator("input, button, select, textarea");
  const count = await controls.count();
  expect(count).toBeGreaterThan(20);
  for (let i = 0; i < count; i++) {
    const name = await controls.nth(i).evaluate((element) => {
      const input = element as HTMLInputElement;
      const label = input.labels?.[0]?.textContent ?? "";
      return (
        (element.getAttribute("aria-label") ?? label ?? element.textContent ?? "").trim() ||
        (element.textContent ?? "").trim()
      );
    });
    expect(name, `control ${i}`).not.toBe("");
  }
  for (const group of ["Start from a preset", "Colours", "Heading font", "Body font", "Corners"]) {
    await expect(themeTab(page).getByRole("group", { name: group })).toBeVisible();
  }
});

test("the Theme tab is read-only in English", async ({ page }) => {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  await openEditor(page, projectPaths(projectId, "en").edit());
  await openThemeTab(page);
  await expect(themeTab(page).getByText("Edited in Čeština")).toBeVisible();
  await expect(themeTab(page).getByRole("button", { name: /^Bakery/ })).toBeDisabled();
  await expect(
    themeTab(page).getByLabel("Primary (links and buttons)", { exact: true }),
  ).toBeDisabled();
  await expect(themeTab(page).getByRole("radio", { name: /^Lora/ }).first()).toBeDisabled();
  await expect(themeTab(page).getByRole("radio", { name: "Wide" })).toBeDisabled();
  await expect(page.locator("#theme-settings-logo")).toBeDisabled();
  const link = themeTab(page).getByRole("link", { name: "Edit in Čeština" });
  await expect(link).toHaveAttribute("href", /edit\/\?tab=theme/);
});

test("publish a branded site in two languages: preset, Lora headings, logo alone", async ({
  page,
}) => {
  await connectTestWorkspace();
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  setLanguagePublished(testDb(), projectId, "en", true);
  const english = readSite(testDb(), projectId, "en");
  const doc = structuredClone(english?.document) as { nodes: Record<string, { name?: string }> };
  doc.nodes.site_1 = { ...doc.nodes.site_1, name: "U Lípy Bakery" };
  saveSite(testDb(), projectId, owner.id, doc, english?.version ?? "", "en");

  await openEditor(page);
  await openThemeTab(page);
  await themeTab(page)
    .getByRole("button", { name: /^Garden/ })
    .click();
  await themeTab(page)
    .getByRole("group", { name: "Heading font" })
    .getByRole("radio", { name: /^Lora/ })
    .check();
  await page.locator("#theme-settings-logo").click();
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await themeTab(page).getByLabel("Show the site name next to the logo").uncheck();
  await toolbar(page).getByRole("button", { name: "Save and publish" }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });

  for (const file of ["lora-latin-normal.woff2", "lora-latin-ext-normal.woff2", "lora-OFL.txt"]) {
    expect((await liveFile(`/assets/fonts/${file}`)).status, file).toBe(200);
  }
  // Garden's body font, Source Sans 3, ships upright and italic.
  expect((await liveFile("/assets/fonts/source-sans-latin-italic.woff2")).status).toBe(200);
  const css = (await liveFile("/assets/style.css")).text;
  expect(css).toContain("--color-primary: #2f5d3a;");
  expect(css).toContain(`--font-heading: "Lora", Georgia, 'Times New Roman', serif;`);

  const czech = (await liveFile("/")).text;
  expect(czech).toMatch(
    /<a class="site-name" href="\/"><img class="site-logo" [^>]*alt="Pekárna U Lípy"[^>]*><\/a>/,
  );
  const englishHome = (await liveFile("/en/")).text;
  expect(englishHome).toMatch(
    /<a class="site-name" href="\/en\/"><img class="site-logo" [^>]*alt="U Lípy Bakery"[^>]*><\/a>/,
  );
});
