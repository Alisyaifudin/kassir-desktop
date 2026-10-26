import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { makeTestDatabase } from "../db/test-support";
import { CashierService } from ".";
import { CashierLive } from "./live";

/**
 * The cashier list backs the login picker, the day list and the receipt, and
 * `get.byId` is what the login screen reads the password hash from. Two rules
 * here have bitten before: a name is stored trimmed with its inner whitespace
 * collapsed, and `cashier_name` is UNIQUE — so two names that normalize to the
 * same text must fail cleanly rather than show up twice.
 */
function setup() {
  const { db, layer } = makeTestDatabase();
  return { db, layer: CashierLive.pipe(Layer.provide(layer)) };
}

function run<A>(
  layer: Layer.Layer<CashierService>,
  program: (cashier: Context.Tag.Service<typeof CashierService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const cashier = yield* CashierService;
      return yield* program(cashier);
    }).pipe(Effect.provide(layer)),
  );
}

type Row = { cashier_name: string; cashier_role: string; cashier_hash: string };

const findRow = (db: ReturnType<typeof setup>["db"], id: string): Row | null =>
  db
    .query<Row, [string]>(
      "SELECT cashier_name, cashier_role, cashier_hash FROM cashiers WHERE cashier_id = ?",
    )
    .get(id);

const row = (db: ReturnType<typeof setup>["db"], id: string): Row => {
  const found = findRow(db, id);
  if (found === null) throw new Error(`cashiers row ${id} is missing`);
  return found;
};

describe("CashierService", () => {
  test("the list is alphabetical and carries the role", async () => {
    const { layer } = setup();
    const all = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Siti", role: "user", hash: "h1" });
        yield* cashier.add({ id: "c2", name: "Ani", role: "admin", hash: "h2" });
        return yield* cashier.get.all();
      }),
    );

    expect(all.map((item) => item.name)).toEqual(["Ani", "Siti"]);
    expect(all[0].role).toBe("admin");
  });

  test("a name is stored trimmed with inner whitespace collapsed", async () => {
    const { db, layer } = setup();
    await run(layer, (cashier) =>
      cashier.add({ id: "c1", name: "  Budi   Santoso  ", role: "user", hash: "h1" }),
    );

    // Forms trim the ends, but nothing else did — the picker and the receipt
    // both render whatever is stored.
    expect(row(db, "c1").cashier_name).toBe("Budi Santoso");
    expect((await run(layer, (cashier) => cashier.get.all()))[0].name).toBe("Budi Santoso");
  });

  test("a rename is normalized and re-sorts the list", async () => {
    const { layer } = setup();
    const all = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Ani", role: "user", hash: "h1" });
        yield* cashier.add({ id: "c2", name: "Budi", role: "user", hash: "h2" });
        yield* cashier.set.name("c1", "  Zainab   Putri ");
        return yield* cashier.get.all();
      }),
    );

    expect(all.map((item) => item.name)).toEqual(["Budi", "Zainab Putri"]);
  });

  test("two names that normalize to the same text fail without a database string", async () => {
    const { layer } = setup();
    const result = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Budi", role: "user", hash: "h1" });
        const second = yield* Effect.either(
          cashier.add({ id: "c2", name: " Budi  ", role: "user", hash: "h2" }),
        );
        return { second, all: yield* cashier.get.all() };
      }),
    );

    expect(result.second._tag).toBe("Left");
    if (result.second._tag === "Left") {
      // `cashier_name` is UNIQUE, so this is what a duplicate looks like; the
      // cashier must not be shown the driver's "UNIQUE constraint failed".
      expect(result.second.left._tag).toBe("CashierError");
      expect(result.second.left.message).not.toContain("UNIQUE");
    }
    expect(result.all.map((item) => item.name)).toEqual(["Budi"]);
  });

  test("`byId` returns the stored hash for the login check", async () => {
    const { layer } = setup();
    const found = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Ani", role: "admin", hash: "hash-1" });
        return yield* cashier.get.byId("c1");
      }),
    );

    expect(found).toEqual({ id: "c1", name: "Ani", role: "admin", hash: "hash-1" });
  });

  test("`byId` reports a missing cashier as NotFound", async () => {
    const { layer } = setup();
    const result = await run(layer, (cashier) => Effect.either(cashier.get.byId("nope")));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left._tag).toBe("NotFound");
  });

  test("a password change is visible to `byId` without a reload", async () => {
    const { layer } = setup();
    const found = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Ani", role: "admin", hash: "old" });
        yield* cashier.set.password("c1", "new");
        return yield* cashier.get.byId("c1");
      }),
    );

    expect(found.hash).toBe("new");
  });

  test("a role change is reflected in the list", async () => {
    const { layer } = setup();
    const all = await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Ani", role: "user", hash: "h1" });
        yield* cashier.set.role("c1", "admin");
        return yield* cashier.get.all();
      }),
    );

    expect(all[0].role).toBe("admin");
  });

  test("a deleted cashier leaves the list and the table", async () => {
    const { db, layer } = setup();
    await run(layer, (cashier) =>
      Effect.gen(function* () {
        yield* cashier.add({ id: "c1", name: "Ani", role: "user", hash: "h1" });
        yield* cashier.delete("c1");
      }),
    );

    // Cashiers are not sync-able, so this is a real delete, not a tombstone.
    expect(findRow(db, "c1")).toBeNull();
    expect(await run(layer, (cashier) => cashier.get.all())).toEqual([]);
  });

  test("`changes` hydrates from the database before it replays", async () => {
    const { db, layer } = setup();
    db.exec(`INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
      VALUES ('c1', 'Ani', 'admin', 'h1')`);

    const head = await run(layer, (cashier) => Stream.runHead(cashier.get.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value.map((item) => item.name)).toEqual(["Ani"]);
  });
});
