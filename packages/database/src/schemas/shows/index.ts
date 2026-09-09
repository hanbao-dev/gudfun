import { sql } from "drizzle-orm";
import * as t from "drizzle-orm/pg-core";
import { group } from "../groups";

export const show = t.pgTable(
  "show",
  {
    id: t.text().primaryKey(),
    title: t.text().notNull(),
    isPublic: t.boolean("is_public").notNull().default(false),
    status: t.text().notNull().default("draft"),
    scheduledStart: t.timestamp("scheduled_start", { withTimezone: true }),
    actualStart: t.timestamp("actual_start", { withTimezone: true }),
    actualEnd: t.timestamp("actual_end", { withTimezone: true }),
    features: t.jsonb().$type<string[]>().notNull().default([]),
  },
  (table) => [
    t
      .uniqueIndex("show_one_live_idx")
      .on(table.status)
      .where(sql`${table.status} = 'live'`),
    t.index("show_status_schedule_idx").on(table.status, table.scheduledStart),
    t.check(
      "show_lifecycle",
      sql`(
      (${table.status} = 'draft' AND ${table.scheduledStart} IS NULL AND ${table.actualStart} IS NULL AND ${table.actualEnd} IS NULL) OR
      (${table.status} = 'scheduled' AND ${table.scheduledStart} IS NOT NULL AND ${table.actualStart} IS NULL AND ${table.actualEnd} IS NULL) OR
      (${table.status} = 'live' AND ${table.actualEnd} IS NULL) OR
      (${table.status} = 'ended' AND ${table.actualEnd} IS NOT NULL)
    ) AND (${table.actualStart} IS NULL OR ${table.actualEnd} IS NULL OR ${table.actualEnd} >= ${table.actualStart})`,
    ),
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
    configuration: t
      .jsonb()
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
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
