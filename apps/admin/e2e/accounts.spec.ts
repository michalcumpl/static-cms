import {
  canvas,
  caretAtEnd,
  expect,
  latestLink,
  paths,
  signIn,
  state,
  test,
  toolbarButton,
} from "./fixtures";

test.describe("signed out", () => {
  test.use({ anonymous: true });

  test("opening the editor asks to sign in, and the link leads back", async ({ page }) => {
    await page.goto(paths().edit());
    await expect(page).toHaveURL(/\/signin\?next=/);

    const since = Date.now();
    await page.getByLabel("Email address").fill(state().owner.email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByRole("status")).toContainText("Check your email");

    await page.goto(await latestLink(state().owner.email, since));
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(new RegExp(`${paths().edit()}$`));
    await expect(canvas(page).locator("[contenteditable=true]")).toBeVisible();
  });

  test("a used sign-in link is refused", async ({ page }) => {
    const since = Date.now();
    await page.goto("/signin");
    await page.getByLabel("Email address").fill(state().owner.email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    const link = await latestLink(state().owner.email, since);
    await page.goto(link);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto(link);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toHaveText("This sign-in link was already used.");
  });
});

test.describe("someone else's project", () => {
  test.use({ anonymous: true });

  test("is not found for a member of another workspace", async ({ page, context }) => {
    await signIn(context, state().outsider);
    // The editor renders in the browser only, so its 404 is a page, not an HTTP status.
    await page.goto(paths().edit());
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.locator(".site-canvas")).toHaveCount(0);
    // The overview is rendered on the server and answers with the status itself.
    const overview = await page.goto(paths().overview);
    expect(overview?.status()).toBe(404);
    const api = await page.request.get(paths().api);
    expect(api.status()).toBe(404);
    await page.goto("/");
    await expect(page.getByText(state().owner.email)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pekárna U Lípy" })).toHaveCount(0);
  });
});

test("an owner invites an editor, who signs in and edits", async ({ page, browser }) => {
  const editor = `michal+${Date.now()}@agency.cz`;
  const since = Date.now();
  await page.goto(`/w/${state().workspaceId}/members`);
  await page.getByLabel("Email address").fill(editor);
  await page.getByLabel("Role", { exact: true }).selectOption("editor");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByRole("status")).toContainText(`Invitation sent to ${editor}`);

  // The invited person, in their own browser session.
  const invited = await browser.newContext();
  const theirs = await invited.newPage();
  await theirs.goto(await latestLink(editor, since));
  await theirs.getByRole("button", { name: "Accept invitation" }).click();
  await expect(theirs.getByText(editor)).toBeVisible();
  await expect(theirs.getByRole("link", { name: "New project" })).toHaveCount(0);

  await theirs.getByRole("link", { name: "Edit" }).click();
  await caretAtEnd(theirs, canvas(theirs).locator(".hero h1"));
  await theirs.keyboard.type(" – i o víkendu");
  await toolbarButton(theirs, "Save").click();
  await expect(theirs.getByRole("toolbar", { name: "Editing" }).getByRole("status")).toHaveText(
    "Saved",
  );
  await invited.close();

  await page.goto(paths().preview);
  await expect(page.locator("h1")).toHaveText("Čerstvý chléb každé ráno – i o víkendu");
});
