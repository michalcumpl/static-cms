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

// The project's panel: a dashboard and section pages (control-panel, specs/project-page).

test.beforeEach(() => resetPublishing());

const tabs = (page: Page) => page.getByRole("navigation", { name: "Project sections" });
const subpages = (page: Page, section: string) =>
  page.getByRole("navigation", { name: `${section} pages` });

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

test("Open a section", async ({ page }) => {
  await page.goto(paths().business);
  await expect(page).toHaveURL(paths().business);
  await expect(page.getByRole("heading", { name: "Pekárna U Lípy", level: 1 })).toBeVisible();
  await expect(tabs(page).getByRole("link", { name: "Business" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  for (const section of ["Overview", "Business", "Website", "Publish"]) {
    await expect(tabs(page).getByRole("link", { name: section, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Preview" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the editor" })).toBeVisible();
});

test("a subpage marks its section and itself", async ({ page }) => {
  await page.goto(paths().websitePages);
  await expect(tabs(page).getByRole("link", { name: "Website", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    subpages(page, "Website").getByRole("link", { name: "Pages and menu" }),
  ).toHaveAttribute("aria-current", "page");
  for (const name of ["Site and search engines", "Languages", "Domain"]) {
    await expect(subpages(page, "Website").getByRole("link", { name })).toBeVisible();
  }
});

test.describe("someone else's project", () => {
  test.use({ anonymous: true });

  test("every tab is not found for a non-member", async ({ page, context }) => {
    await signIn(context, state().outsider);
    for (const address of [
      paths().dashboard,
      paths().business,
      paths().website,
      paths().domainPage,
      paths().websitePages,
      paths().websiteLanguages,
      paths().publishPage,
      paths().versionsPage,
    ]) {
      expect((await page.goto(address))?.status()).toBe(404);
    }
  });
});

test("Keep the language between sections", async ({ page }) => {
  addLanguage(testDb(), state().projectId, "en", state().owner.id);
  await page.goto(paths().business);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Language", { exact: true }).selectOption({ label: "English" });
  await expect(page).toHaveURL(projectPaths(state().projectId, "en").business);
  await tabs(page).getByRole("link", { name: "Website", exact: true }).click();
  await expect(page).toHaveURL(projectPaths(state().projectId, "en").website);
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
  await tabs(page).getByRole("link", { name: "Publish" }).click();
  await subpages(page, "Publish").getByRole("link", { name: "Versions" }).click();
  await expect(page).toHaveURL(projectPaths(state().projectId, "en").versionsPage);
  await expect(page.getByText("Every save of English is kept")).toBeVisible();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
});

test.describe("Dashboard", () => {
  test("Published and valid", async ({ page }) => {
    await connectTestWorkspace();
    await page.goto(paths().dashboard);
    await page.waitForLoadState("networkidle");
    const site = page.getByRole("region", { name: "Overview" });
    await expect(site.getByText("Not published yet")).toBeVisible();
    await site.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(site.getByRole("link", { name: /netlify\.app/ }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(site.getByText("Live", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Problems" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("region", { name: "Publish" })).toContainText("Published");
  });

  test("Errors disable publishing", async ({ page }) => {
    await connectTestWorkspace();
    breakSite();
    await page.goto(paths().dashboard);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("region", { name: "Problems" })).toContainText("1 error");
    await expect(
      page.getByRole("region", { name: "Overview" }).getByRole("button", {
        name: "Publish",
        exact: true,
      }),
    ).toBeDisabled();
  });

  test("A problem leads to its field", async ({ page }) => {
    const { projectId, owner } = state();
    const site = readSite(testDb(), projectId);
    const doc = structuredClone(site?.document) as {
      nodes: Record<string, Record<string, unknown>>;
    };
    doc.nodes.location_1 = { ...doc.nodes.location_1, phone: "321" };
    saveSite(testDb(), projectId, owner.id, doc, site?.version ?? "");
    await page.goto(paths().dashboard);
    await page
      .getByRole("region", { name: "Problems" })
      .getByRole("link", { name: /phone number/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`${paths().business}\\?focus=`));
    await expect(
      page.getByRole("region", { name: "Business", exact: true }).getByLabel("Phone"),
    ).toBeFocused();
  });

  test("Offer card before its section exists", async ({ page }) => {
    await page.goto(paths().dashboard);
    const offer = page.getByRole("region", { name: "What you offer" });
    await expect(offer).toContainText("3 services");
    await offer.getByRole("link", { name: "Edit on the page" }).click();
    await expect(page).toHaveURL(/\/edit\/page_home\/$/);
  });

  test("says when the project was never published, and summarises the sections", async ({
    page,
  }) => {
    await page.goto(paths().dashboard);
    await expect(page.getByText("Not published yet").first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Business", exact: true })).toContainText(
      "Pekárna U Lípy",
    );
    await expect(page.getByRole("region", { name: "Website", exact: true })).toContainText(
      "2 pages",
    );
  });
});

test("Change design", async ({ page }) => {
  await page.goto(paths().website);
  await page.getByRole("link", { name: "Change design" }).click();
  await expect(page).toHaveURL(/\/edit\/\?tab=theme$/);
  await expect(
    page.getByRole("complementary", { name: "Details" }).getByRole("tab", { name: "Design" }),
  ).toHaveAttribute("aria-selected", "true");
});

test.describe("Pages and menu", () => {
  test("lists the pages in order, with home and the menu", async ({ page }) => {
    await page.goto(paths().websitePages);
    const rows = page.getByRole("region", { name: "Pages of Čeština" }).getByRole("listitem");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Úvod");
    await expect(rows.nth(0)).toContainText("Home");
    await expect(rows.nth(0)).toContainText("In the menu");
    await expect(rows.nth(1)).toContainText("Kontakt");
    await expect(rows.nth(1)).toContainText("/kontakt/");
  });

  test("opens a page in the editor", async ({ page }) => {
    await page.goto(paths().websitePages);
    await page.getByRole("link", { name: "Edit Kontakt" }).click();
    await expect(page).toHaveURL(/\/edit\/page_contact\/$/);
  });

  test("previews a page", async ({ page }) => {
    await page.goto(paths().websitePages);
    await expect(page.getByRole("link", { name: "Preview Kontakt" })).toHaveAttribute(
      "href",
      `${paths().preview}kontakt/`,
    );
  });

  test("marks the pages not translated yet", async ({ page }) => {
    addLanguage(testDb(), state().projectId, "en", state().owner.id);
    await page.goto(projectPaths(state().projectId, "en").websitePages);
    const row = page
      .getByRole("region", { name: "Pages of English" })
      .getByRole("listitem")
      .filter({ hasText: "Kontakt" });
    await expect(row).toContainText("not translated yet");
    await expect(row).toContainText("/en/kontakt/");
  });
});

test.describe("Publish section", () => {
  test("downloads the published languages as a ZIP", async ({ page }) => {
    await page.goto(paths().publishPage);
    await page.waitForLoadState("networkidle");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download ZIP" }).click();
    expect((await downloading).suggestedFilename()).toBe("website.zip");
  });

  test("refuses the download while the saved site has errors", async ({ page }) => {
    breakSite();
    await page.goto(paths().publishPage);
    await expect(page.getByRole("button", { name: "Download ZIP" })).toBeDisabled();
    await expect(page.getByRole("region", { name: "Export" })).toContainText(
      "Fix the problems first",
    );
  });
});
