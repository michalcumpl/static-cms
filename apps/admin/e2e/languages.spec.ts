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
  caretAtEnd,
  connectTestWorkspace,
  expect,
  fakeNetlify,
  openEditor,
  openSettings,
  paths,
  resetPublishing,
  saveSettings,
  state,
  test,
  testDb,
} from "./fixtures";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = Record<string, any>;

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const languagesSection = (page: Page) => page.getByRole("region", { name: "Languages" });
const _details = (page: Page) => page.getByRole("complementary", { name: "Details" });
const english = () => projectPaths(state().projectId, "en");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

/** Adds English straight to the database (the project page is tested separately). */
function addEnglish(published = false, change?: (doc: Doc) => void) {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  setLanguagePublished(testDb(), projectId, "en", published);
  if (!change) return;
  const site = readSite(testDb(), projectId, "en");
  if (!site) throw new Error("no English");
  const doc = structuredClone(site.document) as Doc;
  change(doc);
  const result = saveSite(testDb(), projectId, owner.id, doc, site.version, "en");
  if (!result.ok) throw new Error("could not save English");
}

/** The current document of a language (the primary without one). */
function documentOf(lang?: string): Doc {
  const site = readSite(testDb(), state().projectId, lang);
  if (!site) throw new Error(`no ${lang ?? "primary"} document`);
  return site.document as Doc;
}

test.beforeEach(() => resetPublishing());

test("add English on the Languages tab, edit it, publish, hide and remove it", async ({ page }) => {
  await page.goto(paths().languagesTab);
  // The section's script must have taken over before choosing.
  await page.waitForLoadState("networkidle");
  await languagesSection(page).getByLabel("Add a language").selectOption({ label: "English" });
  await languagesSection(page).getByRole("button", { name: "Add" }).click();
  const row = languagesSection(page).getByRole("listitem").filter({ hasText: "English" });
  await expect(row).toContainText("Hidden");

  await row.getByRole("link", { name: "Edit English" }).click();
  await expect(page).toHaveURL(/\/edit\/\?lang=en$/);
  await expect(canvas(page).locator("[contenteditable=true]")).toBeVisible();
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type(" (EN)");
  await save(page);
  const saved = documentOf("en");
  expect(saved.nodes.hero_1.heading.content).toBe("Čerstvý chléb každé ráno (EN)");
  expect(documentOf().nodes.hero_1.heading.content).toBe("Čerstvý chléb každé ráno");

  await page.goto(paths().languagesTab);
  // As above: the buttons only work once the section's script has taken over.
  await page.waitForLoadState("networkidle");
  await row.getByRole("button", { name: "Publish English" }).click();
  await expect(row).toContainText("Published");
  await row.getByRole("button", { name: "Hide English" }).click();
  await expect(row).toContainText("Hidden");
  await row.getByRole("button", { name: "Remove English" }).click();
  await page
    .getByRole("dialog", { name: "Remove English?" })
    .getByRole("button", { name: "Remove English" })
    .click();
  await expect(row).toHaveCount(0);
});

test("switch to Čeština on the same page", async ({ page }) => {
  addEnglish(false, (doc) => {
    doc.nodes.page_contact.title = "Contact";
  });
  await openEditor(page, english().edit("page_contact"));
  await expect(canvas(page).locator("h1")).toHaveText("Contact");
  await page.getByLabel("Language", { exact: true }).selectOption({ label: "Čeština" });
  await expect(page).toHaveURL(/\/edit\/page_contact\/$/);
  await expect(canvas(page).locator("h1")).toHaveText("Kontakt");
});

test("shared fields are edited in Čeština and read-only in English", async ({ page }) => {
  addEnglish();
  await openSettings(page);
  const phone = page.getByLabel("Phone");
  await phone.fill("321 123 456");
  await phone.press("Tab");
  await saveSettings(page);

  await openSettings(page, "en");
  await expect(page.getByLabel("Phone")).toHaveValue("+420 321 123 456");
  await expect(page.getByLabel("Phone")).toBeDisabled();
  await expect(page.getByText("Edited in Čeština").first()).toBeVisible();
  await expect(page.getByLabel("Note on the opening hours")).toBeEnabled();
  await expect(page.getByLabel("Name", { exact: true }).first()).toBeEnabled();
});

test("the preview shows hidden English under en/", async ({ page }) => {
  addEnglish(false, (doc) => {
    doc.nodes.page_contact.slug = "contact";
  });
  const response = await page.request.get(`${paths().preview}en/contact/`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<html lang="en">');
  // Shared files are linked at the site's root, where they are, not under en/.
  const stylesheet = /<link rel="stylesheet" href="([^"]+)">/.exec(html)?.[1] ?? "";
  expect(stylesheet).toBe(`${paths().preview}assets/style.css`);
  expect((await page.request.get(stylesheet)).status()).toBe(200);
  const home = await (await page.request.get(`${paths().preview}en/`)).text();
  const image = /src="([^"]+\.webp)"/.exec(home)?.[1];
  expect(image).toBe(`${paths().preview}assets/images/hero.png-320.webp`);
  expect((await page.request.get(image as string)).status()).toBe(200);
});

/** A file of the project's live site on the fake Netlify. */
async function liveFile(
  path: string,
): Promise<{ status: number; text: string; location: string | null }> {
  const { projectHosting } = await import("../src/lib/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const hosting = testDb()
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, state().projectId))
    .get();
  const response = await fetch(`${fakeNetlify()}/sites/${hosting?.siteName}${path}`, {
    redirect: "manual",
  });
  return {
    status: response.status,
    text: await response.text(),
    location: response.headers.get("location"),
  };
}

test("publish Czech and English: alternates, switcher, sitemap and redirects", async ({ page }) => {
  await connectTestWorkspace();
  addEnglish(true, (doc) => {
    doc.nodes.page_contact.title = "Contact";
  });
  await openEditor(page);
  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });

  const czech = await liveFile("/kontakt/");
  expect(czech.text).toMatch(
    /<link rel="alternate" hreflang="en" href="https:\/\/[^"]+\/en\/kontakt\/">/,
  );
  expect(czech.text).toContain('<a href="/en/kontakt/" lang="en" hreflang="en">English</a>');
  const sitemap = await liveFile("/sitemap.xml");
  expect(sitemap.text).toMatch(/<loc>https:\/\/[^<]+\/en\/kontakt\/<\/loc>/);

  // Rename the English page's address and publish again: the old one redirects.
  const { projectId, owner } = state();
  const site = readSite(testDb(), projectId, "en");
  const doc = structuredClone(site?.document) as Doc;
  doc.nodes.page_contact.slug = "contact";
  saveSite(testDb(), projectId, owner.id, doc, site?.version ?? "", "en");
  await page.reload();
  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect
    .poll(async () => (await liveFile("/en/kontakt/")).status, { timeout: 15_000 })
    .toBe(301);
  expect((await liveFile("/en/kontakt/")).location).toBe("/en/contact/");
});
