import { describe, expect, test } from "bun:test";
import { Context, Effect, Layer, Stream } from "effect";
import { CashierLive } from "../cashier/live";
import { makeTestDatabase } from "../db/test-support";
import { makeTestLocalStorage } from "../local-storage/test-support";
import { AuthService, type User } from ".";
import { AuthLive } from "./live";

/**
 * The stored session is a hint, not a fact: the cashier it names may have been
 * deleted since, and the entry may be malformed by a crashed write. Either way
 * the app must open signed out — a login screen that trusts localStorage would
 * let a removed cashier straight back in.
 */
type Cashier = { id: string; name: string; role: "admin" | "user"; hash: string };

function setup(seed: { cashiers?: Cashier[]; storage?: Record<string, unknown> } = {}) {
  const { db, layer: dbLayer } = makeTestDatabase();
  for (const cashier of seed.cashiers ?? []) {
    db.query(
      `INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash)
       VALUES (?, ?, ?, ?)`,
    ).run(cashier.id, cashier.name, cashier.role, cashier.hash);
  }

  const storage = makeTestLocalStorage(seed.storage);
  const cashierLayer = CashierLive.pipe(Layer.provide(dbLayer));
  return {
    db,
    entries: storage.entries,
    state: storage.state,
    layer: AuthLive.pipe(Layer.provide(Layer.mergeAll(cashierLayer, storage.layer))),
  };
}

function run<A>(
  layer: Layer.Layer<AuthService>,
  program: (auth: Context.Tag.Service<typeof AuthService>) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const auth = yield* AuthService;
      return yield* program(auth);
    }).pipe(Effect.provide(layer)),
  );
}

const ANI: User = { id: "c1", name: "Ani", role: "admin" };

describe("AuthService", () => {
  test("a stored session whose cashier still exists is restored", async () => {
    const { layer } = setup({
      cashiers: [{ id: "c1", name: "Ani", role: "admin", hash: "h1" }],
      storage: { user: ANI },
    });

    expect(await run(layer, (auth) => auth.get())).toEqual(ANI);
  });

  test("a session pointing at a removed cashier is signed out and erased", async () => {
    const { entries, layer } = setup({ storage: { user: ANI } });

    expect(await run(layer, (auth) => auth.get())).toBeNull();
    // The next launch must not retry it.
    expect(entries.has("user")).toBe(false);
  });

  test("a malformed session is signed out rather than crashing the app", async () => {
    for (const stored of [
      { id: "", name: "Ani", role: "admin" },
      { id: "c1", name: "Ani", role: "manager" },
      { id: "c1" },
      "Ani",
    ]) {
      const { layer } = setup({
        cashiers: [{ id: "c1", name: "Ani", role: "admin", hash: "h1" }],
        storage: { user: stored },
      });
      expect(await run(layer, (auth) => auth.get())).toBeNull();
    }
  });

  test("signing in persists the user; signing out removes the entry", async () => {
    const { entries, layer } = setup({
      cashiers: [{ id: "c1", name: "Ani", role: "admin", hash: "h1" }],
    });

    await run(layer, (auth) => auth.set(ANI));
    expect(entries.get("user")).toEqual(ANI);
    expect(await run(layer, (auth) => auth.get())).toEqual(ANI);

    await run(layer, (auth) => auth.set(null));
    expect(entries.has("user")).toBe(false);
    expect(await run(layer, (auth) => auth.get())).toBeNull();
  });

  test("a storage that cannot be read is treated as signed out", async () => {
    const { state, layer } = setup({
      cashiers: [{ id: "c1", name: "Ani", role: "admin", hash: "h1" }],
      storage: { user: ANI },
    });
    state.failure = "local storage penuh";

    expect(await run(layer, (auth) => auth.get())).toBeNull();
  });

  test("`changes` hydrates on first subscribe, so the router waits for the check", async () => {
    const { layer } = setup({
      cashiers: [{ id: "c1", name: "Ani", role: "admin", hash: "h1" }],
      storage: { user: ANI },
    });

    const head = await run(layer, (auth) => Stream.runHead(auth.changes));

    expect(head._tag).toBe("Some");
    if (head._tag === "Some") expect(head.value).toEqual(ANI);
  });
});
