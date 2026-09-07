import { Elysia } from "elysia";
import { auth } from "./auth";
import { betterAuth } from "./macros/better-auth";
import { cors } from "@elysia/cors";
import { zero } from "./modules/zero";

const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .mount(auth.handler)
  .use(betterAuth)
  .use(zero)
  .listen(3000);

export type App = typeof app;
