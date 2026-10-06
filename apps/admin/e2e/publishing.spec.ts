import type { Page } from "@playwright/test";
import {
  canvas,
  caretAtEnd,
  connectTestWorkspace,
  expect,
  fakeNetlify,
  fakeNetlifyToken,
  openEditor,
  paths,
  resetPublishing,
  signIn,
  state,
  test,
  testDb,
} from "./fixtures";

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });

test.beforeEach(() => resetPublishing());

/** What a visitor sees at a path of the project's live site on the fake Netlify. */
async function liveSite(path = "/"): Promise<string> {
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

test("publish from the editor, then see the published page", async ({ page }) => {
  await connectTestWorkspace();
  await openEditor(page);
  await toolbar(page).getByRole("button", { name: "Publish", exact: true }).click();
  await expect(toolbar(page).getByText(/^Published · sc-/)).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => liveSite()).toContain("<h1>Čerstvý chléb každé ráno</h1>");
});

test("unsaved changes: Save and publish saves first", async ({ page }) => {
  await connectTestWorkspace();
  await openEditor(page);
  await caretAtEnd(page, canvas(page).locator(".hero h1"));
  await page.keyboard.type(" – i v neděli");
  const button = toolbar(page).getByRole("button", { name: "Save and publish" });
  await expect(button).toBeVisible();
  await button.click();
  await expect(toolbar(page).getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
  await expect.poll(() => liveSite()).toContain("<h1>Čerstvý chléb každé ráno – i v neděli</h1>");
});

test("a site with errors isn't published", async ({ page }) => {
  await connectTestWorkspace();
  await openEditor(page);
  await canvas(page).locator(".hero img").click({ force: true });
  await page
    .getByRole("region", { name: "Image" })
    .getByLabel(/Description/)
    .fill("");
  await toolbar(page).getByRole("button", { name: "Save and publish" }).click();
  await expect(
    toolbar(page).getByText("Fix the problems first; the site can't be published with errors."),
  ).toBeVisible();
  expect(await liveSite()).toBe("");
});

test("without a Netlify connection, Publish is disabled and says why", async ({ page }) => {
  await openEditor(page);
  await expect(toolbar(page).getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  await expect(toolbar(page).getByRole("link", { name: "Not connected to Netlify" })).toBeVisible();
});

test("the dashboard publishes too", async ({ page }) => {
  await connectTestWorkspace();
  await page.goto(paths().dashboard);
  await page.waitForLoadState("networkidle");
  const section = page.getByRole("region", { name: "Your website" });
  await section.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(section.getByText(/^Published · /)).toBeVisible({ timeout: 15_000 });
});

test.describe("the Publishing page", () => {
  test("says an owner must connect Netlify when the workspace isn't connected", async ({
    page,
  }) => {
    await page.goto(paths().publishPage);
    await expect(page.getByRole("status").first()).toContainText("isn't connected to Netlify yet");
    await expect(page.getByRole("link", { name: "Open the Netlify settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toBeDisabled();
  });

  test("publishes, connects a domain and shows its DNS records", async ({ page }) => {
    await connectTestWorkspace();
    await page.goto(paths().publishPage);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const address = page
      .getByRole("region", { name: "Address" })
      .getByRole("link", { name: /netlify\.app/ })
      .first();
    await expect(address).toBeVisible({ timeout: 15_000 });

    // The domain is on the Website section's Domain page now.
    await page.goto(paths().domainPage);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Your domain").fill("https://anideti.example/kontakt");
    await page.getByRole("button", { name: "Connect" }).click();
    await expect(page.getByRole("alert")).toContainText("domain name only");

    await page.getByLabel("Your domain").fill("anideti.example");
    await page.getByRole("button", { name: "Connect" }).click();
    const domain = page.getByRole("region", { name: "Domain" });
    await expect(domain.getByRole("status")).toContainText("Waiting for DNS");
    const rows = domain
      .getByRole("table", { name: "DNS records to set at your registrar" })
      .getByRole("row");
    await expect(rows.nth(1)).toContainText("anideti.example");
    await expect(rows.nth(1)).toContainText("75.2.60.5");
    await expect(rows.nth(2)).toContainText("www.anideti.example");
    await expect(rows.nth(2)).toContainText(".netlify.app");

    await domain.getByRole("button", { name: "Disconnect" }).click();
    await expect(page.getByLabel("Your domain")).toBeVisible();
  });

  test("makes an earlier publish live again", async ({ page }) => {
    await connectTestWorkspace();
    await page.goto(paths().publishPage);
    await page.waitForLoadState("networkidle");
    const publish = page.getByRole("button", { name: "Publish", exact: true });
    const history = page.getByRole("region", { name: "History" }).getByRole("listitem");
    await publish.click();
    await expect(history).toHaveCount(1, { timeout: 15_000 });
    await expect(history.first()).toContainText("Live", { timeout: 15_000 });
    await publish.click();
    await expect(history).toHaveCount(2, { timeout: 15_000 });
    await expect(history.first()).toContainText("Live", { timeout: 15_000 });
    await history.nth(1).getByRole("button", { name: "Make live again" }).click();
    await expect(history.nth(1)).toContainText("Live");
    await expect(history.first().getByRole("button", { name: "Make live again" })).toBeVisible();
  });
});

test.describe("the workspace's Netlify settings", () => {
  const hostingPage = () => `/w/${state().workspaceId}/hosting`;

  test("an owner connects with a token and chooses the team", async ({ page }) => {
    await fakeNetlifyToken("nfp_owner_token", [
      { slug: "pekarna", name: "Pekárna" },
      { slug: "jana", name: "Personal" },
    ]);
    await page.goto(hostingPage());
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("status")).toContainText("Not connected");
    await page.getByLabel("Netlify personal access token").fill("nfp_owner_token");
    await page.getByRole("button", { name: "Check token" }).click();
    await page.getByLabel("Pekárna").check();
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Connected to the Netlify team Pekárna");
    expect(await page.content()).not.toContain("nfp_owner_token");
  });

  test("a token Netlify refuses is rejected", async ({ page }) => {
    await page.goto(hostingPage());
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Netlify personal access token").fill("nfp_unknown");
    await page.getByRole("button", { name: "Check token" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Netlify refused this token. Check it and try again.",
    );
    await expect(page.getByRole("status")).toContainText("Not connected");
  });

  test("an editor sees the connection but can't change it", async ({ page, context }) => {
    await connectTestWorkspace();
    const { users } = await import("../src/lib/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { addMember } = await import("../src/lib/server/members");
    const { newId } = await import("../src/lib/server/ids");
    const email = "petr.editor@example.cz";
    let editor = testDb().select().from(users).where(eq(users.email, email)).get();
    if (!editor) {
      editor = { id: newId("u"), email, createdAt: new Date(), uiLanguage: null };
      testDb().insert(users).values(editor).run();
      addMember(testDb(), state().workspaceId, editor.id, "editor");
    }
    await context.clearCookies();
    await signIn(context, { id: editor.id, email });
    await page.goto(hostingPage());
    await expect(page.getByRole("status")).toContainText("Connected to the Netlify team E2E team");
    await expect(
      page.getByText("Only owners of this workspace can connect or disconnect Netlify."),
    ).toBeVisible();
    await expect(page.getByLabel("Netlify personal access token")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Disconnect" })).toHaveCount(0);
  });
});
