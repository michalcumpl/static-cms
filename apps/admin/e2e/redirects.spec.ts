import { expect, paths, state, test } from "./fixtures";

// The former tabs' addresses lead to their places in the panel (project-page spec, "Old
// addresses").

const base = () => `/p/${state().projectId}`;

test("A bookmarked History tab", async ({ page }) => {
  await page.goto(`${base()}/history?lang=en`);
  await expect(page).toHaveURL(`${base()}/publish/versions?lang=en`);
});

test("A site field from an old link", async ({ page }) => {
  await page.goto(`${base()}/settings?focus=site-settings-description`);
  await expect(page).toHaveURL(`${paths().website}?focus=site-settings-description`);
  await expect(
    page.getByRole("region", { name: "Site", exact: true }).getByLabel("Description"),
  ).toBeFocused();
});

for (const [old, to] of [
  ["/settings", "/business"],
  ["/settings?focus=business-settings-name", "/business?focus=business-settings-name"],
  ["/pages", "/website/pages"],
  ["/pages?lang=cs", "/website/pages?lang=cs"],
  ["/languages", "/website/languages"],
  ["/publishing", "/publish"],
  ["/history", "/publish/versions"],
] as const) {
  test(`${old} leads to ${to}`, async ({ request }) => {
    const response = await request.get(`${base()}${old}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe(`${base()}${to}`);
  });
}

test("a version's old address leads to it under Versions", async ({ page }) => {
  // SvelteKit's own trailing-slash redirect may come first; the browser follows them all.
  await page.goto(`${base()}/history/v_123/`);
  expect(new URL(page.url()).pathname).toBe(`${base()}/publish/versions/v_123/`);
});
