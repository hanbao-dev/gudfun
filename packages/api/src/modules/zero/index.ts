// Controller handle HTTP related eg. routing, request validation
import { Elysia } from "elysia";
import { betterAuth } from "../../macros/better-auth";
import { handleMutateRequest, handleQueryRequest } from "@rocicorp/zero/server";
import { mustGetMutator, mustGetQuery } from "@rocicorp/zero";
import { mutators, queries, schema } from "zero";
import { dbProvider } from "./db";

export const zero = new Elysia({ prefix: "/zero" })
  .use(betterAuth)
  .post(
    "/query",
    async ({ request, user }) => {
      console.log("user", user);
      console.log("request", request);
      const result = await handleQueryRequest({
        handler: (name, args) => {
          const query = mustGetQuery(queries, name);
          return query.fn({ args, ctx: { userId: user.id } });
        },
        schema,
        request,
        userID: user.id,
      });

      return result;
    },
    {
      auth: true,
    },
  )
  .post(
    "/mutate",
    async ({ request, user: { id: userId } }) => {
      const result = await handleMutateRequest({
        dbProvider,
        handler: (transact) =>
          transact((tx, name, args) => {
            const mutator = mustGetMutator(mutators, name);
            return mutator.fn({
              args,
              tx,
              ctx: { userId },
            });
          }),
        request,
        userID: userId,
      });
      return result;
    },
    {
      auth: true,
    },
  );
