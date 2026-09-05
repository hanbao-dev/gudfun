import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { db, schema } from "database";

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [username({ displayUsername: false })],
  socialProviders: {
    twitter: {
      clientId: "",
      clientSecret: "",
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile) => ({
        username: profile.data.username,
      }),
    },
  },
  trustedOrigins: ["http://localhost:5173"],
});
