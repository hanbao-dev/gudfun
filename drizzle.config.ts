import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "packages/database/src/schemas/index.ts",
  out: "packages/database/src/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
});
