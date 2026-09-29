import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// A fresh, empty working copy for every run: the server seeds it from the demo fixture.
const dataDir = mkdtempSync(join(tmpdir(), "static-cms-e2e-"));
const port = 5198;

export default defineConfig({
  testDir: "e2e",
  // All tests share one working copy, and each resets it first, so they run one at a time.
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
  webServer: {
    command: `vite dev --port ${port} --strictPort`,
    url: `http://localhost:${port}/api/site`,
    env: { SITE_DATA_DIR: dataDir },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
