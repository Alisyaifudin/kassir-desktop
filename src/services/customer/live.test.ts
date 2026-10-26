import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { CustomerService } from ".";
import { CustomerLive } from "./live";

/**
 * The sale-side counterparty list: the cashier picks a customer from it at the
 * till and the sync layer pushes what changed. The list is cached in one ref and
 * hydrated on first read, so what a write does to the cache is as important as
 * what it does to the row.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: CustomerLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<CustomerService>,
  program: (customer: Context.Tag.Service<typeof CustomerService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const customer = yield* CustomerService;
      return yield* program(customer);
    }).pipe(Effect.provide(layer)),
  );
}

type Row = {
  customer_name: string;
  customer_sync_at: number | null;
  customer_deleted_at: number | null;
};

const row = (db: ReturnType<typeof setup>["db"], id: string): Row => {
  const found = db
    .query<Row, [string]>(
      `SELECT customer_name, customer_sync_at, customer_deleted_at
       FROM customers WHERE customer_id = ?`,
    )
    .get(id);
  if (found === null) throw new Error(`customers row ${id} is missing`);
  return found;
};

describe("CustomerService", () => {
  test("the list is alphabetical, not the order the rows were written", async () => {
    const { layer } = setup();
    const names = await run(layer, (customer) =>
      Effect.gen(function* () {
        yield* customer.add("Siti", "0812");
        yield* customer.add("Ani", "0813");
        yield* customer.add("Budi", "0814");
        return yield* customer.get.all();
      }),
    );

    expect(names.map((item) => item.name)).toEqual(["Ani", "Budi", "Siti"]);
    expect(names[0].phone).toBe("0813");
    expect(names[0].id).not.toBe("");
  });

  test("a rename and a phone change move the customer to their new place", async () => {
    const { layer } = setup();
    const after = await run(layer, (customer) =>
      Effect.gen(function* () {
        const ani = yield* customer.add("Ani", "0813");
        yield* customer.add("Budi", "0814");
        yield* customer.set.info(ani, { name: "Zainab", phone: "0899" });
        return yield* customer.get.all();
      }),
    );

    expect(after.map((item) => item.name)).toEqual(["Budi", "Zainab"]);
    expect(after[1].phone).toBe("0899");
  });

  test("a renamed customer is unsynced again, so the change is pushed", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (customer) => customer.add("Ani", "0813"));

    // The sync layer has already pushed the insert.
    db.exec(`UPDATE customers SET customer_sync_at = 111 WHERE customer_id = '${id}'`);
    expect(row(db, id).customer_sync_at).toBe(111);

    await run(layer, (customer) => customer.set.info(id, { name: "Ani", phone: "0899" }));

    expect(row(db, id).customer_sync_at).toBeNull();
  });

  test("a new customer is in the unsynced set until the sync layer stamps it", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (customer) => customer.add("Ani", "0813"));

    const before = await run(layer, (customer) => customer.get.unsync());
    expect(before.map((item) => item.id)).toEqual([id]);

    db.exec(`UPDATE customers SET customer_sync_at = 111 WHERE customer_id = '${id}'`);
    const after = await run(layer, (customer) => customer.get.unsync());
    expect(after).toEqual([]);
    // Still on the list — unsynced is a sync concern, not a visibility one.
    expect((await run(layer, (customer) => customer.get.all())).map((item) => item.id)).toEqual([
      id,
    ]);
  });

  test("a delete hides the customer but keeps the row as a tombstone", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (customer) =>
      Effect.gen(function* () {
        const id = yield* customer.add("Ani", "0813");
        yield* customer.add("Budi", "0814");
        yield* customer.delete.byId(id);
        return id;
      }),
    );

    const stored = row(db, id);
    // Per migration-43 this is a soft delete: the row has to reach the server.
    expect(stored.customer_deleted_at).not.toBeNull();
    expect(stored.customer_sync_at).toBeNull();

    // A fresh service instance reads the rows again; the tombstone stays hidden.
    const list = await run(layer, (customer) => customer.get.all());
    expect(list.map((item) => item.name)).toEqual(["Budi"]);
  });

  test("`changes` hydrates from the database before it replays", async () => {
    const { db, layer } = setup();
    // A row written by an earlier run: the stream must not start empty.
    db.exec(`INSERT INTO customers
        (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at, customer_deleted_at)
      VALUES ('c1', 'Ani', '0813', 1, NULL, NULL)`);

    const head = await run(layer, (customer) => Stream.runHead(customer.get.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value.map((item) => item.name)).toEqual(["Ani"]);
  });
});
