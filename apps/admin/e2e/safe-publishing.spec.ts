import { readSite, saveSite } from "../src/lib/server/site-documents";
import {
  expect,
  paths,
  resetPublishing,
  staleEdge,
  state,
  test,
  testDb,
  useWebmioHosting,
  webmioSite,
} from "./fixtures";

// The publish pipeline (safe-publishing): its steps, a failed verification that keeps the
// previous version online, and Try again. The fake edge is made stale, so it keeps serving the
// previous publish and verification fails after its short end-to-end deadline.

test.beforeEach(async () => {
  await resetPublishing();
  useWebmioHosting();
});
test.afterEach(() => staleEdge(false));

/** Saves a new home page heading. */
function changeHeading(heading: string): void {
  const { projectId, owner } = state();
  const saved = readSite(testDb(), projectId);
  if (!saved) throw new Error("no site");
  // biome-ignore lint/suspicious/noExplicitAny: the test edits one field.
  const document = structuredClone(saved.document) as { nodes: Record<string, any> };
  document.nodes.hero_1.heading.content = heading;
  const result = saveSite(testDb(), projectId, owner.id, document, saved.version);
  if (!result.ok) throw new Error("could not save");
}

test("a publish the website doesn't show fails, keeps the previous version, and Try again publishes", async ({
  page,
}) => {
  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  const address = page.getByRole("region", { name: "Address" });
  const history = page.getByRole("region", { name: "History" }).getByRole("listitem");
  await address.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(history.first()).toContainText("Live", { timeout: 15_000 });

  changeHeading("Nové pečivo");
  staleEdge(true);
  await address.getByRole("button", { name: "Publish", exact: true }).click();
  // The edge keeps the old version, so the publish waits in its last step, then fails.
  await expect(address.getByRole("button", { name: "Verifying the website…" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(address.getByText("Your previous version is still online.")).toBeVisible({
    timeout: 15_000,
  });
  await expect(history.first()).toContainText(
    "Publishing failed: The website didn't show the new version in time",
  );
  await expect(history.nth(1)).toContainText("Live");
  await page.goto(webmioSite("pekarna-u-lipy"));
  await expect(page.locator("h1").first()).not.toHaveText("Nové pečivo");

  // The edge catches up; Try again publishes the saved site.
  staleEdge(false);
  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("region", { name: "History" })
    .getByRole("button", { name: "Try again" })
    .click();
  await expect(history.first()).toContainText("Live", { timeout: 15_000 });
  await page.goto(webmioSite("pekarna-u-lipy"));
  await expect(page.locator("h1").first()).toHaveText("Nové pečivo");
});

test("the Publish button offers Try again after a failed publish", async ({ page }) => {
  await page.goto(paths().publishPage);
  await page.waitForLoadState("networkidle");
  const address = page.getByRole("region", { name: "Address" });
  await address.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(address.getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });

  changeHeading("Zase jinak");
  staleEdge(true);
  await address.getByRole("button", { name: "Publish", exact: true }).click();
  const tryAgain = address.getByRole("button", { name: "Try again" });
  await expect(tryAgain).toBeVisible({ timeout: 15_000 });
  staleEdge(false);
  await tryAgain.click();
  await expect(address.getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });
});
