import { describe, expect, test } from "bun:test";
import { Context, Effect, Either, Layer, Stream } from "effect";
import { DatabaseService, DbError, type Binding, type Statement } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { ProductLive } from "../product/live";
import { RecordLive } from "../record/live";
import { TransactionService } from ".";
import { DUAL_FLAG } from "~/lib/constants";
import { TransactionLive } from "./live";

/**
 * The real schema on `bun:sqlite`, with a hook that fails the next `transaction`
 * call so a cart write can be made to fail exactly once.
 */
function setup() {
  const { db, layer: dbLayer } = makeTestDatabase();
  const state = { failures: 0, execFailures: 0, written: [] as Statement[][] };

  const flaky = Layer.effect(
    DatabaseService,
    Effect.gen(function* () {
      const real = yield* DatabaseService;
      return {
        ...real,
        execute: (query: string, bindings: Binding[] = []) => {
          if (state.execFailures > 0) {
            state.execFailures -= 1;
            return Effect.fail(new DbError({ message: "disk penuh", detail: "SQLITE_FULL" }));
          }
          return real.execute(query, bindings);
        },
        transaction: (statements: Statement[]) => {
          if (state.failures > 0) {
            state.failures -= 1;
            return Effect.fail(new DbError({ message: "disk penuh", detail: "SQLITE_FULL" }));
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

  return { db, state, dbLayer, layer: transactionLayer };
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

  test("an extra's dual flag survives the write and the reload", async () => {
    const { db, dbLayer, layer } = setup();

    await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.extras.set(id, [
          { id: "extra-1", name: "Ongkir", kind: "number", value: 5000, flag: DUAL_FLAG },
          { id: "extra-2", name: "Plastik", kind: "number", value: 500, flag: 0 },
        ]);
        yield* tx.flush();
      }),
    );

    const written = db
      .query("SELECT tx_extra_name, tx_extra_flag FROM tx_extras ORDER BY tx_extra_order")
      .all() as { tx_extra_name: string; tx_extra_flag: number }[];
    expect(written).toEqual([
      { tx_extra_name: "Ongkir", tx_extra_flag: DUAL_FLAG },
      { tx_extra_name: "Plastik", tx_extra_flag: 0 },
    ]);

    // A second set of refs over the same database: the flag has to come back
    // through the hydrate query, not just sit in the row.
    const productLayer = ProductLive.pipe(Layer.provide(dbLayer));
    const recordLayer = RecordLive.pipe(Layer.provide(dbLayer), Layer.provide(productLayer));
    const second = TransactionLive.pipe(Layer.provide(dbLayer), Layer.provide(recordLayer));
    const drafts = await run(second, (tx) => tx.get.drafts("incoming"));

    expect(drafts[0]?.extras.map((extra) => [extra.name, extra.flag])).toEqual([
      ["Ongkir", DUAL_FLAG],
      ["Plastik", 0],
    ]);
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

  test("a failed tab delete leaves the cart and its row, and reports nothing as saved", async () => {
    const { db, state, layer } = setup();

    const result = await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.flush();

        state.execFailures = 1;
        const failure = yield* Effect.either(tx.delete.byId(id));
        const drafts = yield* tx.get.drafts("incoming");
        return { failed: Either.isLeft(failure), drafts: drafts.length };
      }),
    );

    // The tab must not disappear from the screen before SQLite agrees, or a
    // "deleted" cart comes back on the next hydrate with the prices it was
    // parked with.
    expect(result.failed).toBe(true);
    expect(result.drafts).toBe(1);
    expect(db.query("SELECT COUNT(*) AS n FROM tx_records").get()).toEqual({ n: 1 });
  });

  test("a tab delete removes both the draft and its row", async () => {
    const { db, layer } = setup();

    const remaining = await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.flush();
        yield* tx.delete.byId(id);
        return (yield* tx.get.drafts("incoming")).length;
      }),
    );

    expect(remaining).toBe(0);
    expect(db.query("SELECT COUNT(*) AS n FROM tx_records").get()).toEqual({ n: 0 });
  });

  // The guarantee the window-close handler in
  // `layouts/authenticated/use-flush-on-exit.ts` relies on: an edit that is
  // still sitting on the debounce timer is written by `flush()`, immediately,
  // and is not written a second time when the timer would have fired.
  test("an edit still on the debounce is written by flush() without waiting it out", async () => {
    const { db, layer } = setup();

    await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.flush();

        yield* tx.set.note(id, "meja 4");
        const pending = db.query("SELECT tx_record_note FROM tx_records").get() as {
          tx_record_note: string;
        };
        expect(pending.tx_record_note).toBe("");

        // What closing the window does.
        yield* tx.flush();
        const flushed = db.query("SELECT tx_record_note FROM tx_records").get() as {
          tx_record_note: string;
        };
        expect(flushed.tx_record_note).toBe("meja 4");
      }),
    );

    // Past the debounce window: the cleared timer must not write again.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const row = db.query("SELECT tx_record_note FROM tx_records").get() as {
      tx_record_note: string;
    };
    expect(row.tx_record_note).toBe("meja 4");
  });

  test("a reported failure reaches the same channel <SaveError> renders", async () => {
    const { layer } = setup();

    const message = await run(layer, (tx) =>
      Effect.gen(function* () {
        yield* tx.reportError("Keranjang gagal dihapus: disk penuh");
        return yield* saveError(tx);
      }),
    );

    expect(message).toContain("Keranjang gagal dihapus");
  });
});

describe("cart listing snapshots", () => {
  test("a line's kind is persisted with the draft", async () => {
    const { db, layer } = setup();

    const row = await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [{ ...line, kind: "grosir" }]);
        yield* tx.flush();
        return db
          .query("SELECT tx_listing_kind FROM tx_listings WHERE tx_record_id = ?")
          .get(id);
      }),
    );

    expect(row).toEqual({ tx_listing_kind: "grosir" });
  });

  test("an unlabelled line stores an empty kind, not a made-up one", async () => {
    const { db, layer } = setup();

    const row = await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.listings.set(id, [{ ...line, kind: "" }]);
        yield* tx.flush();
        return db
          .query("SELECT tx_listing_kind FROM tx_listings WHERE tx_record_id = ?")
          .get(id);
      }),
    );

    expect(row).toEqual({ tx_listing_kind: "" });
  });
});

describe("cart payment time", () => {
  const PICKED = 1_700_000_000_000;

  test("a picked time is written to the draft, and cleared back to NULL", async () => {
    const { db, layer } = setup();

    await run(layer, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.set.paidAt(id, PICKED);
        yield* tx.flush();
      }),
    );

    expect(db.query("SELECT tx_record_paid_at FROM tx_records").get()).toEqual({
      tx_record_paid_at: PICKED,
    });

    // Each `run` builds its own layer, so hydrate first: the setters write into
    // the loaded drafts, and a fresh instance has none until it reads.
    await run(layer, (tx) =>
      Effect.gen(function* () {
        const [draft] = yield* tx.get.drafts("incoming");
        if (draft === undefined) return;
        yield* tx.set.paidAt(draft.id, null);
        yield* tx.flush();
      }),
    );

    // "saat ini" is NULL, never the clock frozen at the moment of the edit.
    expect(db.query("SELECT tx_record_paid_at FROM tx_records").get()).toEqual({
      tx_record_paid_at: null,
    });
  });

  test("the pick survives a reload of the cart", async () => {
    const { dbLayer } = setup();
    const productLayer = ProductLive.pipe(Layer.provide(dbLayer));
    const recordLayer = RecordLive.pipe(Layer.provide(dbLayer), Layer.provide(productLayer));

    const first = TransactionLive.pipe(Layer.provide(dbLayer), Layer.provide(recordLayer));
    await run(first, (tx) =>
      Effect.gen(function* () {
        const id = yield* tx.add.new("incoming");
        yield* tx.set.paidAt(id, PICKED);
        yield* tx.flush();
      }),
    );

    // A fresh layer means a fresh hydrate, which is the app restarting.
    const second = TransactionLive.pipe(Layer.provide(dbLayer), Layer.provide(recordLayer));
    const drafts = await run(second, (tx) => tx.get.drafts("incoming"));

    expect(drafts[0]?.paidAt).toBe(PICKED);
  });
});
