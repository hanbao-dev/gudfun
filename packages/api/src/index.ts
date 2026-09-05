import { Elysia } from "elysia";
import { auth } from "./auth";
import { betterAuth } from "./macros/better-auth";
const app = new Elysia({ prefix: "/api" }).mount(auth.handler).use(betterAuth);

export type App = typeof app;
