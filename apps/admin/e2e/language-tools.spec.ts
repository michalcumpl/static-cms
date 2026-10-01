import type { Page } from "@playwright/test";
import { projectPaths } from "../src/lib/project-paths";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
import { canvas, expect, openEditor, paths, state, test, testDb } from "./fixtures";

// biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
type Doc = Record<string, any>;

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const pageSettings = (page: Page) => page.getByRole("region", { name: "Page", exact: true });
const otherLanguages = (page: Page) => page.getByRole("region", { name: "In other languages" });
const english = () => projectPaths(state().projectId, "en");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

/** Changes a language's saved document (the primary without `lang`). */
function edit(lang: string | undefined, change: (doc: Doc) => void) {
  const { projectId, owner } = state();
  const site = readSite(testDb(), projectId, lang);
  if (!site) throw new Error("no document");
  const doc = structuredClone(site.document) as Doc;
  change(doc);
  const result = saveSite(testDb(), projectId, owner.id, doc, site.version, lang);
  if (!result.ok) throw new Error("could not save");
}

/** A page with one empty text block, added to a document (not to its menu). */
function addPage(doc: Doc, id: string, title: string, slug: string) {
  doc.nodes[`${id}_text`] = {
    id: `${id}_text`,
    type: "rich_text",
    body: { nodes: [`${id}_p`], marks: [], annotations: [] },
  };
  doc.nodes[`${id}_p`] = {
    id: `${id}_p`,
    type: "paragraph",
    content: { content: title, marks: [], annotations: [] },
  };
  doc.nodes[id] = {
    id,
    type: "page",
    title,
    slug,
    seo_description: title,
    translation_key: id,
    share_image: { nodes: [], marks: [], annotations: [] },
    blocks: { nodes: [`${id}_text`], marks: [], annotations: [] },
  };
  doc.nodes.site_1.pages.nodes.push(id);
}

/** English as a copy, then "Ceník" added to Czech only. */
function englishWithoutCenik() {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  edit(undefined, (doc) => addPage(doc, "page_cenik", "Ceník", "cenik"));
}

test("copy a page from the editor into English, and open it", async ({ page }) => {
  englishWithoutCenik();
  await openEditor(page, paths().edit("page_cenik"));
  const englishRow = otherLanguages(page).getByRole("listitem").filter({ hasText: "English" });
  await expect(englishRow).toContainText("Not translated");
  await englishRow.getByRole("button", { name: "Copy here (English)" }).click();
  await expect(otherLanguages(page).getByRole("status")).toHaveText("Copied to English.");
  await englishRow.getByRole("link", { name: "Ceník (open in English)" }).click();
  await expect(page).toHaveURL(/\?lang=en$/);
  await expect(canvas(page).locator("h1")).toHaveText("Ceník");
});

test("an unsaved page must be saved before copying", async ({ page }) => {
  englishWithoutCenik();
  await openEditor(page, paths().edit("page_cenik"));
  await pageSettings(page).getByLabel("Title").fill("Ceník služeb");
  await otherLanguages(page).getByRole("button", { name: "Copy here (English)" }).click();
  await expect(otherLanguages(page).getByRole("status")).toContainText("Save first");
  const englishDoc = readSite(testDb(), state().projectId, "en")?.document as Doc;
  const titles = Object.values(englishDoc.nodes as Record<string, Doc>).map((n) => n.title);
  expect(titles.some((title) => String(title).startsWith("Ceník"))).toBe(false);
});

test("link a page built in English to its Czech counterpart, and unlink it", async ({ page }) => {
  const { projectId, owner } = state();
  edit(undefined, (doc) => addPage(doc, "page_about", "O nás", "o-nas"));
  addLanguage(testDb(), projectId, "en", owner.id);
  edit("en", (doc) => {
    // English has its own page instead of the copy of "O nás".
    doc.nodes.site_1.pages.nodes = doc.nodes.site_1.pages.nodes.filter(
      (id: string) => id !== "page_about",
    );
    for (const id of ["page_about", "page_about_text", "page_about_p"]) delete doc.nodes[id];
    addPage(doc, "page_story", "Our story", "our-story");
  });

  await openEditor(page, english().edit("page_story"));
  await otherLanguages(page)
    .getByLabel("Link to a page in Čeština")
    .selectOption({ label: "O nás" });
  await otherLanguages(page).getByRole("button", { name: "Link to Čeština" }).click();
  await expect(
    otherLanguages(page).getByRole("link", { name: "O nás (open in Čeština)" }),
  ).toBeVisible();
  await save(page);
  const czech = await (await page.request.get(`${paths().preview}o-nas/`)).text();
  expect(czech).toContain(
    `<link rel="alternate" hreflang="en" href="${paths().preview}en/our-story/">`,
  );

  await otherLanguages(page).getByRole("button", { name: "Unlink from other languages" }).click();
  await save(page);
  const after = await (await page.request.get(`${paths().preview}o-nas/`)).text();
  expect(after).not.toContain('rel="alternate" hreflang="en"');
});

test("the project page lists what English still needs", async ({ page }) => {
  englishWithoutCenik();
  edit("en", (doc) => {
    doc.nodes.page_home.title = "Home";
  });
  await page.goto(paths().overview);
  const row = page
    .getByRole("region", { name: "Languages" })
    .getByRole("listitem")
    .filter({
      hasText: "English",
    })
    .first();
  await expect(row.getByRole("link", { name: "Kontakt" })).toHaveAttribute(
    "href",
    english().edit("page_contact"),
  );
  await expect(row).toContainText("not translated yet");
  await expect(row.getByRole("link", { name: "Ceník" })).toHaveAttribute(
    "href",
    paths().edit("page_cenik"),
  );
  await expect(row).toContainText("missing: copy it from Čeština");
  await expect(row.getByRole("link", { name: "Home" })).toHaveCount(0);
});

test("the Not translated mark goes once the title and slug are translated", async ({ page }) => {
  const { projectId, owner } = state();
  addLanguage(testDb(), projectId, "en", owner.id);
  await openEditor(page, english().edit("page_contact"));
  const sidebarEntry = page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("listitem")
    .filter({ hasText: "Kontakt" });
  await expect(sidebarEntry).toContainText("Not translated");
  await pageSettings(page).getByLabel("Title").fill("Contact");
  const slug = pageSettings(page).getByLabel("Address (slug)");
  await slug.fill("contact");
  await slug.press("Enter");
  const contactEntry = page
    .getByRole("complementary", { name: "Pages" })
    .getByRole("listitem")
    .filter({ hasText: "Contact" });
  await expect(contactEntry).not.toContainText("Not translated");
});
