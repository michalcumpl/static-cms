import type { Page } from "@playwright/test";
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
const siteSettings = (page: Page) => page.getByRole("region", { name: "Site", exact: true });
const pageSettings = (page: Page) => page.getByRole("region", { name: "Page", exact: true });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });

async function openSiteTab(page: Page) {
  await details(page).getByRole("tab", { name: "Site" }).click();
  await expect(siteSettings(page)).toBeVisible();
}

/** Chooses the demo image (`hero.png`) in the media library the button opened. */
async function chooseDemoImage(page: Page) {
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(library(page)).toBeHidden();
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test.beforeEach(() => resetPublishing());

test("rename the site in the Site tab, and undo it", async ({ page }) => {
  await openEditor(page);
  await openSiteTab(page);
  await siteSettings(page).getByLabel("Name").fill("Pekárna U Lípy Kolín");
  await expect(canvas(page).locator(".site-name")).toHaveText("Pekárna U Lípy Kolín");
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Unsaved changes");
  await toolbar(page).getByRole("button", { name: "Undo" }).click();
  await expect(canvas(page).locator(".site-name")).toHaveText("Pekárna U Lípy");
});

test("site settings reach the preview's head", async ({ page }) => {
  await openEditor(page);
  await openSiteTab(page);
  await siteSettings(page)
    .getByLabel("Description for search engines")
    .fill("Rodinná pekárna v Kolíně");
  await page.locator("#site-settings-favicon").click();
  await chooseDemoImage(page);
  await expect(siteSettings(page).locator("img.square")).toBeVisible();
  await page.locator("#site-settings-share_image").click();
  await chooseDemoImage(page);
  await siteSettings(page).getByLabel("Description of the image").fill("Pult s chlebem");
  await save(page);

  const home = await (await page.request.get(paths().preview)).text();
  expect(home).toContain('<meta property="og:title" content="Pekárna U Lípy">');
  expect(home).toContain(`<link rel="icon" href="${paths().preview}favicon.ico" sizes="32x32">`);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toContain('<meta property="og:title" content="Kontakt">');
  const icon = await page.request.get(`${paths().preview}favicon.ico`);
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toBe("image/x-icon");
});

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
  // Away from the page, with the Site tab open: the problem brings both back.
  await page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("link", { name: "Úvod" })
    .click();
  await expect(page).toHaveURL(/\/edit\/page_home\/$/);
  await openSiteTab(page);
  const problem = problems(page).getByRole("button", { name: /"Kontakt" has no description/ });
  await problem.click();
  await expect(page).toHaveURL(/\/edit\/page_contact\/$/);
  await expect(pageSettings(page).getByLabel("Description for search engines")).toBeFocused();
});

/** A file of the project's live site on the fake Netlify. */
async function liveFile(path: string): Promise<string> {
  const { projectHosting } = await import("../src/lib/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const hosting = testDb()
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, state().projectId))
    .get();
  if (!hosting) return "";
  return (await fetch(`${fakeNetlify()}/sites/${hosting.siteName}${path}`)).text();
}

test("switch off AI training and publish: robots.txt, 404 page and structured data", async ({
  page,
}) => {
  await connectTestWorkspace();
  await openEditor(page);
  await openSiteTab(page);
  await siteSettings(page).getByLabel("AI training").uncheck();
  await save(page);
  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });

  const robots = await liveFile("/robots.txt");
  expect(robots).toContain("User-agent: GPTBot");
  expect(robots).not.toContain("User-agent: OAI-SearchBot");
  expect(robots).toMatch(/Sitemap: https:\/\/sc-[^/]+\.netlify\.app\/sitemap\.xml/);
  expect(await liveFile("/404.html")).toContain("Stránka nenalezena");
  expect(await liveFile("/")).toMatch(
    /<script type="application\/ld\+json">.*"url":"https:\/\/sc-[^"]+\.netlify\.app\/"/,
  );
});
