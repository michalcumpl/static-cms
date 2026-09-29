import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// One data folder per run, shared by the dev server, the global setup and the test workers
// (workers load this config again, so the path travels in an environment variable).
process.env.E2E_DATA_DIR ??= mkdtempSync(join(tmpdir(), "static-cms-e2e-"));
const dataDir = process.env.E2E_DATA_DIR;
const port = 5198;

export const e2eEnv = {
  DATABASE_PATH: join(dataDir, "app.db"),
  MEDIA_DIR: join(dataDir, "media"),
  OUTBOX_DIR: join(dataDir, "outbox"),
  // No Milestone 2 working copy to import.
  SITE_DATA_DIR: join(dataDir, "legacy"),
  ORIGIN: `http://localhost:${port}`,
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
  webServer: {
    command: `vite dev --port ${port} --strictPort`,
    url: `http://localhost:${port}/signin`,
    env: e2eEnv,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
