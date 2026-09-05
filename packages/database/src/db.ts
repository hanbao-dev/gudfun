import { drizzle } from "drizzle-orm/node-postgres";

import { relations } from "./relations";

export const db = drizzle({
  connection: {
    user: "",
    password: "",
    database: "",
    host: "",
    port: 5432,
  },
  relations,
});

export * from "./schemas";
export { relations };
