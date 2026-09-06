import { defineQueriesWithType, defineQueryWithType } from "@rocicorp/zero";
import { zql, type Schema } from "./zero-schema.gen.ts";
import type { QueryContext } from "./context.ts";

const defineQuery = defineQueryWithType<Schema, QueryContext>();
const defineQueries = defineQueriesWithType<Schema>();

export const queries = defineQueries({
  users: {
    self: defineQuery(({ ctx }) => {
      return zql.user.where("id", ctx.userId);
    }),
  },
});
