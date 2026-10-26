import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { SupplierService } from ".";
import { SupplierLive } from "./live";

/**
 * The purchase-side counterparty list. It mirrors `customers`, and so do the
 * rules it has to keep: alphabetical order, a tombstone rather than a row drop,
 * and the edit path clearing `supplier_sync_at`.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: SupplierLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<SupplierService>,
  program: (supplier: Context.Tag.Service<typeof SupplierService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const supplier = yield* SupplierService;
      return yield* program(supplier);
    }).pipe(Effect.provide(layer)),
  );
}

type Row = {
  supplier_name: string;
  supplier_note: string;
  supplier_sync_at: number | null;
  supplier_deleted_at: number | null;
};

const row = (db: ReturnType<typeof setup>["db"], id: string): Row => {
  const found = db
    .query<Row, [string]>(
      `SELECT supplier_name, supplier_note, supplier_sync_at, supplier_deleted_at
       FROM suppliers WHERE supplier_id = ?`,
    )
    .get(id);
  if (found === null) throw new Error(`suppliers row ${id} is missing`);
  return found;
};

describe("SupplierService", () => {
  test("the list is alphabetical and carries the note", async () => {
    const { layer } = setup();
    const all = await run(layer, (supplier) =>
      Effect.gen(function* () {
        yield* supplier.add("Sumber Rejeki", "antar Senin");
        yield* supplier.add("Andalas", "");
        return yield* supplier.get.all();
      }),
    );

    expect(all.map((item) => item.name)).toEqual(["Andalas", "Sumber Rejeki"]);
    expect(all[1].note).toBe("antar Senin");
  });

  test("an edit follows the new name and clears the sync stamp", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (supplier) => supplier.add("Andalas", ""));
    db.exec(`UPDATE suppliers SET supplier_sync_at = 111 WHERE supplier_id = '${id}'`);

    await run(layer, (supplier) => supplier.set.info(id, { name: "Zebra", note: "baru" }));

    expect(row(db, id)).toEqual({
      supplier_name: "Zebra",
      supplier_note: "baru",
      supplier_sync_at: null,
      supplier_deleted_at: null,
    });
  });

  test("a new supplier is unsynced until the sync layer stamps it", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (supplier) => supplier.add("Andalas", ""));

    expect((await run(layer, (supplier) => supplier.get.unsync())).map((item) => item.id)).toEqual([
      id,
    ]);

    db.exec(`UPDATE suppliers SET supplier_sync_at = 111 WHERE supplier_id = '${id}'`);
    expect(await run(layer, (supplier) => supplier.get.unsync())).toEqual([]);
  });

  test("a delete hides the supplier but keeps the row as a tombstone", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (supplier) =>
      Effect.gen(function* () {
        const id = yield* supplier.add("Andalas", "");
        yield* supplier.delete.byId(id);
        return id;
      }),
    );

    const stored = row(db, id);
    expect(stored.supplier_deleted_at).not.toBeNull();
    expect(stored.supplier_sync_at).toBeNull();

    const all = await run(layer, (supplier) => supplier.get.all());
    expect(all).toEqual([]);
  });

  test("`changes` hydrates from the database before it replays", async () => {
    const { db, layer } = setup();
    db.exec(`INSERT INTO suppliers
        (supplier_id, supplier_name, supplier_note, supplier_updated_at, supplier_sync_at, supplier_deleted_at)
      VALUES ('s1', 'Andalas', '', 1, NULL, NULL)`);

    const head = await run(layer, (supplier) => Stream.runHead(supplier.get.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value.map((item) => item.name)).toEqual(["Andalas"]);
  });
});
