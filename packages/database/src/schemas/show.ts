import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";
import { user } from "./auth";

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

export const show = t.pgTable(
  "show",
  {
    id: t.text().primaryKey(),
    title: t.text().notNull(),
    isActive: t.boolean("is_active").notNull().default(false),
    features: t.jsonb().$type<string[]>().notNull().default([]),
  },
  (table) => [
    t
      .uniqueIndex("show_one_active_idx")
      .on(table.isActive)
      .where(sql`${table.isActive} = true`),
  ],
);

export const showGroup = t.pgTable(
  "show_group",
  {
    showId: t
      .text("show_id")
      .notNull()
      .references(() => show.id, { onDelete: "cascade" }),
    groupId: t
      .text("group_id")
      .notNull()
      .references(() => group.id, { onDelete: "cascade" }),
  },
  (table) => [
    t.primaryKey({ columns: [table.showId, table.groupId] }),
    t.index("show_group_group_idx").on(table.groupId),
  ],
);

export const segment = t.pgTable(
  "segment",
  {
    id: t.text().primaryKey(),
    showId: t
      .text("show_id")
      .notNull()
      .references(() => show.id, { onDelete: "cascade" }),
    title: t.text().notNull(),
    type: t.text().notNull(),
    position: t.integer().notNull(),
    isCurrent: t.boolean("is_current").notNull().default(false),
  },
  (table) => [
    t.index("segment_show_position_idx").on(table.showId, table.position),
    t.check("segment_position_nonnegative", sql`${table.position} >= 0`),
    t
      .uniqueIndex("segment_one_current_idx")
      .on(table.showId)
      .where(sql`${table.isCurrent} = true`),
  ],
);
