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
  // Each step is used once its script has taken over: answers given before that are lost when
  // the page hydrates, and uploads go nowhere. Slow runners (CI's) show it.
  const step = async (n: number) => {
    await expect(page.getByText(`Step ${n} of 7`)).toBeVisible();
    await page.waitForLoadState("networkidle");
  };
  await page.goto(`/w/${state().workspaceId}/new`);
  await page.getByRole("link", { name: "Start", exact: true }).click();

  // 1. The business.
  await step(1);
  await page.getByLabel("Café").check();
  await page.getByLabel("Its name").fill("Kavárna U Mostu");
  await page.getByLabel("Describe it in one sentence").fill("Výběrová káva a domácí dorty.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/p\/p_[\w-]+\/setup\/2$/);
  const projectId = /\/p\/(p_[\w-]+)\//.exec(page.url())?.[1] ?? "";

  // 2. The design: Standard, suggested.
  await step(2);
  await expect(page.getByLabel(/Standard/)).toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // 3. Contact and hours: the café's typical hours are filled in; a wrong answer first.
  await step(3);
  await expect(page.getByLabel("Country")).toHaveValue("+420");
  await page.getByLabel("Phone").fill("777 123 456");
  await page.getByLabel("Town or city").fill("Praha");
  await expect(page.getByLabel("Saturday opens")).toHaveValue("08:00");
  await page.getByLabel("Monday opens").fill("18:00");
  await page.getByLabel("Monday closes").fill("09:00");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Monday: Closing must come after opening.")).toBeVisible();
  await page.getByLabel("Monday opens").fill("08:00");
  await page.getByLabel("Monday closes").fill("17:00");
  await page.getByRole("button", { name: "Copy Monday to Tuesday–Friday" }).click();
  await expect(page.getByLabel("Friday closes")).toHaveValue("17:00");
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

  // 4. One service to start with, another added.
  await step(4);
  await expect(page.getByRole("group", { name: /^Service \d+$/ })).toHaveCount(1);
  await page.getByRole("group", { name: "Service 1" }).getByLabel("Name").fill("Výběrová káva");
  await page.getByRole("button", { name: "Add a service" }).click();
  await page.getByRole("group", { name: "Service 2" }).getByLabel("Name").fill("Domácí dorty");
  await page.getByRole("button", { name: "Continue" }).click();

  // 5. Photos, uploaded at once.
  await step(5);
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
  // Decorative to start with; the first photo gets a description instead. The photos appear
  // once uploaded and processed, so this waits as long as the other upload tests.
  const decorative = page.getByLabel("Decorative, no description needed");
  await expect(decorative).toHaveCount(2, { timeout: 20_000 });
  await expect(decorative.last()).toBeChecked();
  await expect(page.getByLabel("What is in the photo")).toHaveCount(0);
  await decorative.first().uncheck();
  await page.getByLabel("What is in the photo").fill("Kavárna u okna");
  await page.getByRole("button", { name: "Continue" }).click();

  // 6. Pages: the café's suggestion.
  await step(6);
  await expect(page.getByLabel("About us")).toBeChecked();
  await expect(page.getByLabel("Team")).not.toBeChecked();
  await page.getByRole("button", { name: "Continue" }).click();

  // 7. The preview, then the site.
  await step(7);
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
