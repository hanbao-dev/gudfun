// Controller handle HTTP related eg. routing, request validation
import { Elysia } from "elysia";
import { betterAuth } from "../../macros/better-auth";
import { handleMutateRequest, handleQueryRequest } from "@rocicorp/zero/server";
import { mustGetMutator, mustGetQuery } from "@rocicorp/zero";
import { mutators, queries, schema } from "zero";
import { db } from "database";
import { dbProvider } from "./db";

export const zero = new Elysia({ prefix: "/zero" })
  .use(betterAuth)
  .post(
    "/query",
    async ({ request, user }) => {
      // Resolve privileges from the database, never from client arguments or a cached session.
      const currentUser = await db.query.user.findFirst({
        where: { id: user.id },
      });
      const result = await handleQueryRequest({
        handler: (name, args) => {
          const query = mustGetQuery(queries, name);
          return query.fn({
            args,
            ctx: { userId: user.id, isAdmin: currentUser?.isAdmin === true },
          });
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
