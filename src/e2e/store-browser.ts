import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { StoreError, StoreService } from "~/services/store";

/**
 * `StoreService` backed by `localStorage`. Test-only: the real layer is
 * `tauri-plugin-store`, which needs the Rust process. Same contract, and
 * `localStorage` survives a reload the way the real store file does.
 */
const PREFIX = "kassir:store:";

function fail(error: unknown): StoreError {
  return new StoreError({ message: `Gagal mengakses store: \n${String(error)}` });
}

export const StoreBrowserLive = Layer.succeed(StoreService, {
  get<T>(id: string) {
    return Effect.gen(function* () {
      const raw = yield* Effect.try({
        try: () => localStorage.getItem(PREFIX + id),
        catch: fail,
      });
      if (raw === null) {
        return yield* Effect.fail(new NotFound({ message: `Store "${id}" tidak ditemukan` }));
      }
      return yield* Effect.try({ try: () => JSON.parse(raw) as T, catch: fail });
    });
  },
  entries() {
    return Effect.try({
      try: () => {
        const snapshot: Record<string, unknown> = {};
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key === null || !key.startsWith(PREFIX)) continue;
          const raw = localStorage.getItem(key);
          if (raw === null) continue;
          snapshot[key.slice(PREFIX.length)] = JSON.parse(raw) as unknown;
        }
        return snapshot;
      },
      catch: fail,
    });
  },
  set<T>(id: string, value: T) {
    return Effect.try({
      try: () => localStorage.setItem(PREFIX + id, JSON.stringify(value)),
      catch: fail,
    });
  },
  remove(id: string) {
    return Effect.try({
      try: () => localStorage.removeItem(PREFIX + id),
      catch: fail,
    });
  },
});
