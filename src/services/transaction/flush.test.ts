import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { DatabaseService, DbError, type Statement } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { TransactionService } from ".";
import { TransactionLive } from "./live";

/**
 * The real schema on `bun:sqlite`, with a hook that fails the next `transaction`
 * call so a cart write can be made to fail exactly once.
 */
function setup() {
  const { db, layer: dbLayer } = makeTestDatabase();
  const state = { failures: 0, written: [] as Statement[][] };

  const flaky = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const real = yield* DatabaseService;
      return {
        ...real,
        transaction: (statements: Statement[]) => {
          if (state.failures > 0) {
            state.failures -= 1;
            return Effect.fail(new DbError({ message: "disk penuh" }));
          }
          state.written.push(statements);
          return real.transaction(statements);
        },
      };
    }),
  ).pipe(Layer.provide(dbLayer));

  const productLayer = ProductLive.pipe(Layer.provide(flaky));
  const recordLayer = RecordLive.pipe(Layer.provide(flaky), Layer.provide(productLayer));
  const transactionLayer = TransactionLive.pipe(Layer.provide(flaky), Layer.provide(recordLayer));

  return { db, state, layer: transactionLayer };
}

function run<A>(
  layer: Layer.Layer<TransactionService>,
  program: (tx: Context.Tag.Service<typeof TransactionService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const tx = yield* TransactionService;
      return yield* program(tx);
    }).pipe(Effect.provide(layer)),
  );
}

/** `get.saveError` is a SubscriptionRef stream, so its head is the current value. */
function saveError(tx: Context.Tag.Service<typeof TransactionService>) {
  return Stream.runHead(tx.get.saveError).pipe(Effect.map((head) => head._tag === "Some" ? head.value : null));
}

const line = {
  id: "line-1",
  listingId: null,
  name: "Kopi",
  code: "",
  unit: 1,
  price: 1000,
  qty: 1,
  discounts: [],
};

describe("cart flush", () => {
  test("a failed write is reported instead of silently dropped", async () => {
    const { state, layer } = setup();

    const messages = await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        const before = yield* saveError(tx);

        state.failures = 1;
        yield* tx.set.note(id, "catatan");
        yield* tx.flush();
        const failed = yield* saveError(tx);

        yield* tx.flush();
        const recovered = yield* saveError(tx);
        return { before, failed, recovered };
      }),
    );

    expect(messages.before).toBeNull();
    expect(messages.failed).toContain("Keranjang belum tersimpan");
    expect(messages.recovered).toBeNull();
  });

  test("an edit rewrites one row, not the whole cart", async () => {
    const { state, layer } = setup();

    await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [
          { ...line, id: "line-1" },
          { ...line, id: "line-2", name: "Teh" },
        ]);
        yield* tx.flush();

        // Two lines and a record were written in full the first time.
        const firstPass = state.written.at(-1) ?? [];
        expect(firstPass.length).toBeGreaterThan(1);

        // One cell edit on one line: one UPDATE, no full rewrite.
        yield* tx.listings.set(id, [
          { ...line, id: "line-1", qty: 3 },
          { ...line, id: "line-2", name: "Teh" },
        ]);
        yield* tx.flush();

        const secondPass = state.written.at(-1) ?? [];
        expect(secondPass).toHaveLength(1);
        expect(secondPass[0].sql).toContain("UPDATE tx_listings");
        expect(secondPass[0].bindings).toContain(3);
      }),
    );
  });

  test("the persisted cart survives a reload of the refs", async () => {
    const { db, layer } = setup();

    await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.set.note(id, "meja 4");
        yield* tx.flush();
      }),
    );

    const row = db.query("SELECT tx_record_note FROM tx_records").get() as {
      tx_record_note: string;
    };
    expect(row.tx_record_note).toBe("meja 4");
  });
});
