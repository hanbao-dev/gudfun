import { afterAll, beforeAll, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import {
  ZQLDatabase,
  executePostgresQuery,
  type DBTransaction,
} from "@rocicorp/zero/server";
import { mustGetMutator, type ReadonlyJSONValue } from "@rocicorp/zero";
import { schema, zql } from "../src/zero-schema.gen";
import { mutators } from "../src/mutators";
import type { QueryContext } from "../src/context";
import { queries } from "../src/queries";
import {
  featuresSchema,
  segmentTypeSchema,
  hasShowFeature,
} from "../src/show-definitions";

const pg = new PGlite();
const database = new ZQLDatabase(
  {
    transaction: (callback) =>
      pg.transaction(async (wrappedTransaction) => {
        const tx: DBTransaction<typeof wrappedTransaction> = {
          wrappedTransaction,
          query: async (sql, args) =>
            (await wrappedTransaction.query<Record<string, unknown>>(sql, args))
              .rows,
          runQuery: (ast, format, schema, serverSchema) =>
            executePostgresQuery(tx, ast, format, schema, serverSchema),
        };
        return callback(tx);
      }),
  },
  schema,
);
const admin = { userId: "admin", isAdmin: true };
async function mutate(
  name: string,
  args: ReadonlyJSONValue,
  ctx: QueryContext = admin,
) {
  return database.transaction((tx) =>
    mustGetMutator(mutators, name).fn({ tx, args, ctx }),
  );
}
async function current(userId: string) {
  return database.run(
    queries.shows.current.fn({ args: undefined, ctx: { userId } }),
  );
}
beforeAll(async () => {
  const dir = new URL("../../database/src/migrations/", import.meta.url);
  for (const name of (await readdir(dir)).sort()) {
    if (/^\d/.test(name))
      await pg.exec(
        await readFile(new URL(`${name}/migration.sql`, dir), "utf8"),
      );
  }
  for (const id of ["admin", "member", "outsider"]) {
    await pg.query(
      'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, is_admin) VALUES ($1, $1, $2, false, now(), now(), $3)',
      [id, `${id}@example.test`, id === "admin"],
    );
  }
}, 30000);
afterAll(() => pg.close());

test("shared registries reject unknown and duplicate values", () => {
  expect(segmentTypeSchema.safeParse("placeholder").success).toBe(true);
  expect(segmentTypeSchema.safeParse("q-and-a").success).toBe(false);
  expect(featuresSchema.safeParse(["unknown"]).success).toBe(false);
  expect(featuresSchema.safeParse(["chat", "chat"]).success).toBe(false);
  expect(hasShowFeature({ features: ["chat"] }, "chat")).toBe(true);
  expect(hasShowFeature({ features: [] }, "reactions")).toBe(false);
});

test("authentication and admin authorization cannot be bypassed with context claims", async () => {
  expect(() =>
    queries.shows.current.fn({ args: undefined, ctx: { userId: undefined } }),
  ).toThrow("Unauthorized");
  for (const query of [
    queries.admin.shows,
    queries.admin.groups,
    queries.admin.users,
  ]) {
    expect(() =>
      query.fn({ args: undefined, ctx: { userId: "member" } }),
    ).toThrow("Admin access required");
  }
  const cases: [string, ReadonlyJSONValue][] = [
    ["groups.create", { id: "bad", name: "bad" }],
    ["groups.rename", { id: "bad", name: "bad" }],
    ["groups.remove", { id: "bad" }],
    ["groups.membership", { groupId: "bad", userId: "member", enabled: true }],
    ["shows.create", { id: "bad", title: "bad", features: [], isPublic: true }],
    ["shows.update", { id: "bad", title: "bad", features: [] }],
    ["shows.setVisibility", { id: "bad", isPublic: true }],
    ["shows.setActive", { id: "bad", isActive: true }],
    ["shows.access", { showId: "bad", groupId: "bad", enabled: true }],
    [
      "segments.add",
      { id: "bad", showId: "bad", title: "bad", type: "placeholder" },
    ],
    ["segments.reorder", { showId: "bad", ids: [] }],
    ["segments.setCurrent", { showId: "bad", id: null }],
  ];
  for (const [name, args] of cases) {
    await expect(
      mutate(name, args, { userId: "member", isAdmin: true }),
    ).rejects.toThrow("Admin access required");
  }
  expect(() => mustGetMutator(mutators, "user.create")).toThrow();
});

test("show lifecycle, membership and grants determine visibility", async () => {
  expect(await current("member")).toBeUndefined();
  await mutate("groups.create", { id: "g", name: "Audience" });
  await mutate("shows.create", {
    id: "s",
    title: "First show",
    isPublic: false,
    features: ["chat"],
  });
  await mutate("shows.access", { showId: "s", groupId: "g", enabled: true });
  await mutate("groups.membership", {
    groupId: "g",
    userId: "member",
    enabled: true,
  });
  expect(await current("member")).toBeUndefined();
  await mutate("shows.setActive", { id: "s", isActive: true });
  expect((await current("member"))?.title).toBe("First show");
  expect(await current("outsider")).toBeUndefined();
  expect(await current("admin")).toBeUndefined();
  await mutate("groups.membership", {
    groupId: "g",
    userId: "member",
    enabled: false,
  });
  expect(await current("member")).toBeUndefined();
  await mutate("groups.membership", {
    groupId: "g",
    userId: "member",
    enabled: true,
  });
  await mutate("shows.access", { showId: "s", groupId: "g", enabled: false });
  expect(await current("member")).toBeUndefined();
  await mutate("shows.access", { showId: "s", groupId: "g", enabled: true });
  // Access is the union of grants across generic groups.
  await mutate("groups.create", { id: "g2", name: "Another audience" });
  await mutate("groups.membership", {
    groupId: "g2",
    userId: "member",
    enabled: true,
  });
  await mutate("shows.access", { showId: "s", groupId: "g2", enabled: true });
  await mutate("shows.access", { showId: "s", groupId: "g", enabled: false });
  expect((await current("member"))?.id).toBe("s");
  await mutate("groups.remove", { id: "g2" });
  expect(await current("member")).toBeUndefined();
  await mutate("shows.access", { showId: "s", groupId: "g", enabled: true });
  await mutate("shows.update", {
    id: "s",
    title: "Renamed",
    features: ["reactions"],
  });
  expect((await current("member"))?.features).toEqual(["reactions"]);
});

test("public shows need no groups; switching visibility restores private access", async () => {
  await mutate(
    "shows.setVisibility",
    { id: "s", isPublic: true },
    { userId: "admin" },
  );
  expect((await current("outsider"))?.id).toBe("s");
  expect((await current("admin"))?.id).toBe("s");
  expect(() =>
    queries.shows.current.fn({ args: undefined, ctx: { userId: undefined } }),
  ).toThrow("Unauthorized");
  await mutate("shows.setVisibility", { id: "s", isPublic: false });
  expect(await current("outsider")).toBeUndefined();
  expect((await current("member"))?.id).toBe("s");
  await mutate("shows.setActive", { id: "s", isActive: false });
  await mutate("shows.create", {
    id: "public",
    title: "Open show",
    features: [],
    isPublic: true,
  });
  expect(await current("outsider")).toBeUndefined();
  await mutate("shows.setActive", { id: "public", isActive: true });
  for (const user of ["admin", "member", "outsider"])
    expect((await current(user))?.id).toBe("public");
  await mutate("shows.setVisibility", { id: "public", isPublic: false });
  for (const user of ["admin", "member", "outsider"])
    expect(await current(user)).toBeUndefined();
  await expect(
    mutate("shows.setVisibility", { id: "public", isPublic: "public" }),
  ).rejects.toThrow();
  await mutate("shows.setActive", { id: "public", isActive: false });
  await mutate("shows.setActive", { id: "s", isActive: true });
});

test("activation is enforced by both mutations and the database", async () => {
  await mutate("shows.create", {
    id: "s2",
    title: "Second",
    features: [],
    isPublic: false,
  });
  await expect(
    mutate("shows.setActive", { id: "s2", isActive: true }),
  ).rejects.toThrow("Deactivate");
  await expect(
    pg.query('UPDATE "show" SET is_active = true WHERE id = $1', ["s2"]),
  ).rejects.toThrow();
  await mutate("shows.setActive", { id: "s", isActive: false });
  expect(await current("member")).toBeUndefined();
  await mutate("shows.setActive", { id: "s2", isActive: true });
  await mutate("shows.setActive", { id: "s2", isActive: false });
  await mutate("shows.setActive", { id: "s", isActive: true });
});

test("segments are ordered, scoped to their show, and have one current selection", async () => {
  for (const id of ["a", "b"])
    await mutate("segments.add", {
      id,
      showId: "s",
      title: id,
      type: "placeholder",
    });
  await mutate("segments.add", {
    id: "foreign",
    showId: "s2",
    title: "Other",
    type: "placeholder",
  });
  await expect(
    mutate("segments.add", {
      id: "invalid",
      showId: "s",
      title: "Invalid",
      type: "unknown",
    }),
  ).rejects.toThrow();
  await mutate("segments.reorder", { showId: "s", ids: ["b", "a"] });
  expect(
    (
      await database.run(
        zql.segment.where("showId", "s").orderBy("position", "asc"),
      )
    ).map((s) => s.id),
  ).toEqual(["b", "a"]);
  for (const ids of [["a"], ["a", "a"], ["a", "foreign"]])
    await expect(
      mutate("segments.reorder", { showId: "s", ids }),
    ).rejects.toThrow();
  await mutate("segments.setCurrent", { showId: "s", id: "a" });
  await expect(
    mutate("segments.setCurrent", { showId: "s", id: "foreign" }),
  ).rejects.toThrow();
  await expect(
    pg.query("UPDATE segment SET is_current = true WHERE id = $1", ["b"]),
  ).rejects.toThrow();
  await mutate("segments.setCurrent", { showId: "s", id: "b" });
  expect((await current("member"))?.segments.map((s) => s.id)).toEqual(["b"]);
  await mutate("segments.setCurrent", { showId: "s", id: null });
  expect((await current("member"))?.segments).toEqual([]);
});

test("group deletion removes memberships and grants; revoked admins cannot write", async () => {
  await mutate("groups.rename", { id: "g", name: "Renamed audience" });
  await mutate("groups.remove", { id: "g" });
  expect(await current("member")).toBeUndefined();
  expect(await database.run(zql.groupMember)).toEqual([]);
  expect(await database.run(zql.showGroup)).toEqual([]);
  await pg.query('UPDATE "user" SET is_admin = false WHERE id = $1', ["admin"]);
  await expect(
    mutate("groups.create", { id: "revoked", name: "No" }),
  ).rejects.toThrow("Admin access required");
});
