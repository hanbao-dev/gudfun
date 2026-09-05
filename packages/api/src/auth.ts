import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "database";

export const auth = betterAuth({
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: {
    twitter: {
      clientId: "",
      clientSecret: "",
    },
  },
});
