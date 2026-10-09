import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ["src/**/*.test.ts"],
    // Publishing never asks other websites from tests; tests that check outside links pass a
    // fetch of their own (safe-publishing design.md decision 3).
    env: { PUBLISH_CHECK_OUTSIDE_LINKS: "false" },
  },
});
