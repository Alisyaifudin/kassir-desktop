import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { StoreService } from ".";

/**
 * An in-memory `store.json`, so the preference services (info, printer, method
 * defaults) can be exercised without the Tauri plugin.
 *
 * `entries` is exposed on purpose: a service hydrates its own cache from the
 * store on first read, so reading back through the service cannot tell a write
 * from a cached value. The map is what the next app launch would see.
 *
 * Seed it to stand in for a store.json left by an earlier run, including the
 * malformed values a hand-edited file can carry.
 */
export function makeTestStore(seed: Record<string, unknown> = {}) {
  const entries = new Map<string, unknown>(Object.entries(seed));

  const layer = Layer.succeed(StoreService, {
    get<T>(id: string) {
      return entries.has(id)
        ? Effect.succeed(entries.get(id) as T)
        : Effect.fail(new NotFound({ message: `Store "${id}" tidak ditemukan` }));
    },
    set<T>(id: string, value: T) {
      return Effect.sync(() => {
        entries.set(id, value);
      });
    },
    remove(id: string) {
      return Effect.sync(() => {
        entries.delete(id);
      });
    },
  });

  return { entries, layer };
}
