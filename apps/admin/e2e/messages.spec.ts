import { demoSite } from "../src/lib/server/demo";
import { readOutbox } from "../src/lib/server/mail";
import { readSite, saveSite } from "../src/lib/server/site-documents";
import { expect, paths, state, test, testDb } from "./fixtures";

// A message from a website's contact form, in the panel's Messages section (contact-form spec,
// "Messages section").

// biome-ignore lint/suspicious/noExplicitAny: tests reshape the stored document.
type Doc = { nodes: Record<string, any> };
const text = (content: string) => ({ content, marks: [], annotations: [] });

/** The demo site with a Contact us form on "Kontakt" and a business email. */
function storeForm(): void {
  const doc = demoSite() as Doc;
  doc.nodes.contact_form_1 = {
    id: "contact_form_1",
    type: "contact_form",
    hidden: false,
    form_kind: "contact",
    heading: text("Napište nám"),
    text: text(""),
    button: text("Odeslat"),
    recipient: "",
  };
  doc.nodes.page_contact.blocks.nodes.push("contact_form_1");
  for (const node of Object.values(doc.nodes)) {
    if (node.type === "location") node.email = "info@pekarna-ulipy.cz";
  }
  const { projectId, owner } = state();
  const current = readSite(testDb(), projectId);
  if (!saveSite(testDb(), projectId, owner.id, doc, current?.version ?? "").ok) {
    throw new Error("could not store the site");
  }
}

test("A message sent from the preview appears in Messages and in the outbox", async ({ page }) => {
  storeForm();
  const since = Date.now();
  const question = `Máte bezlepkový chléb? ${since}`;
  await page.goto(`${paths().preview}kontakt/`);
  const form = page.locator("section.contact-form form");
  await form.getByLabel("Jméno").fill("Jana Nováková");
  await form.getByLabel("E-mail").fill("jana@example.cz");
  await form.getByLabel("Zpráva").fill(question);
  await form.getByRole("button", { name: "Odeslat" }).click();
  await expect(page).toHaveURL(/\/kontakt\/#form-contact_form_1-sent$/);
  await expect(page.locator("#form-contact_form_1-sent")).toBeVisible();

  await expect
    .poll(() =>
      readOutbox(process.env.OUTBOX_DIR ?? "").some(
        (m) => m.to === "info@pekarna-ulipy.cz" && m.text.includes(question),
      ),
    )
    .toBe(true);

  await page.goto(paths().dashboard);
  await expect(page.getByRole("link", { name: /^Messages \d+$/ })).toBeVisible();
  await page
    .getByRole("link", { name: /^Messages/ })
    .first()
    .click();
  const message = page
    .getByRole("article", { name: "Jana Nováková" })
    .filter({ hasText: question });
  await expect(message).toBeVisible();
  await message.getByRole("button", { name: "Mark handled" }).click();
  await expect(message.getByText("Handled", { exact: true })).toBeVisible();
  await message.getByRole("button", { name: "Delete" }).click();
  await expect(message).toHaveCount(0);
});
