import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { MoneyService } from ".";
import { MoneyLive } from "./live";

/**
 * The cash/bank journal the Money screen renders: the balance a pocket card
 * shows is "the value of its most recent entry", so a wrong pick here is a wrong
 * number in the ledger, not a display nit.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: MoneyLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<MoneyService>,
  program: (money: Context.Tag.Service<typeof MoneyService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const money = yield* MoneyService;
      return yield* program(money);
    }).pipe(Effect.provide(layer)),
  );
}

describe("MoneyService", () => {
  test("a pocket's card shows its most recent entry as the balance", async () => {
    const { layer } = setup();

    const summary = await run(layer, (money) =>
      Effect.gen(function* () {
        const id = yield* money.pockets.add({ name: "Kas", type: "absolute" });
        // Out of order on purpose: the card must follow the timestamp, not the
        // order the rows were written in.
        yield* money.entries.add.one({ pocketId: id, timestamp: 300, value: 30_000, note: "" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 100, value: 10_000, note: "" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 200, value: 20_000, note: "" });
        return yield* money.pockets.get.summary();
      }),
    );

    // The migrations seed the built-in pockets (Simpanan/Utang/Selisih); only
    // the one this test created matters here.
    const kas = summary.filter((item) => item.pocket.name === "Kas");
    expect(kas).toHaveLength(1);
    expect(kas[0].latest).toEqual({ timestamp: 300, value: 30_000 });
  });

  test("entries that share an instant resolve the same way on every read", async () => {
    const { layer } = setup();

    const result = await run(layer, (money) =>
      Effect.gen(function* () {
        const id = yield* money.pockets.add({ name: "Bank", type: "change" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 500, value: 1_000, note: "a" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 500, value: 2_000, note: "b" });
        const summary = yield* money.pockets.get.summary();
        const byRange = yield* money.entries.get.byRange(id, 0, 1_000);
        const card = summary.find((item) => item.pocket.name === "Bank");
        return {
          latest: card?.latest,
          latestNote: byRange[0]?.note,
          byRange: byRange.map((entry) => entry.note),
        };
      }),
    );

    // Entries can share an instant (an import), so the card and a fresh read must
    // break the tie the same way — `timestamp DESC, money_id DESC` — instead of
    // the card showing one row and the history another.
    expect(result.byRange).toHaveLength(2);
    expect(result.byRange[0]).toBe(result.latestNote);
    expect(result.latest?.timestamp).toBe(500);
  });

  test("`last` is the value in force before the given instant", async () => {
    const { layer } = setup();

    const values = await run(layer, (money) =>
      Effect.gen(function* () {
        const id = yield* money.pockets.add({ name: "Kas", type: "change" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 100, value: 10_000, note: "" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 200, value: 15_000, note: "" });
        return {
          beforeAnything: yield* money.entries.get.last(id, 50),
          at200: yield* money.entries.get.last(id, 200),
          after: yield* money.entries.get.last(id, 300),
        };
      }),
    );

    expect(values.beforeAnything).toBe(0);
    expect(values.at200).toBe(10_000);
    expect(values.after).toBe(15_000);
  });

  test("deleting a pocket hides it and its entries from the catalog", async () => {
    const { layer } = setup();

    const after = await run(layer, (money) =>
      Effect.gen(function* () {
        const id = yield* money.pockets.add({ name: "Kas", type: "absolute" });
        const other = yield* money.pockets.add({ name: "Bank", type: "absolute" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 100, value: 10_000, note: "" });
        yield* money.pockets.delete.byId(id);
        return {
          summary: yield* money.pockets.get.summary(),
          entries: yield* money.entries.get.all(id),
          otherId: other,
        };
      }),
    );

    expect(after.summary.map((item) => item.pocket.name)).not.toContain("Kas");
    expect(after.summary.map((item) => item.pocket.name)).toContain("Bank");
    expect(after.entries).toHaveLength(0);
    expect(after.otherId).not.toBe("");
  });

  test("deleting an entry falls back to the one before it", async () => {
    const { layer } = setup();

    const latest = await run(layer, (money) =>
      Effect.gen(function* () {
        const id = yield* money.pockets.add({ name: "Kas", type: "change" });
        yield* money.entries.add.one({ pocketId: id, timestamp: 100, value: 10_000, note: "" });
        const newest = yield* money.entries.add.one({
          pocketId: id,
          timestamp: 200,
          value: 17_000,
          note: "",
        });
        yield* money.entries.delete.byId(newest);
        const summary = yield* money.pockets.get.summary();
        return summary.find((item) => item.pocket.name === "Kas")?.latest;
      }),
    );

    expect(latest).toEqual({ timestamp: 100, value: 10_000 });
  });

  test("a reorder changes the catalog order without touching the balances", async () => {
    const { layer } = setup();

    const summary = await run(layer, (money) =>
      Effect.gen(function* () {
        const first = yield* money.pockets.add({ name: "Kas", type: "absolute" });
        const second = yield* money.pockets.add({ name: "Bank", type: "absolute" });
        yield* money.entries.add.one({ pocketId: first, timestamp: 100, value: 10_000, note: "" });
        yield* money.pockets.set.ordering([
          { id: second, order: 0 },
          { id: first, order: 1 },
        ]);
        return yield* money.pockets.get.summary();
      }),
    );

    const mine = summary.filter((item) => item.pocket.name === "Bank" || item.pocket.name === "Kas");
    expect(mine.map((item) => item.pocket.name)).toEqual(["Bank", "Kas"]);
    expect(mine[1].latest).toEqual({ timestamp: 100, value: 10_000 });
  });
});
