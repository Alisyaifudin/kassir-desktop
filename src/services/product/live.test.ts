import { describe, expect, spyOn, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { DatabaseService, type Binding } from "../db";
import { makeTestDatabase } from "../db/test-support";
import { isPublished, PRODUCT_FLAG_UNPUBLISHED, ProductService } from ".";
import { ProductLive } from "./live";

function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: ProductLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<ProductService>,
  program: (product: Context.Tag.Service<typeof ProductService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const product = yield* ProductService;
      return yield* program(product);
    }).pipe(Effect.provide(layer)),
  );
}

function input(name: string) {
  return {
    name,
    note: "",
    listings: [
      { name, price: 1000, unit: 1, kind: "retail", code: name },
    ],
    stocks: [{ value: 5, capital: 500 }],
    properties: [],
  };
}

describe("product catalogue identity", () => {
  test("a rename leaves every other product's object identity intact", async () => {
    const { layer } = setup();

    const result = await run(layer, (product) =>
      Effect.gen(function* () {
        const kopi = yield* product.add(input("Kopi"));
        yield* product.add(input("Teh"));
        const before = yield* product.get.all();

        yield* product.set.info(kopi, { name: "Kopi Susu", note: "" });
        const after = yield* product.get.all();

        const other = (items: typeof before) => items.find((item) => item.name === "Teh");
        return {
          otherIsSameObject: other(before) === other(after),
          editedIsNewObject:
            before.find((item) => item.name === "Kopi") !==
            after.find((item) => item.name === "Kopi Susu"),
          editedName: after.find((item) => item.name === "Kopi Susu")?.name,
        };
      }),
    );

    // The untouched row is the *same object*, so memoised lists skip it.
    expect(result.otherIsSameObject).toBe(true);
    expect(result.editedIsNewObject).toBe(true);
    expect(result.editedName).toBe("Kopi Susu");
  });

  test("the projection keeps the average capital and the highest lot's", async () => {
    const { layer } = setup();

    // Two lots, so the average and the most expensive lot are different numbers:
    // 10 pcs at 500 and 2 pcs at 900 → average 566.67, highest 900. The card reads
    // the highest (what a piece ever cost), the table reads the average.
    const product = await run(layer, (service) =>
      Effect.gen(function* () {
        yield* service.add({
          ...input("Kopi"),
          stocks: [
            { value: 10, capital: 500 },
            { value: 2, capital: 900 },
          ],
        });
        const [added] = yield* service.get.all();
        return added;
      }),
    );

    expect(product?.stock).toBe(12);
    expect(product?.capital).toBeCloseTo((10 * 500 + 2 * 900) / 12, 5);
    expect(product?.maxCapital).toBe(900);
  });

  test("a sold-out lot does not out-rank the lot the goods came from", async () => {
    const { layer } = setup();

    // 900 is a past purchase: that lot is empty. The goods in stock cost 500.
    const product = await run(layer, (service) =>
      Effect.gen(function* () {
        yield* service.add({
          ...input("Kopi"),
          stocks: [
            { value: 10, capital: 500 },
            { value: 0, capital: 900 },
          ],
        });
        const [added] = yield* service.get.all();
        return added;
      }),
    );

    expect(product?.stock).toBe(10);
    expect(product?.maxCapital).toBe(500);
  });

  test("when every lot is empty, the highest of them is still the answer", async () => {
    const { layer } = setup();

    const product = await run(layer, (service) =>
      Effect.gen(function* () {
        yield* service.add({
          ...input("Kopi"),
          stocks: [
            { value: 0, capital: 500 },
            { value: 0, capital: 900 },
          ],
        });
        const [added] = yield* service.get.all();
        return added;
      }),
    );

    expect(product?.stock).toBe(0);
    expect(product?.capital).toBe(0);
    expect(product?.maxCapital).toBe(900);
  });

  test("a lot adjusted below zero is skipped, like a sold-out one", async () => {
    const { layer } = setup();

    // A shortage lot: stock counted out that was never received. Its capital is
    // not what the goods on the shelf cost either, so only the stocked lot speaks.
    const result = await run(layer, (service) =>
      Effect.gen(function* () {
        const id = yield* service.add({
          ...input("Kopi"),
          stocks: [
            { value: 10, capital: 500 },
            { value: 4, capital: 900 },
          ],
        });
        const full = yield* service.get.byId(id);
        const shortage = full.stocks.find((lot) => lot.capital === 900);
        if (shortage === undefined) throw new Error("no lot");
        yield* service.stock.adjust(id, shortage.id, { value: -3, capital: 900 });
        const [after] = yield* service.get.all();
        return after;
      }),
    );

    expect(result?.stock).toBe(7);
    expect(result?.maxCapital).toBe(500);
  });

  test("a refresh that finds nothing new does not re-emit", async () => {
    const { layer } = setup();

    const same = await run(layer, (product) =>
      Effect.gen(function* () {
        yield* product.add(input("Kopi"));
        const before = yield* product.get.all();
        yield* product.refresh();
        const after = yield* product.get.all();
        return after === before;
      }),
    );

    expect(same).toBe(true);
  });

  // The identity check must survive two writes landing inside the same
  // millisecond: `Date.now()` is the writers' only clock, and a same-tick
  // "read back, compare timestamps" used to report the old row as unchanged,
  // so the ref never emitted and the POS kept the old price and stock.
  test("a price edit inside one millisecond is not mistaken for no change", async () => {
    const { layer } = setup();
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now);

    try {
      const result = await run(layer, (product) =>
        Effect.gen(function* () {
          const id = yield* product.add(input("Kopi"));
          const [before] = yield* product.get.all();
          yield* product.set.listing.update(id, before.listings[0].id, {
            name: "Kopi",
            price: 2500,
            unit: 1,
            kind: "retail",
            code: "Kopi",
          });
          const [after] = yield* product.get.all();
          return { price: after.listings[0].price, replaced: after !== before };
        }),
      );

      expect(result.price).toBe(2500);
      expect(result.replaced).toBe(true);
    } finally {
      clock.mockRestore();
    }
  });

  test("a stock movement inside one millisecond is not mistaken for no change", async () => {
    const { layer } = setup();
    const now = Date.now();
    const clock = spyOn(Date, "now").mockReturnValue(now);

    try {
      const result = await run(layer, (product) =>
        Effect.gen(function* () {
          const id = yield* product.add(input("Kopi"));
          expect((yield* product.get.byId(id)).stock).toBe(5);
          yield* product.stock.receive(id, { value: 3, capital: 700 });
          return (yield* product.get.byId(id)).stock;
        }),
      );

      expect(result).toBe(8);
    } finally {
      clock.mockRestore();
    }
  });
});

describe("product.add value boundary", () => {
  test("a negative price is refused and nothing is written", async () => {
    const { layer } = setup();

    const result = await run(layer, (product) =>
      Effect.gen(function* () {
        const invalid = {
          ...input("Kopi"),
          listings: [{ ...input("Kopi").listings[0], price: -1000 }],
        };
        const outcome = yield* Effect.either(product.add(invalid));
        const all = yield* product.get.all();
        return { outcome, count: all.length };
      }),
    );

    expect(result.outcome._tag).toBe("Left");
    expect(result.count).toBe(0);
  });

  test("a negative stock capital is refused", async () => {
    const { layer } = setup();

    const outcome = await run(layer, (product) =>
      Effect.either(product.add({ ...input("Kopi"), stocks: [{ value: 5, capital: -500 }] })),
    );

    expect(outcome._tag).toBe("Left");
  });
});

describe("product writes read narrowly", () => {
  /**
   * A shop's catalogue is thousands of rows and six tables wide. Re-reading all
   * of it after renaming one product is the read cost iteration 1 filed; the
   * bounded `loadMany` path already existed for record commits and is what the
   * edit paths must use too.
   *
   * The whole flow runs inside one program: each `run` builds a fresh
   * `ProductLive`, and a fresh service has to read the catalogue once anyway.
   */
  function recordingSetup() {
    const { db, layer } = makeTestDatabase();
    const reads: string[] = [];
    const recording = Layer.effect(
      DatabaseService,
      Effect.map(DatabaseService, (service) => ({
        ...service,
        selectMany: <T>(query: string, bindings?: Binding[]) => {
          reads.push(query);
          return service.selectMany<T>(query, bindings);
        },
      })),
    ).pipe(Layer.provide(layer));
    return { db, reads, layer: ProductLive.pipe(Layer.provide(recording)) };
  }

  test("a product edit re-reads only that product", async () => {
    const { reads, layer } = recordingSetup();
    const queries = await run(layer, (product) =>
      Effect.gen(function* () {
        const kopi = yield* product.add(input("Kopi"));
        yield* product.add(input("Teh"));
        yield* product.add(input("Gula"));
        reads.length = 0;
        yield* product.set.info(kopi, { name: "Kopi Susu", note: "" });
        return [...reads];
      }),
    );

    expect(queries).toHaveLength(6);
    for (const query of queries) expect(query).toContain("product_id IN");
  });

  test("deleting a product drops it without re-reading the catalogue", async () => {
    const { reads, layer } = recordingSetup();
    const outcome = await run(layer, (product) =>
      Effect.gen(function* () {
        const kopi = yield* product.add(input("Kopi"));
        yield* product.add(input("Teh"));
        reads.length = 0;
        yield* product.delete(kopi);
        const names = yield* Effect.map(product.get.all(), (items) =>
          items.map((item) => item.name),
        );
        return { queries: [...reads], names };
      }),
    );

    for (const query of outcome.queries) expect(query).toContain("product_id IN");
    expect(outcome.names).toEqual(["Teh"]);
  });

  test("a stock adjustment re-reads only that product", async () => {
    const { reads, layer } = recordingSetup();
    const queries = await run(layer, (product) =>
      Effect.gen(function* () {
        const kopi = yield* product.add(input("Kopi"));
        yield* product.add(input("Teh"));
        reads.length = 0;
        yield* product.stock.receive(kopi, { value: 2, capital: 200 });
        return [...reads];
      }),
    );

    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) expect(query).toContain("product_id IN");
  });
});

describe("stock history paging", () => {
  const SAME_INSTANT = 1_700_000_000_000;

  function seed(
    db: ReturnType<typeof setup>["db"],
    productId: string,
    rows: { id: string; at: number; value: number }[],
  ) {
    const insert = db.prepare(
      `INSERT INTO product_events (
         product_event_id, product_event_created_at, product_event_value,
         product_event_capital, product_event_note, product_id
       ) VALUES (?, ?, ?, 100, '', ?)`,
    );
    for (const row of rows) insert.run(row.id, row.at, row.value, productId);
  }

  /** Page to the end the way `useHistory` does, and collect the ids seen. */
  function pageAll(
    layer: Layer.Layer<ProductService>,
    productId: string,
    limit: number,
    mode?: "in" | "out",
  ) {
    return run(layer, (product) =>
      Effect.gen(function* () {
        const ids: string[] = [];
        let cursor: { createdAt: number; id: string } | undefined;
        for (let guard = 0; guard < 100; guard++) {
          const page = yield* product.stock.history(productId, { before: cursor, mode, limit });
          ids.push(...page.map((event) => event.id));
          if (page.length < limit) break;
          const last = page[page.length - 1];
          cursor = { createdAt: last.createdAt, id: last.id };
        }
        return ids;
      }),
    );
  }

  /**
   * A commit stamps one event per lot with the same `now`, so a keyset on
   * `created_at` alone lost the rest of the group at a page boundary — in the
   * screen that is supposed to be the auditable record of stock.
   */
  test("a page boundary inside a same-instant group keeps every event", async () => {
    const { db, layer } = setup();
    const productId = await run(layer, (product) => product.add(input("Kopi")));

    const seeded = Array.from({ length: 25 }, (_, index) => ({
      id: `ev-${String(index).padStart(2, "0")}`,
      at: SAME_INSTANT,
      value: 1,
    }));
    seed(db, productId, seeded);

    const ids = await pageAll(layer, productId, 20);

    // The 25 seeded events plus the one `add` wrote for the opening lot.
    expect(ids).toHaveLength(26);
    expect(new Set(ids).size).toBe(26);
    for (const row of seeded) expect(ids).toContain(row.id);
  });

  test("the Masuk/Keluar filter applies to the whole history, not the loaded page", async () => {
    const { db, layer } = setup();
    const productId = await run(layer, (product) => product.add(input("Kopi")));

    // The matching rows are the *oldest*: a page of the newest 20 is all "out",
    // which is exactly what used to render "Belum ada pergerakan stok."
    seed(
      db,
      productId,
      Array.from({ length: 5 }, (_, index) => ({
        id: `in-${index}`,
        at: SAME_INSTANT,
        value: 1,
      })),
    );
    seed(
      db,
      productId,
      Array.from({ length: 25 }, (_, index) => ({
        id: `out-${String(index).padStart(2, "0")}`,
        at: SAME_INSTANT + 1000,
        value: -1,
      })),
    );

    const incoming = await pageAll(layer, productId, 20, "in");

    // The five old "in" rows (plus the opening lot `add` wrote), and none of the
    // 25 newer "out" rows — the old client-side filter would have returned none.
    expect(incoming.filter((id) => id.startsWith("in-")).sort()).toEqual([
      "in-0",
      "in-1",
      "in-2",
      "in-3",
      "in-4",
    ]);
    expect(incoming.some((id) => id.startsWith("out-"))).toBe(false);
  });
});

describe("publishing a product", () => {
  test("the flag is stored, readable and leaves the product in the catalogue", async () => {
    const { layer } = setup();

    const states = await run(layer, (product) =>
      Effect.gen(function* () {
        const id = yield* product.add(input("Kopi"));
        const published = yield* product.get.byId(id);

        yield* product.set.publish(id, false);
        const withdrawn = yield* product.get.byId(id);
        // The row is hidden from the till, not deleted from /products.
        const all = yield* product.get.all();

        yield* product.set.publish(id, true);
        const again = yield* product.get.byId(id);

        return { published, withdrawn, all, again };
      }),
    );

    expect(states.published.flag & PRODUCT_FLAG_UNPUBLISHED).toBe(0);
    expect(isPublished(states.published)).toBe(true);
    expect(states.withdrawn.flag & PRODUCT_FLAG_UNPUBLISHED).toBe(PRODUCT_FLAG_UNPUBLISHED);
    expect(isPublished(states.withdrawn)).toBe(false);
    expect(states.all.map((item) => item.name)).toEqual(["Kopi"]);
    expect(isPublished(states.again)).toBe(true);
  });

  /**
   * `product_flag` is a bitfield, so publishing must clear bit 0 and leave the
   * rest alone — otherwise the next meaning that claims a bit is wiped the
   * first time someone flips the switch.
   */
  test("publishing preserves the flag's other bits", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (product) => product.add(input("Kopi")));

    // Bit 1 is a hypothetical future meaning, written raw so this test stays
    // valid once it exists.
    db.query("UPDATE products SET product_flag = 3 WHERE product_id = ?").run(id);

    const flag = await run(layer, (product) =>
      Effect.gen(function* () {
        yield* product.refresh();
        yield* product.set.publish(id, true);
        return (yield* product.get.byId(id)).flag;
      }),
    );

    expect(flag).toBe(2);
  });
});

describe("listing codes and kinds", () => {
  function withListing(overrides: Record<string, unknown>) {
    const base = input("Kopi");
    return { ...base, listings: [{ ...base.listings[0], ...overrides }] };
  }

  test("a code is unique across live listings, case-insensitively", async () => {
    const { layer } = setup();

    const outcome = await run(layer, (product) =>
      Effect.gen(function* () {
        yield* product.add(withListing({ name: "Kopi Kecil", code: "AbC" }));
        return yield* Effect.either(
          product.add(withListing({ name: "Kopi Besar", code: "abc" })),
        );
      }),
    );

    expect(outcome._tag).toBe("Left");
    if (outcome._tag === "Left") expect(outcome.left._tag).toBe("ProductDuplicateCode");
  });

  test("two listings without a code coexist", async () => {
    const { layer } = setup();

    const count = await run(layer, (product) =>
      Effect.gen(function* () {
        yield* product.add(withListing({ code: null }));
        yield* product.add(withListing({ name: "Kopi Dua", code: null }));
        return (yield* product.get.all()).length;
      }),
    );

    expect(count).toBe(2);
  });

  test("a soft-deleted listing frees its code for reuse", async () => {
    const { layer } = setup();

    const outcome = await run(layer, (product) =>
      Effect.gen(function* () {
        const id = yield* product.add(withListing({ code: "abc" }));
        const listingId = (yield* product.get.byId(id)).listings[0].id;
        yield* product.set.listing.remove(id, listingId);
        const next = yield* product.add(withListing({ name: "Kopi Baru", code: "ABC" }));
        return yield* product.get.byId(next);
      }),
    );

    expect(outcome.listings.map((listing) => listing.code)).toEqual(["ABC"]);
  });

  test("kind is free text and is stored as given", async () => {
    const { layer } = setup();

    const listing = await run(layer, (product) =>
      Effect.gen(function* () {
        const id = yield* product.add(withListing({ kind: "karton" }));
        return (yield* product.get.byId(id)).listings[0];
      }),
    );

    expect(listing.kind).toBe("karton");
  });

  test("an empty kind is allowed", async () => {
    const { db, layer } = setup();

    const id = await run(layer, (product) => product.add(withListing({ kind: "" })));

    const row = db.query("SELECT listing_kind FROM listings WHERE product_id = ?").get(id) as {
      listing_kind: string;
    };
    expect(row).toEqual({ listing_kind: "" });
  });
});
