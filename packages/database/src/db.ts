import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./relations";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

const pool = new Pool({
  connectionString,
});

export const db = drizzle({
  client: pool,
  relations,
});

export { pool };
export * as schema from "./schemas";
export { relations };
