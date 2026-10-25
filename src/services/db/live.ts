import Database from "@tauri-apps/plugin-sql";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { Binding, DatabaseService, DbError, Statement } from ".";
import { flattenTransaction } from "./transaction";
import {
  DB_OPEN_FAILED,
  DB_READ_FAILED,
  DB_WRITE_FAILED,
  dbFailure,
} from "./failure";

const DB_PATH = "sqlite:data.db";
let _getDb: Effect.Effect<Database, DbError> | null = null;

function getDb() {
  if (_getDb === null) {
    _getDb = Effect.tryPromise({
      try: () => Database.load(DB_PATH),
      catch: (e) => dbFailure(DB_OPEN_FAILED, e),
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
        catch: (e) => dbFailure(DB_WRITE_FAILED, e),
      });
    });
  },
  selectMany<T>(query: string, bindings?: Binding[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      const res = yield* Effect.tryPromise({
        try: () => db.select<T[]>(query, bindings),
        catch: (e) => dbFailure(DB_READ_FAILED, e),
      });
      return res;
    });
  },
  selectOne<T>(query: string, bindings?: Binding[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      const res = yield* Effect.tryPromise({
        try: () => db.select<T[]>(query, bindings),
        catch: (e) => dbFailure(DB_READ_FAILED, e),
      });
      if (res.length > 0) return res[0];
      return yield* Effect.fail(new NotFound({ message: "Tidak ditemukan" }));
    });
  },
  // plugin-sql exposes no transaction API, but a single `execute` call is itself
  // atomic. Statements are joined with `;`; sqlx numbers `$N` across the whole
  // batch, so `flattenTransaction` shifts each statement's placeholders and
  // flattens the bindings in statement order. No BEGIN/COMMIT — that would nest
  // inside execute.
  transaction(statements: Statement[]) {
    return Effect.gen(function* () {
      const db = yield* getDb();
      const { query, bindings } = flattenTransaction(statements);
      yield* Effect.tryPromise({
        try: () => db.execute(query, bindings),
        catch: (e) => dbFailure(DB_WRITE_FAILED, e),
      });
    });
  },
});
