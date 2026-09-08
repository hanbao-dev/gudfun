import { defineQueriesWithType, defineQueryWithType } from "@rocicorp/zero";
import { zql, type Schema } from "./zero-schema.gen.ts";
import type { QueryContext } from "./context.ts";

const defineQuery = defineQueryWithType<Schema, QueryContext>();
const defineQueries = defineQueriesWithType<Schema>();
function requireUser(ctx: QueryContext) {
  if (!ctx.userId) throw new Error("Unauthorized");
  return ctx.userId;
}
function requireAdmin(ctx: QueryContext) {
  requireUser(ctx);
  if (!ctx.isAdmin) throw new Error("Admin access required");
}
export const queries = defineQueries({
  users: {
    self: defineQuery(({ ctx }) =>
      zql.user.where("id", requireUser(ctx)).one(),
    ),
  },
  shows: {
    current: defineQuery(({ ctx }) => {
      const userId = requireUser(ctx);
      return zql.show
        .where("isActive", true)
        .where(({ or, cmp, exists }) =>
          or(
            cmp("isPublic", true),
            exists("grants", (grant) =>
              grant.whereExists("group", (group) =>
                group.whereExists("members", (member) =>
                  member.where("userId", userId),
                ),
              ),
            ),
          ),
        )
        .related("segments", (segments) => segments.where("isCurrent", true))
        .one();
    }),
  },
  admin: {
    shows: defineQuery(({ ctx }) => {
      requireAdmin(ctx);
      return zql.show
        .orderBy("title", "asc")
        .related("grants")
        .related("segments", (q) =>
          q.orderBy("position", "asc").orderBy("id", "asc"),
        );
    }),
    groups: defineQuery(({ ctx }) => {
      requireAdmin(ctx);
      return zql.group.orderBy("name", "asc").related("members");
    }),
    users: defineQuery(({ ctx }) => {
      requireAdmin(ctx);
      return zql.user.orderBy("name", "asc");
    }),
  },
});
