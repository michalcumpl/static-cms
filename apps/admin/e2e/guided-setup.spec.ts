import { readFileSync } from "node:fs";
import { readSite } from "../src/lib/server/site-documents";
import { expect, state, test, testDb } from "./fixtures";

// The guided setup from the New project page to a finished site (guided-setup spec).

const image = (name: string) =>
  readFileSync(new URL(`../../../packages/import/fixtures/bakery/images/${name}`, import.meta.url));

test("Finishing the café: every step, leaving and coming back, the preview, the site", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`/w/${state().workspaceId}/new`);
  await page.getByRole("link", { name: "Start", exact: true }).click();

  // 1. The business.
  await expect(page.getByText("Step 1 of 7")).toBeVisible();
  await page.getByLabel("Café").check();
  await page.getByLabel("Its name").fill("Kavárna U Mostu");
  await page.getByLabel("Describe it in one sentence").fill("Výběrová káva a domácí dorty.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/p\/p_[\w-]+\/setup\/2$/);
  const projectId = /\/p\/(p_[\w-]+)\//.exec(page.url())?.[1] ?? "";

  // 2. The design: Standard, suggested.
  await expect(page.getByText("Step 2 of 7")).toBeVisible();
  await expect(page.getByLabel(/Standard/)).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. Contact and hours; a wrong answer first.
  await page.getByLabel("Phone").fill("+420 777 123 456");
  await page.getByLabel("Town or city").fill("Praha");
  await page.getByLabel("Monday opens").fill("18:00");
  await page.getByLabel("Monday closes").fill("09:00");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Monday: Closing must come after opening.")).toBeVisible();
  await page.getByLabel("Monday opens").fill("08:00");
  await page.getByLabel("Monday closes").fill("18:00");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/setup\/4$/);

  // Leaving, and coming back through the projects page.
  await page.goto("/");
  await page
    .getByRole("listitem")
    .filter({ hasText: "Kavárna U Mostu" })
    .getByRole("link", { name: "Finish setting up" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/p/${projectId}/setup/4$`));

  // 4. Services.
  await page.getByRole("group", { name: "Service 1" }).getByLabel("Name").fill("Výběrová káva");
  await page.getByRole("group", { name: "Service 2" }).getByLabel("Name").fill("Domácí dorty");
  await page.getByRole("button", { name: "Continue" }).click();

  // 5. Photos, uploaded at once.
  await page
    .getByText("Choose a logo")
    .locator("input")
    .setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: image("touch-icon.png"),
    });
  await page
    .getByText("Add photos")
    .locator("input")
    .setInputFiles([
      { name: "kavarna.jpg", mimeType: "image/jpeg", buffer: image("galerie-1.jpg") },
      { name: "dort.jpg", mimeType: "image/jpeg", buffer: image("chleb.jpg") },
    ]);
  await expect(page.getByLabel("What is in the photo")).toHaveCount(2);
  await page.getByLabel("What is in the photo").first().fill("Kavárna u okna");
  await page.getByLabel("What is in the photo").last().fill("Dort s jahodami");
  await page.getByRole("button", { name: "Continue" }).click();

  // 6. Pages: the café's suggestion.
  await expect(page.getByLabel("About us")).toBeChecked();
  await expect(page.getByLabel("Team")).not.toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // 7. The preview, then the site.
  const preview = page.frameLocator("iframe");
  await expect(preview.getByText("Kavárna U Mostu").first()).toBeVisible();
  await page.getByRole("button", { name: "Create my website" }).click();
  await expect(page).toHaveURL(new RegExp(`/p/${projectId}/?$`));

  const doc = readSite(testDb(), projectId)?.document as {
    document_id: string;
    nodes: Record<string, { type: string; title?: string; pages?: { nodes: string[] } }>;
  };
  const site = doc.nodes[doc.document_id];
  expect(site?.pages?.nodes.map((id) => doc.nodes[id]?.title)).toEqual([
    "Home",
    "Services",
    "About us",
    "Contact",
  ]);
  // The setup is done: its steps lead to the Overview.
  await page.goto(`/p/${projectId}/setup/3`);
  await expect(page).toHaveURL(new RegExp(`/p/${projectId}/?$`));
});
