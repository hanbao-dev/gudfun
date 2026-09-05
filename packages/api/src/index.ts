import { Elysia } from "elysia";
import { auth } from "./auth";
import { betterAuth } from "./macros/better-auth";
import { cors } from "@elysia/cors";

const app = new Elysia()
  .use(cors())
  .mount(auth.handler)
  .use(betterAuth)
  .listen(3000);

export type App = typeof app;
