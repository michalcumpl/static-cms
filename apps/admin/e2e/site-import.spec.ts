import type { Page } from "@playwright/test";
import { bakeryPort, spaPort } from "../playwright.config";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { expect, paths, state, test, testDb } from "./fixtures";

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
  // The same problem on several images is one item, each image under it.
  const todo = page.getByRole("region", { name: "Before you publish" });
  await todo.getByText(/like this: .*needs a description/).click();
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

// Retrying what was left out, and marking imported images decorative (import-review-actions).
const bakery = `http://127.0.0.1:${bakeryPort}`;
const fixture = (command: string) => fetch(`${bakery}/__fixture/${command}`);
test.afterEach(async () => {
  await fixture("reset");
});

async function importBakery(page: Page) {
  await startImport(page, `${bakery}/`);
  await expect(page).toHaveURL(/\/p\/p_[\w-]+\/import$/, { timeout: 30_000 });
}

test("Try again: the page and the image that failed arrive, then nothing is left to retry", async ({
  page,
}) => {
  await fixture(`fail?path=${encodeURIComponent("/images/rohliky.jpg")}`);
  await importBakery(page);
  const leftOut = page.getByRole("region", { name: "What was left out" });
  await expect(
    leftOut.getByText(/An image that couldn't be imported: .*rohliky\.jpg/),
  ).toBeVisible();
  await expect(leftOut.getByText("Not read: the page didn't answer (404).")).toBeVisible();
  // The old site's price list answers now, and so does the photo.
  await fixture("reset");
  await fixture(
    `answer?path=${encodeURIComponent("/cenik.pdf")}&title=${encodeURIComponent("Ceník")}`,
  );
  await leftOut.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByText(/1 page added\. 1 image placed where the old website had it\./),
  ).toBeVisible({
    timeout: 30_000,
  });
  const table = page.getByRole("table", { name: "Pages, with their old and new addresses" });
  await expect(table.getByRole("row", { name: /Ceník \/cenik\.pdf \/cenik-pdf\// })).toBeVisible();
  await expect(leftOut.getByText(/rohliky\.jpg/)).toHaveCount(0);
  // Nothing to retry: no "Try again".
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("Mark these images as decorative: their errors go, as one new version", async ({ page }) => {
  await importBakery(page);
  const todo = page.getByRole("region", { name: "Before you publish" });
  const mark = todo.getByRole("button", { name: /Mark these images as decorative \(\d+\)/ });
  await expect(mark).toBeVisible();
  await expect(todo.getByText(/Screen readers skip decorative images/)).toBeVisible();
  const review = page.url();
  await page.goto(review.replace(/import$/, "publish/versions"));
  const versions = page.getByRole("list", { name: "Saved versions" }).getByRole("listitem");
  const before = await versions.count();
  await page.goto(review);
  await mark.click();
  await expect(mark).toHaveCount(0);
  await expect(todo.getByText(/needs a description/)).toHaveCount(0);
  await page.goto(review.replace(/import$/, "publish/versions"));
  await expect(versions).toHaveCount(before + 1);
});

test("Fix the subheading levels: the page's first smaller subheading becomes a main one", async ({
  page,
}) => {
  await importBakery(page);
  // A page that starts with a smaller subheading, as a dropped gallery could leave it.
  const projectId = /\/p\/(p_[\w-]+)\//.exec(page.url())?.[1] ?? "";
  const site = readSite(testDb(), projectId);
  // biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
  const doc = structuredClone(site?.document) as any;
  const pageId = doc.nodes[doc.document_id].pages.nodes[1];
  const text = (content: string) => ({ content, marks: [], annotations: [] });
  doc.nodes.sub_e2e = { id: "sub_e2e", type: "subheading", content: text("Vídeň"), level: 3 };
  doc.nodes.text_e2e = {
    id: "text_e2e",
    type: "rich_text",
    body: { nodes: ["sub_e2e"], marks: [], annotations: [] },
    hidden: false,
  };
  doc.nodes[pageId].blocks.nodes.unshift("text_e2e");
  saveSite(testDb(), projectId, state().owner.id, doc, site?.version ?? "");

  await page.reload();
  const todo = page.getByRole("region", { name: "Before you publish" });
  await expect(
    todo.getByText(/a smaller subheading comes before any main subheading/),
  ).toBeVisible();
  await todo.getByRole("button", { name: "Fix the subheading levels on 1 page" }).click();
  await expect(todo.getByRole("button", { name: /Fix the subheading levels/ })).toHaveCount(0);
  await expect(todo.getByText(/a smaller subheading comes before any main subheading/)).toHaveCount(
    0,
  );
});

test("Pages without a description: one item leading to the site's description", async ({
  page,
}) => {
  await importBakery(page);
  const projectId = /\/p\/(p_[\w-]+)\//.exec(page.url())?.[1] ?? "";
  const site = readSite(testDb(), projectId);
  // biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
  const doc = structuredClone(site?.document) as any;
  doc.nodes[doc.document_id].description = "";
  // biome-ignore lint/suspicious/noExplicitAny: tests edit nodes freely.
  for (const node of Object.values(doc.nodes) as any[]) {
    if (node.type === "page") node.seo_description = "";
  }
  saveSite(testDb(), projectId, state().owner.id, doc, site?.version ?? "");

  await page.reload();
  const todo = page.getByRole("region", { name: "Before you publish" });
  const link = todo.getByRole("link", {
    name: "5 pages have no description for search engines and link previews: add one description of the whole site.",
  });
  await expect(link).toHaveAttribute("href", /\/website\?focus=/);
  await expect(todo.getByText("Show each (5)")).toBeVisible();
});
