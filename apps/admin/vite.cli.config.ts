// Builds the admin command (scripts/admin.ts) into dist/cli/admin.js, so the production image can
// run it without the development packages: `node dist/cli/admin.js <command>`. Svelte modules
// the command reaches are compiled and bundled; the production dependencies stay external.
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { $lib: fileURLToPath(new URL("./src/lib", import.meta.url)) } },
  ssr: { noExternal: ["svelte", /^@webmio\//] },
  build: {
    ssr: "scripts/admin.ts",
    // Beside the app's build, which `vite build` writes to dist/ first.
    outDir: "dist/cli",
    emptyOutDir: false,
    target: "node22",
    rollupOptions: { output: { entryFileNames: "admin.js" } },
  },
});
