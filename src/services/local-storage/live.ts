import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { LocalStorageError, LocalStorageService } from ".";
import { formatError } from "~/lib/utils";

export const LocalStorageLive = Layer.succeed(LocalStorageService, {
  get<T>(id: string) {
    return Effect.gen(function* () {
      const raw = yield* Effect.try({
        try: () => localStorage.getItem(id),
        catch: (e) =>
          new LocalStorageError({ message: `Gagal membaca local storage: \n${formatError(e)}` }),
      });
      if (raw === null) {
        return yield* Effect.fail(
          new NotFound({ message: `Local storage "${id}" tidak ditemukan` }),
        );
      }
      return yield* Effect.try({
        try: () => JSON.parse(raw) as T,
        catch: (e) =>
          new LocalStorageError({ message: `Gagal mengurai local storage: \n${formatError(e)}` }),
      });
    });
  },
  set<T>(id: string, value: T) {
    return Effect.gen(function* () {
      const raw = yield* Effect.try({
        try: () => JSON.stringify(value),
        catch: (e) =>
          new LocalStorageError({ message: `Gagal menyusun local storage: \n${formatError(e)}` }),
      });
      yield* Effect.try({
        try: () => localStorage.setItem(id, raw),
        catch: (e) =>
          new LocalStorageError({ message: `Gagal menyimpan local storage: \n${formatError(e)}` }),
      });
    });
  },
  remove(id: string) {
    return Effect.try({
      try: () => localStorage.removeItem(id),
      catch: (e) =>
        new LocalStorageError({ message: `Gagal menghapus local storage: \n${formatError(e)}` }),
    });
  },
});
