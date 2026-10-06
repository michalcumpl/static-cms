import type { Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { projectHosting } from "../src/lib/server/db/schema";
import { addLanguage, readSite, saveSite } from "../src/lib/server/site-documents";
import {
  canvas,
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

// The Settings tab (project-tabs, specs/project-page): the site and business settings, edited
// through the editor's own session and saved explicitly.

test.beforeEach(() => resetPublishing());

const site = (page: Page) => page.getByRole("region", { name: "Site", exact: true });
const business = (page: Page) => page.getByRole("region", { name: "Business", exact: true });
const library = (page: Page) => page.getByRole("dialog", { name: "Images" });
const status = (page: Page) => page.getByRole("status").first();

/** Chooses the demo image (`hero.png`) in the media library the button opened. */
async function chooseDemoImage(page: Page) {
  await library(page).getByRole("option", { name: "hero.png" }).click();
  await library(page).getByRole("button", { name: "Use this image" }).click();
  await expect(library(page)).toBeHidden();
}

/** A file of the project's live site on the fake Netlify. */
async function liveFile(path: string): Promise<string> {
  const hosting = testDb()
    .select()
    .from(projectHosting)
    .where(eq(projectHosting.projectId, state().projectId))
    .get();
  if (!hosting) return "";
  return (await fetch(`${fakeNetlify()}/sites/${hosting.siteName}${path}`)).text();
}

// biome-ignore lint/suspicious/noExplicitAny: tests read nodes freely.
type Doc = { document_id: string; nodes: Record<string, any> };
const savedDocument = (lang?: string) =>
  readSite(testDb(), state().projectId, lang)?.document as unknown as Doc;
const savedBusiness = (lang?: string) => {
  const doc = savedDocument(lang);
  return Object.values(doc.nodes).find((node) => node.type === "business");
};
/** The saved business's locations, in order. */
const savedLocations = (lang?: string) => {
  const doc = savedDocument(lang);
  return savedBusiness(lang).locations.nodes.map((id: string) => doc.nodes[id]);
};

test.describe("the site", () => {
  test("rename it, undo it, then rename and save", async ({ page }) => {
    await openSettings(page);
    const name = site(page).getByLabel("Name");
    await name.fill("Pekárna U Lípy Kolín");
    await expect(status(page)).toHaveText("Unsaved changes");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(name).toHaveValue("Pekárna U Lípy");

    await name.fill("Pekárna U Lípy Kolín");
    await saveSettings(page);
    const doc = savedDocument();
    expect(doc.nodes[doc.document_id].name).toBe("Pekárna U Lípy Kolín");
    await openEditor(page);
    await expect(canvas(page).locator(".site-name")).toHaveText("Pekárna U Lípy Kolín");
  });

  test("the favicon, the share image and the description reach the preview's head", async ({
    page,
  }) => {
    await openSettings(page);
    await site(page).getByLabel("Description for search engines").fill("Rodinná pekárna v Kolíně");
    await page.locator("#site-settings-favicon").click();
    await chooseDemoImage(page);
    await expect(site(page).locator("img.square")).toBeVisible();
    await page.locator("#site-settings-share_image").click();
    await chooseDemoImage(page);
    await site(page).getByLabel("Description of the image").fill("Pult s chlebem");
    await saveSettings(page);

    const home = await (await page.request.get(paths().preview)).text();
    expect(home).toContain('<meta property="og:title" content="Pekárna U Lípy">');
    expect(home).toContain(`<link rel="icon" href="${paths().preview}favicon.ico" sizes="32x32">`);
    const icon = await page.request.get(`${paths().preview}favicon.ico`);
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toBe("image/x-icon");
  });

  test("switch off AI training and publish: robots.txt, 404 page and structured data", async ({
    page,
  }) => {
    await connectTestWorkspace();
    await openSettings(page);
    await site(page).getByLabel("AI training").uncheck();
    await saveSettings(page);
    const doc = savedDocument();
    expect(doc.nodes[doc.document_id].allow_ai_training).toBe(false);

    await page.goto(paths().overview);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("region", { name: "Your website" })
      .getByRole("button", { name: "Publish", exact: true })
      .click();
    await expect(page.getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });
    const robots = await liveFile("/robots.txt");
    expect(robots).toContain("User-agent: GPTBot");
    expect(robots).not.toContain("User-agent: OAI-SearchBot");
    expect(await liveFile("/404.html")).toContain("Stránka nenalezena");
  });
});

test.describe("the business", () => {
  test("a phone number is normalised when the field is left", async ({ page }) => {
    await openSettings(page);
    const phone = business(page).getByLabel("Phone");
    await phone.fill("321 123 456");
    await phone.press("Tab");
    await expect(phone).toHaveValue("+420 321 123 456");
    await saveSettings(page);
    expect(savedLocations()[0].phone).toBe("+420321123456");
  });

  test("Add a second shop", async ({ page }) => {
    await openSettings(page);
    await business(page).getByRole("button", { name: "Add a location" }).click();
    const second = business(page).getByRole("group", { name: "Location 2" });
    await expect(second.getByLabel("Name of the location")).toBeFocused();
    await second.getByLabel("Name of the location").fill("Kutná Hora");
    // Named, the location is headed by its name.
    const branch = business(page).getByRole("group", { name: "Kutná Hora" });
    await branch.getByLabel("Street and number").fill("Palackého 3");
    await branch.getByLabel("City").fill("Kutná Hora");
    await branch.getByRole("button", { name: "Open on Saturday" }).click();
    const main = business(page).getByRole("group", { name: /Main location/ });
    await main.getByLabel("Name of the location").fill("Kolín – Lipová");
    await main.getByLabel("Street and number").fill("Lipová 12");
    await saveSettings(page);
    const [kolin, kh] = savedLocations();
    expect(kolin).toMatchObject({ name: "Kolín – Lipová", street: "Lipová 12" });
    expect(kh).toMatchObject({ name: "Kutná Hora", street: "Palackého 3" });
    await page.goto(paths().preview);
    const footer = page.locator("footer");
    await expect(footer.getByText("Kolín – Lipová", { exact: true })).toBeVisible();
    await expect(footer.getByText("Kutná Hora", { exact: true }).first()).toBeVisible();
  });

  test("Remove a chosen location", async ({ page }) => {
    await openSettings(page);
    await business(page).getByRole("button", { name: "Add a location" }).click();
    await business(page)
      .getByRole("group", { name: "Location 2" })
      .getByLabel("Name of the location")
      .fill("Kutná Hora");
    await saveSettings(page);
    // A contact block on "Kontakt" chooses the second location.
    const { projectId, owner } = state();
    const site = readSite(testDb(), projectId);
    const doc = structuredClone(site?.document) as Doc;
    const [, khId] = doc.nodes[savedBusiness().id].locations.nodes;
    doc.nodes.contact_kh = {
      id: "contact_kh",
      type: "contact",
      heading: { content: "Kutná Hora", marks: [], annotations: [] },
      show_address: true,
      show_phone: true,
      show_email: true,
      show_map: true,
      location_id: khId,
    };
    doc.nodes.page_contact.blocks.nodes.push("contact_kh");
    expect(saveSite(testDb(), projectId, owner.id, doc, site?.version ?? "").ok).toBe(true);

    await openSettings(page);
    const second = business(page).getByRole("group", { name: "Kutná Hora" });
    await second.getByRole("button", { name: "Remove this location" }).click();
    await expect(second.getByRole("alert")).toContainText("Kontakt");
    await second.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(business(page).getByRole("group", { name: "Kutná Hora" })).toHaveCount(0);
    await saveSettings(page);
    const saved = savedDocument();
    expect(saved.nodes.contact_kh.location_id).toBe("");
    expect(savedLocations()).toHaveLength(1);
  });

  test("Add an Instagram profile", async ({ page }) => {
    await openSettings(page);
    await business(page).getByRole("button", { name: "Add a profile" }).click();
    const field = business(page).getByLabel(/^Profile 1/);
    await expect(field).toBeFocused();
    await field.fill("instagram.com/pekarnaulipy");
    await field.press("Tab");
    await expect(field).toHaveValue("https://instagram.com/pekarnaulipy");
    await expect(business(page).getByText("Profile 1: Instagram")).toBeVisible();
    await saveSettings(page);
    const doc = savedDocument();
    const [profileId] = doc.nodes[savedBusiness().id].social.nodes;
    expect(doc.nodes[profileId].url).toBe("https://instagram.com/pekarnaulipy");
    await page.goto(paths().preview);
    await expect(
      page.locator("footer nav.footer-social").getByRole("link", { name: "Instagram" }),
    ).toHaveAttribute("href", "https://instagram.com/pekarnaulipy");
  });

  test("a lunch break gives a day two ranges", async ({ page }) => {
    await openSettings(page);
    await business(page).getByRole("button", { name: "Open on Monday" }).click();
    await business(page).getByLabel("Monday closes").fill("12:00");
    await business(page)
      .getByRole("group", { name: "Monday" })
      .getByRole("button", { name: "Add range" })
      .click();
    await expect(business(page).getByLabel("Monday opens (2)")).toHaveValue("13:00");
    await expect(business(page).getByLabel("Monday closes (2)")).toHaveValue("17:00");
  });

  test("Monday's hours copy to the weekdays in one undoable step", async ({ page }) => {
    await openSettings(page);
    await business(page).getByRole("button", { name: "Open on Monday" }).click();
    await business(page).getByRole("button", { name: "Copy to Tue–Fri" }).click();
    await expect(business(page).getByLabel("Friday opens")).toHaveValue("08:00");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(business(page).getByRole("button", { name: "Open on Friday" })).toBeVisible();
  });

  test("a bakery is published with structured data and the footer", async ({ page }) => {
    await connectTestWorkspace();
    await openSettings(page);
    await business(page).getByLabel("Type of business").selectOption({ label: "Bakery" });
    await business(page).getByLabel("Street and number").fill("Lipová 12");
    await business(page).getByLabel("Postal code").fill("280 02");
    await business(page).getByLabel("City").fill("Kolín");
    const phone = business(page).getByLabel("Phone");
    await phone.fill("321 123 456");
    await phone.press("Tab");
    await business(page).getByRole("button", { name: "Open on Monday" }).click();
    await business(page).getByRole("button", { name: "Copy to Tue–Fri" }).click();
    await saveSettings(page);

    await page.goto(paths().overview);
    await page.waitForLoadState("networkidle");
    await page
      .getByRole("region", { name: "Your website" })
      .getByRole("button", { name: "Publish", exact: true })
      .click();
    await expect(page.getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });
    const home = await liveFile("/");
    expect(home).toContain('"@type":"Bakery"');
    expect(home).toContain('"telephone":"+420321123456"');
    expect(home).toContain('"dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"]');
  });
});

test.describe("saving", () => {
  test("changes show on the editor's canvas after saving", async ({ page }) => {
    await openSettings(page);
    await business(page).getByLabel("City").fill("Kolín 2");
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
    await saveSettings(page);
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await openEditor(page);
    await expect(canvas(page).locator("footer address")).toContainText("Kolín 2");
  });

  test("leaving with unsaved changes asks first, and staying keeps them", async ({ page }) => {
    await openSettings(page);
    await business(page).getByLabel("City").fill("Kolín 2");
    page.once("dialog", (dialog) => void dialog.dismiss());
    await page
      .getByRole("navigation", { name: "Project sections" })
      .getByRole("link", { name: "Overview" })
      .click();
    await expect(page).toHaveURL(paths().settings);
    await expect(business(page).getByLabel("City")).toHaveValue("Kolín 2");
  });

  test("saving a document changed elsewhere is refused, and nothing is overwritten", async ({
    page,
  }) => {
    await openSettings(page);
    await business(page).getByLabel("City").fill("Kolín 2");
    // The editor (another window) saves a change to the document in the meantime.
    const { projectId, owner } = state();
    const current = readSite(testDb(), projectId);
    const doc = structuredClone(current?.document) as Doc;
    const stored = Object.values(doc.nodes).find((node) => node.type === "business");
    stored.city = "Praha";
    saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "");

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(status(page)).toContainText("changed elsewhere");
    expect(savedBusiness().city).toBe("Praha");
  });

  test("a problem in the saved settings leads to its field", async ({ page }) => {
    await openSettings(page);
    const wednesday = business(page).getByRole("group", { name: "Wednesday" });
    await wednesday.getByRole("button", { name: "Open on Wednesday" }).click();
    await wednesday.getByRole("button", { name: "Add range" }).click();
    await business(page).getByLabel("Wednesday opens (2)").fill("12:00");
    await saveSettings(page);

    await page.getByRole("button", { name: /Wednesday's hours overlap/ }).click();
    await expect(business(page).getByLabel("Wednesday opens (1)")).toBeFocused();
  });

  test("a field named in the address is focused when the tab opens", async ({ page }) => {
    await page.goto(`${paths().settings}?focus=business-settings-location_1-phone`);
    await expect(business(page).getByLabel("Phone")).toBeFocused();
  });

  // Every field a problem can lead to (locate.ts `settingsTarget`) must exist here to be focused.
  const FIELDS = [
    ...["name", "description", "favicon", "share_image"].map((f) => `site-settings-${f}`),
    ...["name", "business_type"].map((f) => `business-settings-${f}`),
    ...[
      "name",
      "street",
      "postal_code",
      "city",
      "country",
      "phone",
      "email",
      "map_url",
      "hours_note",
      "hours_mon",
      "hours_tue",
      "hours_wed",
      "hours_thu",
      "hours_fri",
      "hours_sat",
      "hours_sun",
    ].map((f) => `business-settings-location_1-${f}`),
  ];
  for (const id of FIELDS) {
    test(`${id} can be focused`, async ({ page }) => {
      await page.goto(`${paths().settings}?focus=${id}`);
      await expect(page.locator(`#${id}`)).toBeFocused();
    });
  }
});

test.describe("old editor addresses", () => {
  test("?tab=business and ?tab=site lead to the Settings tab", async ({ page }) => {
    await page.goto(`${paths().edit()}?tab=business`);
    await expect(page).toHaveURL(paths().settings);
    await page.goto(`${paths().edit()}?tab=site`);
    await expect(page).toHaveURL(paths().settings);
  });

  test("?tab=theme still opens the Design tab", async ({ page }) => {
    await page.goto(`${paths().edit()}?tab=theme`);
    await expect(canvas(page).locator("[contenteditable=true]")).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Details" }).getByRole("tab", { name: "Design" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("another language", () => {
  test("the shared fields are read-only and the translatable ones can be edited", async ({
    page,
  }) => {
    addLanguage(testDb(), state().projectId, "en", state().owner.id);
    await openSettings(page, "en");
    await expect(business(page).getByLabel("Phone")).toBeDisabled();
    await expect(business(page).getByText("Edited in Čeština")).toBeVisible();
    await expect(business(page).getByRole("link", { name: "Edit in Čeština" })).toHaveAttribute(
      "href",
      `${paths().settings}`,
    );
    await expect(business(page).getByLabel("Note on the opening hours")).toBeEnabled();
    // Social profiles are shared too.
    await expect(business(page).getByRole("button", { name: "Add a profile" })).toHaveCount(0);
    await site(page).getByLabel("Name").fill("Bakery");
    await saveSettings(page);
    const english = savedDocument("en");
    expect(english.nodes[english.document_id].name).toBe("Bakery");
    const primary = savedDocument();
    expect(primary.nodes[primary.document_id].name).toBe("Pekárna U Lípy");
  });
});
