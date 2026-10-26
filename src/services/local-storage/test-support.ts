import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { LocalStorageError, LocalStorageService } from ".";

/**
 * An in-memory localStorage for the services that keep a preference there
 * (`config` size, `auth` session).
 *
 * A separate fake from the real `LocalStorageLive` in `live.test.ts` on purpose:
 * those tests pin the JSON round-trip and the parse failures that only the real
 * browser API produces, while a service test wants a store it can seed with a
 * previous session and read back afterwards.
 *
 * `failure` makes every call fail with `LocalStorageError`, which is what a full
 * or disabled localStorage does. Services are expected to treat that as "no
 * preference", not as a crash.
 */
export function makeTestLocalStorage(seed: Record<string, unknown> = {}) {
  const entries = new Map<string, unknown>(Object.entries(seed));
  const state: { failure: string | null } = { failure: null };

  const fail = () =>
    state.failure === null ? null : new LocalStorageError({ message: state.failure });

  const layer = Layer.succeed(LocalStorageService, {
    get<T>(id: string) {
      const error = fail();
      if (error !== null) return Effect.fail(error);
      return entries.has(id)
        ? Effect.succeed(entries.get(id) as T)
        : Effect.fail(new NotFound({ message: `Local storage "${id}" tidak ditemukan` }));
    },
    set<T>(id: string, value: T) {
      const error = fail();
      if (error !== null) return Effect.fail(error);
      return Effect.sync(() => {
        entries.set(id, value);
      });
    },
    remove(id: string) {
      const error = fail();
      if (error !== null) return Effect.fail(error);
      return Effect.sync(() => {
        entries.delete(id);
      });
    },
  });

  return { entries, state, layer };
}
