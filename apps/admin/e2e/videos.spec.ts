import type { Page } from "@playwright/test";
import {
  addBlockAfterCaret,
  canvas,
  caretAtEnd,
  expect,
  openEditor,
  paths,
  test,
} from "./fixtures";

// Videos on the canvas, the Video panel, and click-to-play in the preview (video design
// decision 4).

const toolbar = (page: Page) => page.getByRole("toolbar", { name: "Editing" });
const videoPanel = (page: Page) => page.getByRole("region", { name: "Video", exact: true });
const videos = (page: Page) => canvas(page).locator("section.videos .video-item");

async function insertVideos(page: Page) {
  await openEditor(page, paths().edit("page_contact"));
  await caretAtEnd(page, canvas(page).locator(".rich-text p").last());
  await addBlockAfterCaret(page, "Videos");
}

async function addFilm(page: Page) {
  // The thumbnail comes from YouTube through our server; here, a library image stands in.
  const [image] = (await (await page.request.get(paths().library)).json()) as {
    key: string;
    width: number;
    height: number;
  }[];
  await page.route(/\/media\/video-thumbnail$/, (route) =>
    route.fulfill({ status: 201, json: { ...image, originalName: "youtube-wNdrFte2T4w.jpg" } }),
  );
  await insertVideos(page);
  await page.keyboard.type("Medvídku, vypravuj!");
  const address = videoPanel(page).getByLabel("Address on YouTube or Vimeo");
  await address.fill("https://youtu.be/wNdrFte2T4w");
  await address.press("Enter");
  await expect(videoPanel(page).getByRole("status")).toContainText("YouTube video wNdrFte2T4w");
  // The video gets the provider's picture as its poster.
  await expect(videos(page).first().locator("img")).toBeVisible();
  await toolbar(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(toolbar(page).getByRole("status").first()).toHaveText("Saved");
}

test("insert a videos block: one video, no player on the canvas", async ({ page }) => {
  await insertVideos(page);
  await expect(videos(page)).toHaveCount(1);
  await expect(canvas(page).locator("iframe")).toHaveCount(0);
  await expect(videoPanel(page).getByText("No address yet.")).toBeVisible();
});

test("Add a film", async ({ page }) => {
  await addFilm(page);
  await expect(videos(page).first().locator(".video-title-field")).toHaveText(
    "Medvídku, vypravuj!",
  );
  const contact = await (await page.request.get(`${paths().preview}kontakt/`)).text();
  expect(contact).toContain(
    '<a class="video-play" href="https://www.youtube.com/watch?v=wNdrFte2T4w">',
  );
  expect(contact).toContain("Přehrát: Medvídku, vypravuj!");
  expect(contact).toMatch(/<img class="video-poster" [^>]*alt=""/);
});

test("Not a video address", async ({ page }) => {
  await insertVideos(page);
  const address = videoPanel(page).getByLabel("Address on YouTube or Vimeo");
  await address.fill("https://www.youtube.com/@anideti");
  await address.press("Enter");
  await expect(videoPanel(page).getByRole("alert")).toHaveText(
    "Paste the address of a video on YouTube or Vimeo.",
  );
  // The address isn't stored: the problems panel still says the video needs one.
  await expect(
    page.getByRole("region", { name: "Problems" }).getByText(/needs the address of a video/),
  ).toBeVisible();
});

test("Press play: nothing from YouTube before, the player after", async ({ page }) => {
  await addFilm(page);
  const providerRequests: string[] = [];
  page.on("request", (request) => {
    if (/youtube|ytimg|vimeo/.test(request.url())) providerRequests.push(request.url());
  });
  // The player isn't fetched for real: the test stays offline.
  await page.route(/youtube-nocookie\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<p>player</p>" }),
  );
  await page.goto(`${paths().preview}kontakt/`);
  await page.waitForLoadState("networkidle");
  expect(providerRequests).toEqual([]);
  await page.getByRole("link", { name: "Přehrát: Medvídku, vypravuj!" }).click();
  const frame = page.locator("iframe.video-frame");
  await expect(frame).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/wNdrFte2T4w?autoplay=1",
  );
  await expect(frame).toHaveAttribute("title", "Medvídku, vypravuj!");
  expect(page.url()).toContain("/preview/kontakt/");
});
