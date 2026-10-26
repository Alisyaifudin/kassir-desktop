import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { SocialService } from ".";
import { SocialLive } from "./live";

/**
 * The contact lines printed at the foot of a receipt. They are ordered by id, not
 * by `social_updated_at`: an edit must not reshuffle the receipt, and ULIDs sort
 * in the order the lines were added.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: SocialLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<SocialService>,
  program: (social: Context.Tag.Service<typeof SocialService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const social = yield* SocialService;
      return yield* program(social);
    }).pipe(Effect.provide(layer)),
  );
}

type Row = {
  social_name: string;
  social_value: string;
  social_sync_at: number | null;
  social_deleted_at: number | null;
};

const findRow = (db: ReturnType<typeof setup>["db"], id: string): Row | null =>
  db
    .query<Row, [string]>(
      `SELECT social_name, social_value, social_sync_at, social_deleted_at
       FROM socials WHERE social_id = ?`,
    )
    .get(id);

const row = (db: ReturnType<typeof setup>["db"], id: string): Row => {
  const found = findRow(db, id);
  if (found === null) throw new Error(`socials row ${id} is missing`);
  return found;
};

/** Two lines written by an earlier run, the older one edited more recently. */
function seed(db: ReturnType<typeof setup>["db"]) {
  db.exec(`INSERT INTO socials
      (social_id, social_name, social_value, social_updated_at, social_sync_at, social_deleted_at)
    VALUES
      ('01A', 'Instagram', '@warung', 200, NULL, NULL),
      ('01B', 'WhatsApp', '0812', 100, NULL, NULL)`);
}

describe("SocialService", () => {
  test("the receipt order follows the id, not the last edit", async () => {
    const { db, layer } = setup();
    seed(db);

    const all = await run(layer, (social) => social.get.all());

    // '01A' was edited last but stays first: resorting on `social_updated_at`
    // would move it under WhatsApp on every save.
    expect(all.map((item) => item.name)).toEqual(["Instagram", "WhatsApp"]);
    expect(all[0]).toEqual({
      id: "01A",
      name: "Instagram",
      value: "@warung",
      updatedAt: 200,
      syncAt: null,
    });
  });

  test("an edit writes the row, clears the sync stamp, and keeps the order", async () => {
    const { db, layer } = setup();
    seed(db);
    await run(layer, (social) =>
      social.set.info("01A", { name: "Instagram", value: "@warung.baru" }),
    );

    expect(row(db, "01A")).toEqual({
      social_name: "Instagram",
      social_value: "@warung.baru",
      social_sync_at: null,
      social_deleted_at: null,
    });
    expect((await run(layer, (social) => social.get.all())).map((item) => item.id)).toEqual([
      "01A",
      "01B",
    ]);
  });

  test("an added line is persisted and returned with its id", async () => {
    const { db, layer } = setup();

    const id = await run(layer, (social) =>
      social.add({ name: "TikTok", value: "@warung" }),
    );

    expect(id).not.toBe("");
    expect(row(db, id).social_name).toBe("TikTok");
    const all = await run(layer, (social) => social.get.all());
    expect(all.map((item) => item.name)).toEqual(["TikTok"]);
  });

  test("a delete hides the line but keeps the row as a tombstone", async () => {
    const { db, layer } = setup();
    seed(db);

    await run(layer, (social) => social.delete.byId("01A"));

    expect(row(db, "01A").social_deleted_at).not.toBeNull();
    expect(row(db, "01A").social_sync_at).toBeNull();
    expect((await run(layer, (social) => social.get.all())).map((item) => item.id)).toEqual([
      "01B",
    ]);
  });

  test("`changes` hydrates from the database before it replays", async () => {
    const { db, layer } = setup();
    seed(db);

    const head = await run(layer, (social) => Stream.runHead(social.get.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value.map((item) => item.name)).toEqual([
      "Instagram",
      "WhatsApp",
    ]);
  });
});
