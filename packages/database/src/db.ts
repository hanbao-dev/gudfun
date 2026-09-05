import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schemas";

export const db = drizzle({
  connection: {
    user: "",
    password: "",
    database: "",
    host: "",
    port: "",
  },
  schema,
});

export * from "./schemas";
