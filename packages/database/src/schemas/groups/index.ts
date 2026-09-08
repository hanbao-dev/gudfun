import * as t from "drizzle-orm/pg-core";
import { user } from "../auth";

export const group = t.pgTable("group", {
  id: t.text().primaryKey(),
  name: t.text().notNull(),
});

export const groupMember = t.pgTable(
  "group_member",
  {
    groupId: t
      .text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    t.primaryKey({ columns: [table.groupId, table.userId] }),
    t.index("group_member_user_idx").on(table.userId),
  ],
);
