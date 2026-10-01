import type { Page } from "@playwright/test";
import {
  blockButton,
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
const businessTab = (page: Page) => page.getByRole("region", { name: "Business", exact: true });
const problems = (page: Page) => page.getByRole("region", { name: /^Problems/ });

async function openBusinessTab(page: Page) {
  await details(page).getByRole("tab", { name: "Business" }).click();
  await expect(businessTab(page)).toBeVisible();
}

/** Puts the caret at the end of the last block, so inserted blocks go after it. */
async function caretInLastBlock(page: Page) {
  await canvas(page).locator(".rich-text p").last().click();
  await page.keyboard.press("End");
}

async function insert(page: Page, label: "Contact" | "Hours") {
  await caretInLastBlock(page);
  await blockButton(page, label).click();
}

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test.beforeEach(() => resetPublishing());

test("insert a contact block: it shows the phone, which the block panel can hide", async ({
  page,
}) => {
  await openEditor(page, paths().edit("page_contact"));
  await openBusinessTab(page);
  const phone = businessTab(page).getByLabel("Phone");
  await phone.fill("321 123 456");
  await phone.press("Tab");
  await expect(phone).toHaveValue("+420 321 123 456");

  await insert(page, "Contact");
  const block = canvas(page).locator("section.contact");
  await expect(block.locator("h2")).toHaveText("Kontakt");
  await expect(block.locator('a[href="tel:+420321123456"]')).toBeVisible();

  await block.locator("h2").click();
  const panel = page.getByRole("region", { name: "Contact block" });
  await panel.getByLabel("Phone").uncheck();
  await expect(block.locator('a[href^="tel:"]')).toHaveCount(0);
});

test("opening hours with a lunch break show on the canvas", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await insert(page, "Hours");
  await openBusinessTab(page);
  await businessTab(page).getByRole("button", { name: "Open on Monday" }).click();
  await businessTab(page).getByLabel("Monday closes").fill("12:00");
  await businessTab(page)
    .getByRole("group", { name: "Monday" })
    .getByRole("button", { name: "Add range" })
    .click();
  await expect(businessTab(page).getByLabel("Monday opens (2)")).toHaveValue("13:00");
  await expect(businessTab(page).getByLabel("Monday closes (2)")).toHaveValue("17:00");
  await expect(canvas(page).locator("section.opening-hours table")).toContainText(
    "8:00–12:00, 13:00–17:00",
  );
});

test("details follow the Business tab, and the block leads to it", async ({ page }) => {
  await openEditor(page, paths().edit("page_contact"));
  await openBusinessTab(page);
  await businessTab(page).getByLabel("Street and number").fill("Lipová 12");
  await businessTab(page).getByLabel("City").fill("Kolín 2");
  await insert(page, "Contact");
  await expect(canvas(page).locator("section.contact address")).toContainText("Kolín 2");
  await expect(canvas(page).locator("footer address")).toContainText("Kolín 2");

  await details(page).getByRole("tab", { name: "Page" }).click();
  await canvas(page)
    .locator("section.contact")
    .getByRole("button", { name: "Edit business details" })
    .click();
  await expect(details(page).getByRole("tab", { name: "Business" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("an overlap problem opens the Business tab at the day", async ({ page }) => {
  await openEditor(page);
  await openBusinessTab(page);
  const wednesday = businessTab(page).getByRole("group", { name: "Wednesday" });
  await wednesday.getByRole("button", { name: "Open on Wednesday" }).click();
  await wednesday.getByRole("button", { name: "Add range" }).click();
  await businessTab(page).getByLabel("Wednesday opens (2)").fill("12:00");
  await details(page).getByRole("tab", { name: "Page" }).click();

  await problems(page)
    .getByRole("button", { name: /Wednesday's hours overlap/ })
    .click();
  await expect(businessTab(page).getByLabel("Wednesday opens (1)")).toBeFocused();
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

test("publish a bakery: structured data, footer and contact block", async ({ page }) => {
  await connectTestWorkspace();
  await openEditor(page, paths().edit("page_contact"));
  await openBusinessTab(page);
  await businessTab(page).getByLabel("Type of business").selectOption({ label: "Bakery" });
  await businessTab(page).getByLabel("Street and number").fill("Lipová 12");
  await businessTab(page).getByLabel("Postal code").fill("280 02");
  await businessTab(page).getByLabel("City").fill("Kolín");
  const phone = businessTab(page).getByLabel("Phone");
  await phone.fill("321 123 456");
  await phone.press("Tab");
  await businessTab(page).getByRole("button", { name: "Open on Monday" }).click();
  await businessTab(page).getByRole("button", { name: "Copy to Tue–Fri" }).click();
  await insert(page, "Contact");
  await save(page);

  const preview = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(preview).toContain('<section class="block contact">');

  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });
  const home = await liveFile("/");
  expect(home).toContain('"@type":"Bakery"');
  expect(home).toContain('"telephone":"+420321123456"');
  expect(home).toContain('"dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"]');
  const footer = home.slice(home.indexOf('<footer class="site-footer">'));
  expect(footer).toContain('<tr><th scope="row">Po–Pá</th><td>8:00–17:00</td></tr>');
});
