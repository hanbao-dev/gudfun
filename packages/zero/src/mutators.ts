import { defineMutatorsWithType, defineMutatorWithType } from "@rocicorp/zero";
import type { Schema } from "./zero-schema.gen.ts";
import type { QueryContext } from "./context.ts";
import { z } from "zod";

const defineMutator = defineMutatorWithType<Schema, QueryContext>();
const defineMutators = defineMutatorsWithType<Schema>();

export const mutators = defineMutators({
  user: {
    create: defineMutator(
      z.object({
        name: z.string(),
        email: z.string(),
      }),
      async ({ tx, ctx, args }) => {
        if (!ctx.userId) {
          throw new Error("Unauthorized");
        }
        await tx.mutate.user.insert({
          id: ctx.userId,
          name: args.name,
          email: args.email,
          emailVerified: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      },
    ),
  },
});
