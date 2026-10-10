import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  canvas,
  caretAtEnd,
  expect,
  latestLink,
  openEditor,
  paths,
  state,
  test,
} from "./fixtures";

// Contact forms in the editor (contact-form spec, "Contact form in the editor").

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const formPanel = (page: Page) => page.getByRole("region", { name: "Contact form", exact: true });
const form = (page: Page) => canvas(page).locator("section.contact-form");

async function save(page: Page) {
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

async function insertForm(page: Page) {
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Contact form");
  await expect(form(page).locator("h2")).toHaveText("Napište nám");
}

test("Insert a callback form", async ({ page }) => {
  await insertForm(page);
  await formPanel(page).getByLabel("Let us call you back").check();
  await expect(form(page).locator("h2")).toHaveText("Zavoláme vám");
  // The owner writes their own heading.
  await form(page).locator("h2").click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Zavoláme vám zpět");
  await expect(form(page).locator("h2")).toHaveText("Zavoláme vám zpět");
  await expect(form(page).locator(".form-field")).toHaveText([/Jméno/, /Telefon/, /Kdy/, /.+/]);
  await save(page);
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toMatch(
    new RegExp(`<form method="post" action="https?://[^"]+/forms/${state().projectId}/[^"]+">`),
  );
  expect(contact).toContain('name="phone" type="tel"');
  expect(contact).toContain('<select id="form-');
});

test("A campaign address", async ({ page }) => {
  await insertForm(page);
  const panel = formPanel(page);
  await panel.getByLabel("Another address").check();
  const address = panel.getByLabel("Address for the messages");
  await address.fill("kampan");
  await address.press("Enter");
  await expect(panel.getByRole("alert")).toHaveText(
    "Enter an email address, like jana@example.com.",
  );
  await address.fill("kampan@pekarna-ulipy.cz");
  await address.press("Enter");
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await expect(panel.getByRole("status")).toContainText("Waiting for confirmation");
  const since = Date.now();
  await save(page);
  const link = await latestLink("kampan@pekarna-ulipy.cz", since);
  expect(link).toContain("/forms/confirm/");
  await page.goto(link);
  await expect(page.getByRole("status")).toContainText("kampan@pekarna-ulipy.cz");
  // Back in the editor, the address no longer waits.
  await openEditor(page, paths().edit("page_contact"));
  await form(page).locator("h2").click();
  await expect(formPanel(page).getByLabel("Another address")).toBeChecked();
  await expect(formPanel(page).getByRole("status")).toHaveCount(0);
});
