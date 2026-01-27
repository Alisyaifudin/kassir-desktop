import { Store as StoreTauri } from "@tauri-apps/plugin-store";
import { Effect } from "effect";
import { StoreError } from "./error";

interface Store {
  get: (key: string) => Effect.Effect<unknown, StoreError>;
  set: (key: string, value: unknown) => Effect.Effect<void, StoreError>;
  delete: (key: string) => Effect.Effect<void, StoreError>;
}

let store: undefined | Store = undefined;

const STORE_PATH = "store.json";

export function getStore() {
  return Effect.gen(function* () {
    if (store !== undefined) return store;
    const tauriStore = yield* Effect.tryPromise({
      try: () => StoreTauri.load(STORE_PATH),
      catch: (e) => StoreError.new(e),
    });
    store = {
      get: (key) =>
        Effect.tryPromise({
          try: () => tauriStore.get(key),
          catch: (e) => StoreError.new(e),
        }),
      set: (key, value) =>
        Effect.tryPromise({
          try: () => tauriStore.set(key, value),
          catch: (e) => StoreError.new(e),
        }),
      delete: (key) =>
        Effect.tryPromise({
          try: () => tauriStore.delete(key),
          catch: (e) => StoreError.new(e),
        }),
    };
    return store;
  });
}
