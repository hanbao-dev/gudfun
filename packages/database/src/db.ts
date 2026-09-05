import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./relations";

const connectionString = "postgres://user:password@localhost:6434/postgres";

const pool = new Pool({
  connectionString,
});

export const db = drizzle({
  client: pool,
  relations,
});

db;

export { pool };
export * as schema from "./schemas";
export { relations };
