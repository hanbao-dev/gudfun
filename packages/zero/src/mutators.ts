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
  segmentTypeSchema,
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
  const show = await tx.run(zql.show.where("id", id).one());
  if (!show) throw new Error("Show no longer exists");
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
    create: defineMutator(showInput, async ({ tx, ctx, args }) => {
      await requireAdmin(tx, ctx);
      await tx.mutate.show.insert({ ...args, isActive: false });
    }),
    update: defineMutator(showInput, async ({ tx, ctx, args }) => {
      await requireAdmin(tx, ctx);
      await requireShow(tx, args.id);
      await tx.mutate.show.update(args);
    }),
    setActive: defineMutator(
      z.object({ id: idSchema, isActive: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireShow(tx, args.id);
        if (args.isActive) {
          const other = await tx.run(
            zql.show.where("isActive", true).where("id", "!=", args.id).one(),
          );
          if (other) throw new Error("Deactivate the current show first");
        }
        // The partial unique index also rejects concurrent activations.
        await tx.mutate.show.update(args);
      },
    ),
    access: defineMutator(
      z.object({ showId: idSchema, groupId: idSchema, enabled: z.boolean() }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireShow(tx, args.showId);
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
      z.object({
        id: idSchema,
        showId: idSchema,
        title: titleSchema,
        type: segmentTypeSchema,
      }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireShow(tx, args.showId);
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
    reorder: defineMutator(
      z.object({ showId: idSchema, ids: z.array(idSchema) }),
      async ({ tx, ctx, args }) => {
        await requireAdmin(tx, ctx);
        await requireShow(tx, args.showId);
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
        await requireShow(tx, args.showId);
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
