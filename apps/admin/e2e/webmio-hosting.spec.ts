import type { Page } from "@playwright/test";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  expect,
  openEditor,
  paths,
  resetPublishing,
  state,
  test,
  testDb,
  useWebmioHosting,
  webmioSite,
} from "./fixtures";

// Publishing to Webmio hosting (own-hosting): nothing to connect, the website at its free
// address, rollback, earlier addresses and the website's own 404 page. The dev server publishes
// to a folder that e2e/fake-webmio-server.ts serves through the edge's own router.

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const site = (path = "/") => webmioSite("pekarna-u-lipy", path);

test.beforeEach(async () => {
  await resetPublishing();
  useWebmioHosting();
});

/** Changes the contact page's address from /kontakt/ to /napiste-nam/ in the saved site. */
function moveContactPage(): void {
  const { projectId, owner } = state();
  const saved = readSite(testDb(), projectId);
  if (!saved) throw new Error("no site");
  // biome-ignore lint/suspicious/noExplicitAny: the test edits one field.
  const document = structuredClone(saved.document) as { nodes: Record<string, any> };
  document.nodes.page_contact.slug = "napiste-nam";
  const result = saveSite(testDb(), projectId, owner.id, document, saved.version);
  if (!result.ok) throw new Error("could not move the contact page");
}

test("publishes from the editor without connecting anything, at the free address", async ({
  page,
}) => {
  await openEditor(page);
  const publish = toolbar(page).getByRole("button", { name: "Publish", exact: true });
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(toolbar(page).getByText("Published · pekarna-u-lipy.webmio.site")).toBeVisible({
    timeout: 15_000,
  });

  await page.goto(site());
  await expect(page.locator("h1")).toHaveText("Čerstvý chléb každé ráno");
  await page.goto(site("/kontakt/"));
  await expect(page.locator("h1").first()).toContainText("Kontakt");
});

test("the Publish page says Webmio hosts the website and keeps its history", async ({ page }) => {
  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Hosted by Webmio.")).toBeVisible();
  await expect(page.getByText(/isn't connected to Netlify/)).toHaveCount(0);
  const publish = page.getByRole("button", { name: "Publish", exact: true });
  const history = page.getByRole("region", { name: "History" }).getByRole("listitem");
  await publish.click();
  await expect(history).toHaveCount(1, { timeout: 15_000 });
  await expect(
    page.getByRole("region", { name: "Address" }).getByRole("link", {
      name: "https://pekarna-u-lipy.webmio.site",
    }),
  ).toBeVisible();
});

test("an earlier address redirects, a missing one gets the website's 404, rollback undoes both", async ({
  page,
}) => {
  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  const publish = page.getByRole("button", { name: "Publish", exact: true });
  const history = page.getByRole("region", { name: "History" }).getByRole("listitem");
  await publish.click();
  await expect(history.first()).toContainText("Live", { timeout: 15_000 });

  moveContactPage();
  await publish.click();
  await expect(history).toHaveCount(2, { timeout: 15_000 });
  await expect(history.first()).toContainText("Live", { timeout: 15_000 });

  // The browser follows the website's own 301 from the earlier address.
  await page.goto(site("/kontakt/"));
  expect(new URL(page.url()).pathname).toBe("/napiste-nam/");
  await expect(page.locator("h1").first()).toContainText("Kontakt");

  const missing = await page.goto(site("/stara-stranka/"));
  expect(missing?.status()).toBe(404);

  // Making the first publish live again brings back /kontakt/ itself, without a redirect.
  await page.goto(paths().publishPage);
  await history.nth(1).getByRole("button", { name: "Make live again" }).click();
  await expect(history.nth(1)).toContainText("Live");
  const kontakt = await page.goto(site("/kontakt/"));
  expect(kontakt?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe("/kontakt/");
  expect((await page.goto(site("/napiste-nam/")))?.status()).toBe(404);
});

test("the workspace's hosting page has nothing to connect", async ({ page }) => {
  await page.goto(`/w/${state().workspaceId}/hosting`);
  await expect(page.getByRole("heading", { name: "Hosting", level: 1 })).toBeVisible();
  await expect(page.getByText("Pekárna U Lípy's websites are hosted by Webmio.")).toBeVisible();
  await expect(page.getByLabel("Netlify personal access token")).toHaveCount(0);
});
