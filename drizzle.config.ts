import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "packages/database/src/schemas/index.ts",
  out: "packages/database/src/migrations",
  dbCredentials: {
    user: "user",
    password: "password",
    database: "postgres",
    host: "localhost",
    port: 6434,
    ssl: false,
  },
});
