import type { Transaction } from "@rocicorp/zero";
import { type CustomMutatorDefs } from "@rocicorp/zero";
import type { QueryContext } from "./context";
import { type Schema } from "./schema";

export type Tx = Transaction<Schema>;

export function createMutators(context: QueryContext) {
  return {} as const satisfies CustomMutatorDefs;
}

export type Mutators = ReturnType<typeof createMutators>;
