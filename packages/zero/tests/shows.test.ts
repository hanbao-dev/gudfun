import { afterAll, beforeAll, beforeEach, expect, test } from "bun:test";
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

beforeEach(async () => {
  await pg.exec('TRUNCATE "show", "group" CASCADE');
  await pg.query('UPDATE "user" SET is_admin = (id = $1)', ["admin"]);
});
async function create(id = "s", isPublic = false) {
  await mutate("shows.create", { id, title: id, features: [], isPublic });
}
async function grant(showId = "s") {
  await mutate("groups.create", { id: "g", name: "Test audience" });
  await mutate("groups.membership", {
    groupId: "g",
    userId: "member",
    enabled: true,
  });
  await mutate("shows.access", { showId, groupId: "g", enabled: true });
}
async function add(id = "a", showId = "s") {
  await mutate("segments.add", {
    id,
    showId,
    title: id,
    type: "placeholder",
    configuration: {},
  });
}
async function next(userId: string) {
  return database.run(
    queries.shows.next.fn({ args: undefined, ctx: { userId } }),
  );
}
const row = (id = "s") => database.run(zql.show.where("id", id).one());

test("shared registries reject unknown and duplicate values", () => {
  expect(segmentTypeSchema.safeParse("placeholder").success).toBe(true);
  expect(segmentTypeSchema.safeParse("q-and-a").success).toBe(false);
  expect(featuresSchema.safeParse(["unknown"]).success).toBe(false);
  expect(featuresSchema.safeParse(["chat", "chat"]).success).toBe(false);
  expect(hasShowFeature({ features: ["chat"] }, "chat")).toBe(true);
});

test("every new mutation enforces transactional admin authorization", async () => {
  const cases: [string, ReadonlyJSONValue][] = [
    ["groups.create", { id: "bad", name: "bad" }],
    ["groups.rename", { id: "bad", name: "bad" }],
    ["groups.remove", { id: "bad" }],
    ["groups.membership", { groupId: "bad", userId: "member", enabled: true }],
    ["shows.create", { id: "bad", title: "bad", features: [], isPublic: true }],
    ["shows.update", { id: "bad", title: "bad", features: [] }],
    ["shows.setVisibility", { id: "bad", isPublic: true }],
    ["shows.schedule", { id: "bad", scheduledStart: 1800000000000 }],
    ["shows.start", { id: "bad" }],
    ["shows.end", { id: "bad" }],
    ["shows.access", { showId: "bad", groupId: "bad", enabled: true }],
    [
      "segments.add",
      {
        id: "bad",
        showId: "bad",
        title: "bad",
        type: "placeholder",
        configuration: {},
      },
    ],
    [
      "segments.update",
      {
        id: "bad",
        showId: "bad",
        title: "bad",
        type: "placeholder",
        configuration: {},
      },
    ],
    ["segments.remove", { id: "bad", showId: "bad" }],
    ["segments.reorder", { showId: "bad", ids: [] }],
    ["segments.setCurrent", { showId: "bad", id: null }],
  ];
  for (const [name, args] of cases) {
    await expect(
      mutate(name, args, { userId: "member", isAdmin: true }),
    ).rejects.toThrow("Admin access required");
    await expect(mutate(name, args, { userId: undefined })).rejects.toThrow(
      "Unauthorized",
    );
  }
  await pg.query('UPDATE "user" SET is_admin = false WHERE id = $1', ["admin"]);
  await expect(create()).rejects.toThrow("Admin access required");
  for (const q of [queries.shows.current, queries.shows.next])
    expect(() => q.fn({ args: undefined, ctx: { userId: undefined } })).toThrow(
      "Unauthorized",
    );
  for (const q of [
    queries.admin.shows,
    queries.admin.groups,
    queries.admin.users,
  ])
    expect(() => q.fn({ args: undefined, ctx: { userId: "member" } })).toThrow(
      "Admin access required",
    );
});

test("manual early/late starts preserve selection and record authoritative, repeat-safe timing", async () => {
  for (const [id, scheduledStart] of [
    ["early", Date.now() + 86400000],
    ["late", Date.now() - 86400000],
  ] as const) {
    await create(id);
    await grant(id);
    await add(id, id);
    await mutate("segments.setCurrent", { showId: id, id });
    await mutate("shows.schedule", { id, scheduledStart });
    expect((await row(id))?.status).toBe("scheduled");
    const before = Date.now();
    await mutate("shows.start", { id, actualStart: 1 });
    const started = await row(id);
    expect(started?.actualStart).toBeGreaterThanOrEqual(before);
    expect(started?.actualStart).toBeLessThanOrEqual(Date.now());
    expect(started?.scheduledStart).toBe(scheduledStart);
    expect((await current("member"))?.segments[0]?.id).toBe(id);
    await mutate("shows.start", { id });
    expect((await row(id))?.actualStart).toBe(started?.actualStart);
    await mutate("shows.end", { id });
    const ended = await row(id);
    expect(ended?.actualEnd).toBeGreaterThanOrEqual(started!.actualStart!);
    expect(await current("member")).toBeUndefined();
    expect(
      (await database.run(zql.segment.where("id", id).one()))?.isCurrent,
    ).toBe(false);
    await mutate("shows.end", { id });
    expect(await row(id)).toEqual(ended);
    await mutate("groups.remove", { id: "g" });
  }
});

test("draft/scheduled transitions are explicit; ended shows are read-only", async () => {
  await create();
  await add();
  await expect(mutate("shows.end", { id: "s" })).rejects.toThrow();
  await mutate("shows.schedule", { id: "s", scheduledStart: 1800000000000 });
  await mutate("shows.schedule", { id: "s", scheduledStart: 1800000001000 });
  await mutate("shows.schedule", { id: "s", scheduledStart: null });
  expect((await row())?.status).toBe("draft");
  expect((await row())?.scheduledStart).toBeNull();
  await mutate("shows.start", { id: "s" });
  expect((await row())?.status).toBe("live");
  await expect(
    mutate("shows.schedule", { id: "s", scheduledStart: null }),
  ).rejects.toThrow();
  await mutate("shows.end", { id: "s" });
  for (const [name, args] of [
    ["shows.start", { id: "s" }],
    ["shows.schedule", { id: "s", scheduledStart: null }],
    ["shows.update", { id: "s", title: "edited", features: [] }],
    ["shows.setVisibility", { id: "s", isPublic: true }],
    ["shows.access", { showId: "s", groupId: "g", enabled: true }],
    [
      "segments.add",
      {
        id: "b",
        showId: "s",
        title: "b",
        type: "placeholder",
        configuration: {},
      },
    ],
    [
      "segments.update",
      {
        id: "a",
        showId: "s",
        title: "b",
        type: "placeholder",
        configuration: {},
      },
    ],
    ["segments.remove", { id: "a", showId: "s" }],
    ["segments.reorder", { showId: "s", ids: ["a"] }],
    ["segments.setCurrent", { showId: "s", id: "a" }],
  ] as [string, ReadonlyJSONValue][])
    await expect(mutate(name, args)).rejects.toThrow();
});

test("one live show is enforced by mutations and the database", async () => {
  await create();
  await create("s2");
  const results = await Promise.allSettled([
    mutate("shows.start", { id: "s" }),
    mutate("shows.start", { id: "s2" }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const live = await database.run(zql.show.where("status", "live"));
  expect(live).toHaveLength(1);
  const other = live[0]!.id === "s" ? "s2" : "s";
  await expect(
    pg.query('UPDATE "show" SET status = $1 WHERE id = $2', ["live", other]),
  ).rejects.toThrow();
  await expect(
    pg.query('UPDATE "show" SET status = $1 WHERE id = $2', [
      "scheduled",
      other,
    ]),
  ).rejects.toThrow();
});

test("private grants, membership, public visibility, and revocation scope both viewer queries", async () => {
  await create();
  await grant();
  await mutate("shows.schedule", { id: "s", scheduledStart: 1800000000000 });
  expect((await next("member"))?.id).toBe("s");
  for (const id of ["outsider", "admin"])
    expect(await next(id)).toBeUndefined();
  await mutate("shows.setVisibility", { id: "s", isPublic: true });
  expect((await next("outsider"))?.id).toBe("s");
  await mutate("shows.setVisibility", { id: "s", isPublic: false });
  await mutate("shows.start", { id: "s" });
  expect((await current("member"))?.id).toBe("s");
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
  await mutate("groups.rename", { id: "g", name: "Renamed" });
  await mutate("groups.remove", { id: "g" });
  expect(await current("member")).toBeUndefined();
  expect(await database.run(zql.showGroup)).toEqual([]);
  expect(await database.run(zql.groupMember)).toEqual([]);
});

test("only the next accessible schedule is returned; inaccessible live does not hide it", async () => {
  for (const id of ["hidden", "next", "later", "live"]) await create(id);
  await grant("next");
  await mutate("shows.access", {
    showId: "later",
    groupId: "g",
    enabled: true,
  });
  for (const [id, scheduledStart] of [
    ["hidden", 1000],
    ["next", 2000],
    ["later", 3000],
  ] as const)
    await mutate("shows.schedule", { id, scheduledStart });
  await mutate("shows.start", { id: "live" });
  expect(await current("member")).toBeUndefined();
  expect((await next("member"))?.id).toBe("next");
  expect(await next("outsider")).toBeUndefined();
  await mutate("shows.access", { showId: "live", groupId: "g", enabled: true });
  const { resolveViewerShow, remainingUntil } =
    await import("../src/show-definitions");
  expect(
    resolveViewerShow(await current("member"), await next("member")).kind,
  ).toBe("live");
  await mutate("shows.end", { id: "live" });
  expect(
    resolveViewerShow(await current("member"), await next("member")).kind,
  ).toBe("scheduled");
  expect(remainingUntil(2000, 100000)).toBe(0);
  await mutate("shows.schedule", { id: "next", scheduledStart: null });
  expect((await next("member"))?.id).toBe("later");
  await mutate("shows.schedule", { id: "later", scheduledStart: null });
  expect(
    resolveViewerShow(await current("member"), await next("member")).kind,
  ).toBe("empty");
});

test("segment configuration validates, edits, reorders, and deletes current selection atomically", async () => {
  await create();
  await grant();
  await create("other");
  await add();
  await add("b");
  await add("foreign", "other");
  for (const configuration of [
    { url: "javascript:alert(1)" },
    { url: "file:///video" },
    {},
    { url: "https://example.com/a.mp4", html: "bad" },
  ])
    await expect(
      mutate("segments.update", {
        id: "a",
        showId: "s",
        title: "Intro",
        type: "introVideo",
        configuration,
      }),
    ).rejects.toThrow();
  await expect(
    mutate("segments.add", {
      id: "bad",
      showId: "s",
      title: "bad",
      type: "unknown",
      configuration: {},
    }),
  ).rejects.toThrow();
  await mutate("segments.update", {
    id: "a",
    showId: "s",
    title: "Intro",
    type: "introVideo",
    configuration: { url: "https://example.com/intro.mp4" },
  });
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
  await expect(
    mutate("segments.remove", { showId: "s", id: "foreign" }),
  ).rejects.toThrow();
  await expect(
    mutate("segments.setCurrent", { showId: "s", id: "foreign" }),
  ).rejects.toThrow();
  await mutate("segments.setCurrent", { showId: "s", id: "a" });
  await expect(
    pg.query("UPDATE segment SET is_current = true WHERE id = $1", ["b"]),
  ).rejects.toThrow();
  await mutate("shows.start", { id: "s" });
  expect((await current("member"))?.segments[0]?.configuration).toEqual({
    url: "https://example.com/intro.mp4",
  });
  await mutate("segments.remove", { showId: "s", id: "a" });
  expect((await current("member"))?.segments).toEqual([]);
  expect(
    (await database.run(zql.segment.where("id", "b").one()))?.isCurrent,
  ).toBe(false);
  await pg.query(
    "UPDATE segment SET type = $1, is_current = true WHERE id = $2",
    ["futureType", "b"],
  );
  const { segmentConfigurationSchema } =
    await import("../src/show-definitions");
  expect(
    segmentConfigurationSchema.safeParse((await current("member"))?.segments[0])
      .success,
  ).toBe(false);
});

test("migration preserves active/inactive definitions and unknown live history", async () => {
  const legacy = new PGlite();
  try {
    const dir = new URL("../../database/src/migrations/", import.meta.url);
    const names = (await readdir(dir)).filter((n) => /^\d/.test(n)).sort();
    for (const name of names.slice(0, -1))
      await legacy.exec(
        await readFile(new URL(`${name}/migration.sql`, dir), "utf8"),
      );
    await legacy.exec(`INSERT INTO "show" (id, title, is_active) VALUES ('live', 'Live', true), ('inactive', 'Inactive', false);
      INSERT INTO segment (id, show_id, title, type, position, is_current) VALUES ('segment', 'live', 'Intro', 'placeholder', 0, true)`);
    await legacy.exec(
      await readFile(new URL(`${names.at(-1)}/migration.sql`, dir), "utf8"),
    );
    const result = await legacy.query<{
      status: string;
      actual_start: unknown;
    }>('SELECT status, actual_start FROM "show" ORDER BY id');
    expect(result.rows).toEqual([
      { status: "draft", actual_start: null },
      { status: "live", actual_start: null },
    ]);
    expect(
      (await legacy.query("SELECT configuration, is_current FROM segment"))
        .rows,
    ).toEqual([{ configuration: {}, is_current: true }]);
  } finally {
    await legacy.close();
  }
});
