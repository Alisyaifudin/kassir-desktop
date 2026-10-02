import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { StoreError, StoreService } from ".";
import { formatError } from "~/lib/utils";

const STORE_PATH = "store.json";
let _getStore: Effect.Effect<StoreTauri, StoreError> | null = null;

function getStore() {
  if (_getStore === null) {
    _getStore = Effect.tryPromise({
      try: () => StoreTauri.load(STORE_PATH),
      catch: (e) => new StoreError({ message: `Gagal memuat store: \n${formatError(e)}` }),
    });
  }
  return _getStore;
}

export const StoreLive = Layer.succeed(StoreService, {
  get<T>(id: string) {
    return Effect.gen(function* () {
      const store = yield* getStore();
      const value = yield* Effect.tryPromise({
        try: () => store.get<T>(id),
        catch: (e) => new StoreError({ message: `Gagal membaca store: \n${formatError(e)}` }),
      });
      if (value === undefined || value === null) {
        return yield* Effect.fail(new NotFound({ message: `Store "${id}" tidak ditemukan` }));
      }
      return value;
    });
  },
  set<T>(id: string, value: T) {
    return Effect.gen(function* () {
      const store = yield* getStore();
      yield* Effect.tryPromise({
        try: () => store.set(id, value),
        catch: (e) => new StoreError({ message: `Gagal menyimpan store: \n${formatError(e)}` }),
      });
    });
  },
});
