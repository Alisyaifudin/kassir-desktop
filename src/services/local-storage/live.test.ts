import { beforeEach, describe, expect, test } from "bun:test";
import { Context, Effect } from "effect";
import { LocalStorageLive } from "./live";
import { LocalStorageService } from ".";

/**
 * The browser-backed layer itself, run against happy-dom's localStorage. The
 * services above it treat "missing" and "unreadable" differently — a missing key
 * is a first launch, a parse failure is a corrupt preference — so the two
 * outcomes have to stay distinguishable.
 */
function run<A>(
  program: (
    storage: Context.Tag.Service<typeof LocalStorageService>,
  ) => Effect.Effect<A, unknown>,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const storage = yield* LocalStorageService;
      return yield* program(storage);
    }).pipe(Effect.provide(LocalStorageLive)),
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("LocalStorageLive", () => {
  test("a value survives the JSON round-trip", async () => {
    const read = await run((storage) =>
      Effect.gen(function* () {
        yield* storage.set("invoices", [{ id: "r1", pay: 50000 }]);
        return yield* storage.get<{ id: string; pay: number }[]>("invoices");
      }),
    );

    expect(read).toEqual([{ id: "r1", pay: 50000 }]);
  });

  test("a missing key is NotFound, not an empty value", async () => {
    const result = await run((storage) => Effect.either(storage.get("never-set")));
    expect(result._tag).toBe("Left");
    if (result._tag === "Left") expect(result.left._tag).toBe("NotFound");
  });

  test("a corrupt entry is a LocalStorageError the service can fall back on", async () => {
    localStorage.setItem("size", "{not json");
    const result = await run((storage) => Effect.either(storage.get("size")));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("LocalStorageError");
      expect(result.left.message).toContain("Gagal mengurai");
    }
  });

  test("a value that cannot be stringified is refused before it reaches the browser", async () => {
    // BigInt is the cheapest thing JSON.stringify throws on; a cyclic object in
    // a preference would be the real-world case.
    const result = await run((storage) => Effect.either(storage.set("big", 10n as unknown)));

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(result.left._tag).toBe("LocalStorageError");
      expect(result.left.message).toContain("Gagal menyusun");
    }
    expect(localStorage.getItem("big")).toBeNull();
  });

  test("remove takes the key out, so the next read is NotFound again", async () => {
    const result = await run((storage) =>
      Effect.gen(function* () {
        yield* storage.set("user", { id: "c1" });
        yield* storage.remove("user");
        return yield* Effect.either(storage.get("user"));
      }),
    );

    expect(result._tag === "Left" && result.left._tag).toBe("NotFound");
  });

  test("a set overwrites without leaving the old entry behind", async () => {
    const read = await run((storage) =>
      Effect.gen(function* () {
        yield* storage.set("size", "small");
        yield* storage.set("size", "big");
        return yield* storage.get<string>("size");
      }),
    );

    expect(read).toBe("big");
  });
});
