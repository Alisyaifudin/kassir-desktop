import { Database } from "bun:sqlite";
import { Glob } from "bun";
import { readFileSync } from "node:fs";
import { Effect, Layer } from "effect";
import { NotFound } from "~/lib/effect-error";
import { DatabaseService, DbError, type Binding, type Statement } from ".";

/**
 * A real `data.db` at the current schema, backed by `bun:sqlite`, plus a
 * `DatabaseService` layer that runs the app's SQL against it. Test-only.
 *
 * Every statement goes through Effect: the transaction helper begins, runs the
 * statements, rolls back on the first failure, and commits. No `try`/`catch`.
 */
export function makeTestDatabase() {
  const db = new Database(":memory:");
  // Counted so a caller can assert a *batch* really was one call (the sync merge
  // promises "one transaction for the whole pull").
  const counters = { transactions: 0 };
  const files = [...new Glob("src-tauri/src/database/**/migration-*.sql").scanSync(".")];
  files.sort((a, b) => {
    const n = (s: string) => Number(s.match(/migration-(\d+)\.sql/)?.[1] ?? 0);
    return n(a) - n(b);
  });
  for (const file of files) db.exec(readFileSync(file, "utf8"));

  const run = (query: string, bindings: Binding[] = []): Effect.Effect<void, DbError> =>
    Effect.try({
      try: () => {
        db.query(query).run(...bindings);
      },
      catch: (error) =>
        new DbError({ message: "Data gagal disimpan. Coba lagi.", detail: String(error) }),
    });

  const all = <T>(query: string, bindings: Binding[] = []): Effect.Effect<T[], DbError> =>
    Effect.try({
      try: () => db.query(query).all(...bindings) as T[],
      catch: (error) =>
        new DbError({ message: "Data gagal dibaca. Coba lagi.", detail: String(error) }),
    });

  const layer = Layer.succeed(DatabaseService, {
    execute: run,
    selectMany: all,
    selectOne: <T>(query: string, bindings?: Binding[]) =>
      Effect.gen(function* () {
        const rows = yield* all<T>(query, bindings);
        const row = rows[0];
        if (row === undefined) return yield* Effect.fail(new NotFound({ message: "Kosong" }));
        return row;
      }),
    transaction: (statements: Statement[]) =>
      Effect.gen(function* () {
        counters.transactions += 1;
        yield* run("BEGIN");
        yield* Effect.forEach(
          statements,
          (statement: Statement) => run(statement.sql, statement.bindings ?? []),
          { discard: true },
        ).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              db.exec("ROLLBACK");
            }),
          ),
        );
        yield* run("COMMIT");
      }),
  });

  return { db, layer, counters };
}
