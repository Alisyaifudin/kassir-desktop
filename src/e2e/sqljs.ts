import initSqlJs, { type Database } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { DatabaseService, DbError, type Binding, type Statement } from "~/services/db";

/**
 * The app's real SQLite schema, in the browser. Test-only.
 *
 * `makeTestDatabase` (bun:sqlite) is the Node-side equivalent; this mirrors it
 * with sql.js so the same migration files back an end-to-end run in Chrome.
 */
const migrations = import.meta.glob("/src-tauri/src/database/**/migration-*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function migrationNumber(path: string): number {
  return Number(path.match(/migration-(\d+)\.sql/)?.[1] ?? 0);
}

export function migrationSql(): string[] {
  return Object.keys(migrations)
    .sort((a, b) => migrationNumber(a) - migrationNumber(b))
    .map((path) => migrations[path]);
}

export async function createBrowserDatabase(seed: string[] = []): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();

  // sqlx keeps foreign keys ON while it applies migrations (see the note in
  // migration-43), so match it: the table swaps in 19/32/36/39 rely on
  // `ALTER TABLE ... RENAME` rewriting FK references.
  db.exec("PRAGMA foreign_keys = ON");

  // sqlx runs each migration as its own batch; `exec` accepts the same files
  // verbatim, including the statements that cannot run inside a transaction.
  for (const sql of migrationSql()) db.exec(sql);
  for (const sql of seed) db.exec(sql);

  return db;
}

function fail(error: unknown): DbError {
  return new DbError({ message: `Gagal mengeksekusi query: \n${String(error)}` });
}

/** Runs one statement. Multi-statement strings are the caller's problem (`transaction`). */
function run(db: Database, query: string, bindings: Binding[] = []): Effect.Effect<void, DbError> {
  return Effect.try({
    try: () => {
      db.run(query, bindings as (string | number | null | Uint8Array)[]);
    },
    catch: fail,
  });
}

function all<T>(db: Database, query: string, bindings: Binding[] = []): Effect.Effect<T[], DbError> {
  return Effect.try({
    try: () => {
      const statement = db.prepare(query);
      try {
        statement.bind(bindings as (string | number | null | Uint8Array)[]);
        const rows: T[] = [];
        while (statement.step()) rows.push(statement.getAsObject() as T);
        return rows;
      } finally {
        statement.free();
      }
    },
    catch: fail,
  });
}

export function databaseLayer(db: Database): Layer.Layer<DatabaseService> {
  return Layer.succeed(DatabaseService, {
    execute: (query, bindings) => run(db, query, bindings),
    selectMany: <T>(query: string, bindings?: Binding[]) => all<T>(db, query, bindings),
    selectOne: <T>(query: string, bindings?: Binding[]) =>
      Effect.gen(function* () {
        const rows = yield* all<T>(db, query, bindings);
        const row = rows[0];
        if (row === undefined) return yield* Effect.fail(new NotFound({ message: "Kosong" }));
        return row;
      }),
    // Mirrors `makeTestDatabase` rather than `DatabaseLive`: production joins the
    // statements into one `$N`-numbered batch because plugin-sql exposes no
    // transaction API. sql.js has no such limitation, so each statement runs
    // with its own bindings and a real BEGIN/COMMIT guards the group.
    transaction: (statements: Statement[]) =>
      Effect.gen(function* () {
        yield* run(db, "BEGIN");
        yield* Effect.forEach(
          statements,
          (statement: Statement) => run(db, statement.sql, statement.bindings ?? []),
          { discard: true },
        ).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              db.exec("ROLLBACK");
            }),
          ),
        );
        yield* run(db, "COMMIT");
      }),
  });
}
