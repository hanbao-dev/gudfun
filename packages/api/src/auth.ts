import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { db, schema } from "database";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const webOrigin = requiredEnv("WEB_ORIGIN");

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [username({ displayUsername: false })],
  socialProviders: {
    twitter: {
      clientId: requiredEnv("TWITTER_CLIENT_ID"),
      clientSecret: requiredEnv("TWITTER_CLIENT_SECRET"),
      overrideUserInfoOnSignIn: true,
    },
  },
  trustedOrigins: [webOrigin],
});
