import Database from "@tauri-apps/plugin-sql";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { Binding, DatabaseService, DbError, Statement } from ".";
import { flattenTransaction } from "./transaction";
import { enableWriteAheadLog } from "./journal";
import {
  DB_OPEN_FAILED,
  DB_READ_FAILED,
  DB_WRITE_FAILED,
  dbFailure,
} from "./failure";

const DB_PATH = "sqlite:data.db";

/**
 * The opened handle, cached as a **promise**.
 *
 * Not as an `Effect`: an Effect is a *description* of work, so
 * `Effect.tryPromise` re-runs its thunk on every execution. Caching the
 * description and `yield*`-ing it from each operation therefore called
 * `Database.load()` again for every single statement — and
 * `tauri_plugin_sql`'s `load` has no "already loaded" shortcut: it builds a
 * fresh `sqlx` pool (a fresh SQLite connection) and replaces the map entry on
 * each call. So one statement cost an open + `PRAGMA journal_mode` + a log
 * write + the query itself: four IPC round trips where one was meant.
 *
 * Invisible until it was not. A 1000-record push batch issues ~5,000 statements
 * (five child reads per record, `sync/push.ts`), and the connection churn alone
 * stretched each batch to ~28 s. The whole database is opened once here now;
 * the app log said so too — `db: journal mode is wal` was being written ~190
 * times a second.
 */
let _db: Promise<Database> | null = null;

function openDb(): Promise<Database> {
  const attempt = (async () => {
    const db = await Database.load(DB_PATH);
    // Before the first query, and best effort: a database that cannot host
    // `-wal` (a network share) keeps its journal mode and the app still opens.
    await enableWriteAheadLog(db);
    return db;
  })();
  // A failed open is not cached: the next statement retries it, which is what
  // the per-call Effect did. The handler also keeps the rejection from being
  // reported as unhandled while `getDb`'s own tryPromise reports it.
  void attempt.catch(() => {
    if (_db === attempt) _db = null;
  });
  _db = attempt;
  return attempt;
}

function getDb(): Effect.Effect<Database, DbError> {
  const handle = _db ?? openDb();
  return Effect.tryPromise({
    try: () => handle,
    catch: (e) => dbFailure(DB_OPEN_FAILED, e),
  });
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
