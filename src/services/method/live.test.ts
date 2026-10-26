import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { makeTestStore } from "../store/test-support";
import { MethodService, type Method } from ".";
import { MethodLive } from "./live";

/**
 * The payment-method catalog is two stores read as one: the methods live in
 * SQLite (ordered by kind, with each kind's base method first) and the per-kind
 * default lives in `store.json`. The POS renders them together, so a rename that
 * forgets to re-read, or a default that drags the method list into a new array,
 * is a visible jump on the cart screen.
 */
function setup(seed: Record<string, unknown> = {}) {
  const { db, layer: dbLayer } = makeTestDatabase();
  const store = makeTestStore(seed);
  return {
    db,
    entries: store.entries,
    layer: MethodLive.pipe(Layer.provide(Layer.mergeAll(dbLayer, store.layer))),
  };
}

function run<A>(
  layer: Layer.Layer<MethodService>,
  program: (method: Context.Tag.Service<typeof MethodService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const method = yield* MethodService;
      return yield* program(method);
    }).pipe(Effect.provide(layer)),
  );
}

/** The names of one kind's methods, in catalog order; `null` is a base method. */
const names = (methods: Method[], kind: string) =>
  methods.filter((method) => method.kind === kind).map((method) => method.name);

type MethodRow = { method_deleted_at: number | null; method_name: string | null };

const row = (db: ReturnType<typeof setup>["db"], id: string): MethodRow => {
  const found = db
    .query<MethodRow, [string]>(
      "SELECT method_deleted_at, method_name FROM methods WHERE method_id = ?",
    )
    .get(id);
  if (found === null) throw new Error(`methods row ${id} is missing`);
  return found;
};

describe("MethodService", () => {
  test("the catalog starts with the four built-in methods, none of them named", async () => {
    const { layer } = setup();
    const catalog = await run(layer, (method) => method.get.catalog());

    expect(catalog.methods.map((method) => [method.kind, method.name])).toEqual([
      ["cash", null],
      ["debit", null],
      ["qris", null],
      ["transfer", null],
    ]);
    expect(catalog.defaults).toEqual({});
  });

  test("an added method lands behind its kind's base method", async () => {
    const { layer } = setup();
    const catalog = await run(layer, (method) =>
      Effect.gen(function* () {
        yield* method.add({ name: "BCA", kind: "transfer" });
        yield* method.add({ name: "BRI", kind: "transfer" });
        return yield* method.get.catalog();
      }),
    );

    // `method_name IS NULL` sorts first, so the base transfer method stays the
    // one the till offers by default.
    expect(names(catalog.methods, "transfer")).toEqual([null, "BCA", "BRI"]);
    // And the other kinds are untouched.
    expect(names(catalog.methods, "cash")).toEqual([null]);
  });

  test("a rename re-reads the methods and re-sorts them", async () => {
    const { layer } = setup();
    const catalog = await run(layer, (method) =>
      Effect.gen(function* () {
        const bca = yield* method.add({ name: "BCA", kind: "transfer" });
        yield* method.add({ name: "BRI", kind: "transfer" });
        yield* method.set.name(bca, "ZZZ");
        return yield* method.get.catalog();
      }),
    );

    expect(names(catalog.methods, "transfer")).toEqual([null, "BRI", "ZZZ"]);
  });

  test("`get.all` is the method slice of the catalog", async () => {
    const { layer } = setup();
    const result = await run(layer, (method) =>
      Effect.gen(function* () {
        yield* method.add({ name: "BCA", kind: "transfer" });
        return { all: yield* method.get.all(), catalog: yield* method.get.catalog() };
      }),
    );

    expect(result.all).toEqual(result.catalog.methods);
  });

  test("a delete hides the method but keeps the row for records that point at it", async () => {
    const { db, layer } = setup();
    const id = await run(layer, (method) =>
      Effect.gen(function* () {
        const id = yield* method.add({ name: "BCA", kind: "transfer" });
        yield* method.delete.byId(id);
        return id;
      }),
    );

    // `record_methods.method_id` has a foreign key onto this row.
    expect(row(db, id).method_deleted_at).not.toBeNull();
    const catalog = await run(layer, (method) => method.get.catalog());
    expect(names(catalog.methods, "transfer")).toEqual([null]);
  });

  test("a default is written to the store under its kind and read back into the catalog", async () => {
    const { entries, layer } = setup();
    const id = await run(layer, (method) =>
      Effect.gen(function* () {
        const id = yield* method.add({ name: "BCA", kind: "transfer" });
        yield* method.set.default("transfer", id);
        return id;
      }),
    );

    expect(entries.get("default-transfer")).toBe(id);
    // A fresh instance hydrates the defaults from the store.
    const catalog = await run(layer, (method) => method.get.catalog());
    expect(catalog.defaults).toEqual({ transfer: id });
  });

  test("clearing a default removes the key and the entry", async () => {
    const { entries, layer } = setup();
    const after = await run(layer, (method) =>
      Effect.gen(function* () {
        const id = yield* method.add({ name: "BCA", kind: "transfer" });
        yield* method.set.default("transfer", id);
        yield* method.set.default("transfer", null);
        return yield* method.get.catalog();
      }),
    );

    // An unset default and one just cleared have to read the same everywhere.
    expect(entries.has("default-transfer")).toBe(false);
    expect(after.defaults).toEqual({});
  });

  test("a default seeded by an earlier run is hydrated with the catalog", async () => {
    const { layer } = setup({ "default-qris": "m1", "default-transfer": "" });

    const catalog = await run(layer, (method) => method.get.catalog());

    // An empty stored id means "no default", not a method called "".
    expect(catalog.defaults).toEqual({ qris: "m1" });
  });

  test("changing a default keeps the method array's identity", async () => {
    const { layer } = setup();
    const result = await run(layer, (method) =>
      Effect.gen(function* () {
        const id = yield* method.add({ name: "BCA", kind: "transfer" });
        const before = yield* method.get.catalog();
        yield* method.set.default("transfer", id);
        const after = yield* method.get.catalog();
        return { before, after };
      }),
    );

    // `catalogChanges` re-emits for either slice; a reader that only watches
    // methods must not see a new array because a default moved.
    expect(result.after.methods).toBe(result.before.methods);
    expect(result.after.defaults).not.toEqual(result.before.defaults);
  });
});
