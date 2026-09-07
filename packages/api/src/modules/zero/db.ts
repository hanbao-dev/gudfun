import { zeroDrizzle } from "@rocicorp/zero/server/adapters/drizzle";
import { schema, type Schema } from "zero";
import { db } from "database";
import type { ZQLDatabase } from "@rocicorp/zero/server";

export const dbProvider: ZQLDatabase<Schema, any> = zeroDrizzle(schema, db);
