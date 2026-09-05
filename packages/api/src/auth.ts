import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { db, schema } from "database";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  socialProviders: {
    twitter: {
      clientId: "",
      clientSecret: "",
    },
  },
  trustedOrigins: ["http://localhost:5173"],
});
