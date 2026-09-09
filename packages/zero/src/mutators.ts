import {
  defineMutatorsWithType,
  defineMutatorWithType,
  type Transaction,
} from "@rocicorp/zero";
import { zql, type Schema } from "./zero-schema.gen.ts";
import type { QueryContext } from "./context.ts";
import { z } from "zod";
import {
  featuresSchema,
  idSchema,
  segmentConfigurationSchema,
  assertTransition,
  titleSchema,
} from "./show-definitions";

const defineMutator = defineMutatorWithType<Schema, QueryContext>();
const defineMutators = defineMutatorsWithType<Schema>();

// Re-read on every transaction, including the authoritative server execution.
export async function requireAdmin(tx: Transaction<Schema>, ctx: QueryContext) {
  if (!ctx.userId) throw new Error("Unauthorized");
  const user = await tx.run(zql.user.where("id", ctx.userId).one());
  if (!user?.isAdmin) throw new Error("Admin access required");
}
async function requireShow(tx: Transaction<Schema>, id: string) {
  // Serialize lifecycle and segment edits for this show, including repeated commands.
  if (tx.location === "server")
    await tx.dbTransaction.query(
      'SELECT id FROM "show" WHERE id = $1 FOR UPDATE',
      [id],
    );
  const show = await tx.run(zql.show.where("id", id).one());
  if (!show) throw new Error("Show no longer exists");
  return show;
}
async function requireEditableShow(tx: Transaction<Schema>, id: string) {
  const show = await requireShow(tx, id);
  if (show.status === "ended") throw new Error("Ended shows are read-only");
  return show;
}
const showInput = z.object({
  id: idSchema,
  title: titleSchema,
  features: featuresSchema,
});
export const mutators = defineMutators({
  groups: {
    create: defineMutator(
      z.object({ id: idSchema, name: titleSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await tx.mutate.group.insert(args);
      },
    ),
    rename: defineMutator(
      z.object({ id: idSchema, name: titleSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        if (!(await tx.run(zql.group.where("id", args.id).one())))
          throw new Error("Group no longer exists");
        await tx.mutate.group.update(args);
      },
    ),
    remove: defineMutator(
      z.object({ id: idSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        // Explicit child deletes also keep optimistic state consistent with SQL cascades.
        for (const row of await tx.run(
          zql.groupMember.where("groupId", args.id),
        ))
          await tx.mutate.groupMember.delete(row);
        for (const row of await tx.run(zql.showGroup.where("groupId", args.id)))
          await tx.mutate.showGroup.delete(row);
        await tx.mutate.group.delete(args);
      },
    ),
    membership: defineMutator(
      z.object({ groupId: idSchema, userId: idSchema, enabled: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        const { enabled, ...key } = args;
        if (
          !(await tx.run(zql.group.where("id", args.groupId).one())) ||
          !(await tx.run(zql.user.where("id", args.userId).one()))
        )
          throw new Error("Group or user no longer exists");
        if (enabled) await tx.mutate.groupMember.upsert(key);
        else await tx.mutate.groupMember.delete(key);
      },
    ),
  },
  shows: {
    create: defineMutator(
      showInput.extend({ isPublic: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await tx.mutate.show.insert({
          ...args,
          status: "draft",
          scheduledStart: null,
          actualStart: null,
          actualEnd: null,
        });
      },
    ),
    update: defineMutator(showInput, async ({ tx, ctx, args }) => {
      await requireAdmin(tx, ctx);
      await requireEditableShow(tx, args.id);
      await tx.mutate.show.update(args);
    }),
    setVisibility: defineMutator(
      z.object({ id: idSchema, isPublic: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.id);
        // Preserve grants when public so switching back restores the private audience.
        await tx.mutate.show.update(args);
      },
    ),
    schedule: defineMutator(
      z.object({
        id: idSchema,
        scheduledStart: z
          .number()
          .int()
          .min(0)
          .max(8640000000000000)
          .nullable(),
      }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        const show = await requireEditableShow(tx, args.id);
        const status = args.scheduledStart === null ? "draft" : "scheduled";
        assertTransition(show.status, status);
        await tx.mutate.show.update({ ...args, status });
      },
    ),
    start: defineMutator(
      z.object({ id: idSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        const show = await requireShow(tx, args.id);
        assertTransition(show.status, "live");
        if (show.status === "live") return;
        const other = await tx.run(
          zql.show.where("status", "live").where("id", "!=", args.id).one(),
        );
        if (other) throw new Error("End the current show first");
        // Only authoritative execution supplies persisted timing; no client timestamp input.
        await tx.mutate.show.update({
          id: args.id,
          status: "live",
          actualStart: tx.location === "server" ? Date.now() : null,
        });
      },
    ),
    end: defineMutator(
      z.object({ id: idSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        const show = await requireShow(tx, args.id);
        assertTransition(show.status, "ended");
        if (show.status === "ended") return;
        for (const row of await tx.run(
          zql.segment.where("showId", args.id).where("isCurrent", true),
        ))
          await tx.mutate.segment.update({ id: row.id, isCurrent: false });
        await tx.mutate.show.update({
          id: args.id,
          status: "ended",
          actualEnd:
            tx.location === "server"
              ? Math.max(Date.now(), show.actualStart ?? 0)
              : null,
        });
      },
    ),
    access: defineMutator(
      z.object({ showId: idSchema, groupId: idSchema, enabled: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        if (!(await tx.run(zql.group.where("id", args.groupId).one())))
          throw new Error("Group no longer exists");
        const { enabled, ...key } = args;
        if (enabled) await tx.mutate.showGroup.upsert(key);
        else await tx.mutate.showGroup.delete(key);
      },
    ),
  },
  segments: {
    add: defineMutator(
      z
        .object({
          id: idSchema,
          showId: idSchema,
          title: titleSchema,
        })
        .and(segmentConfigurationSchema),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        const last = await tx.run(
          zql.segment
            .where("showId", args.showId)
            .orderBy("position", "desc")
            .one(),
        );
        await tx.mutate.segment.insert({
          ...args,
          position: (last?.position ?? -1) + 1,
          isCurrent: false,
        });
      },
    ),
    update: defineMutator(
      z
        .object({ id: idSchema, showId: idSchema, title: titleSchema })
        .and(segmentConfigurationSchema),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        const segment = await tx.run(
          zql.segment.where("id", args.id).where("showId", args.showId).one(),
        );
        if (!segment) throw new Error("Segment no longer exists");
        await tx.mutate.segment.update(args);
      },
    ),
    remove: defineMutator(
      z.object({ id: idSchema, showId: idSchema }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        const segment = await tx.run(
          zql.segment.where("id", args.id).where("showId", args.showId).one(),
        );
        if (!segment) throw new Error("Segment no longer exists");
        // Selection is stored on the row, so deleting it clears selection atomically.
        await tx.mutate.segment.delete({ id: args.id });
      },
    ),
    reorder: defineMutator(
      z.object({ showId: idSchema, ids: z.array(idSchema) }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        const segments = await tx.run(zql.segment.where("showId", args.showId));
        if (
          new Set(args.ids).size !== args.ids.length ||
          segments.length !== args.ids.length ||
          segments.some((s) => !args.ids.includes(s.id))
        )
          throw new Error("Segments changed; refresh and try again");
        for (const [position, id] of args.ids.entries())
          await tx.mutate.segment.update({ id, position });
      },
    ),
    setCurrent: defineMutator(
      z.object({ showId: idSchema, id: idSchema.nullable() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireEditableShow(tx, args.showId);
        if (
          args.id &&
          !(await tx.run(
            zql.segment.where("id", args.id).where("showId", args.showId).one(),
          ))
        )
          throw new Error("Segment does not belong to this show");
        for (const row of await tx.run(
          zql.segment.where("showId", args.showId).where("isCurrent", true),
        ))
          await tx.mutate.segment.update({ id: row.id, isCurrent: false });
        if (args.id)
          await tx.mutate.segment.update({ id: args.id, isCurrent: true });
      },
    ),
  },
});
