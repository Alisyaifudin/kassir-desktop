import Database from "@tauri-apps/plugin-sql";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { Binding, DatabaseService, DbError } from ".";
import { formatError } from "~/lib/utils";


const DB_PATH = "sqlite:data.db";
let _getDb: Effect.Effect<Database, DbError> | null = null;

function getDb() {
  if (_getDb === null) {
    _getDb = Effect.tryPromise({
      try: () => Database.load(DB_PATH),
      catch: (e) => new DbError({ message: `Gagal memuat database: \n${formatError(e)}` }),
    });
  }
  return _getDb;
}

export const DatabaseLive = Layer.succeed(DatabaseService, {
  execute(query: string, bindings: Binding[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      yield* Effect.tryPromise({
        try: () => db.execute(query, bindings),
        catch: (e) => new DbError({ message: `Gagal mengeksekusi query: \n${formatError(e)}` }),
      });
    });
  },
  selectMany<T>(query: string, bindings?: Binding[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      const res = yield* Effect.tryPromise({
        try: () => db.select<T[]>(query, bindings),
        catch: (e) => new DbError({ message: `Gagal mengeksekusi query: \n${formatError(e)}` }),
      });
      return res;
    });
  },
  selectOne<T>(query: string, bindings?: Binding[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      const res = yield* Effect.tryPromise({
        try: () => db.select<T[]>(query, bindings),
        catch: (e) => new DbError({ message: `Gagal mengeksekusi query: \n${formatError(e)}` }),
      });
      if (res.length > 0) return res[0];
      return yield* Effect.fail(new NotFound({ message: "Tidak ditemukan" }));
    });
  },
});
