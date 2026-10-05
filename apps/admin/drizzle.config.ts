import { defineConfig } from "drizzle-kit";

// `pnpm --filter @webmio/admin db:generate` writes a new SQL migration into drizzle/
// after a schema change. The server applies pending migrations when it starts.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/server/db/schema.ts",
  out: "./drizzle",
});
