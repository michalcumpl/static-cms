import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { webmioPort } from "./e2e/ports";

// One data folder per run, shared by the dev server, the global setup and the test workers
// (workers load this config again, so the path travels in an environment variable).
process.env.E2E_DATA_DIR ??= mkdtempSync(join(tmpdir(), "webmio-e2e-"));
const dataDir = process.env.E2E_DATA_DIR;
const port = 5198;
/** The fake Netlify API the dev server publishes to (src/lib/server/publishing/fake-netlify.ts). */
const netlifyPort = 5197;
/** The import's fixture websites (e2e/fixture-sites.ts): the bakery, and a site built by a script. */
export const bakeryPort = 5196;
export const spaPort = 5195;

export const e2eEnv = {
  DATABASE_PATH: join(dataDir, "app.db"),
  MEDIA_DIR: join(dataDir, "media"),
  OUTBOX_DIR: join(dataDir, "outbox"),
  // No Milestone 2 working copy to import.
  SITE_DATA_DIR: join(dataDir, "legacy"),
  ORIGIN: `http://localhost:${port}`,
  NETLIFY_API_URL: `http://127.0.0.1:${netlifyPort}`,
  SECRET_KEY: "e2e-secret-key-that-is-long-enough-1234",
  // Webmio hosting on a folder, off until a test switches it on (e2e/fixtures.ts).
  WEBMIO_HOSTING_FAKE_DIR: join(dataDir, "webmio"),
  // No internet to ask other websites; the fakes answer verification at once, so a forced
  // failure needn't wait the real two minutes (safe-publishing).
  PUBLISH_CHECK_OUTSIDE_LINKS: "false",
  PUBLISH_VERIFY_DEADLINE_MS: "3000",
  // The dev server may import from the fixture sites (site-import); production never reads this.
  E2E_IMPORT_ALLOW_HOSTS: `127.0.0.1:${bakeryPort},127.0.0.1:${spaPort}`,
};
Object.assign(process.env, e2eEnv);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  // All tests share one database, and each resets its project first, so they run one at a time.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: `tsx e2e/fake-netlify-server.ts ${netlifyPort}`,
      url: `http://127.0.0.1:${netlifyPort}/__fake/uploads`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `tsx e2e/fake-webmio-server.ts ${webmioPort}`,
      url: `http://127.0.0.1:${webmioPort}/__fake/ready`,
      env: e2eEnv,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `tsx e2e/fixture-sites.ts ${bakeryPort} ${spaPort}`,
      url: `http://127.0.0.1:${bakeryPort}/robots.txt`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `vite dev --port ${port} --strictPort`,
      url: `http://localhost:${port}/signin`,
      env: e2eEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
