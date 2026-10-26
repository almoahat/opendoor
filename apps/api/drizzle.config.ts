import { defineConfig } from "drizzle-kit";

// Load apps/api/.env when it exists (on your laptop); CI and AWS set variables directly
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts", // where the tables are described (Step 2b)
  out: "./drizzle", // where the generated SQL migrations go
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});