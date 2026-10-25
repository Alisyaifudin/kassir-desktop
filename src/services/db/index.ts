import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

/**
 * A database failure, split into the sentence the cashier sees and the diagnostic
 * for the log.
 *
 * `message` is rendered by the page fallbacks (`Record/z-Error`, `Money/z-Error`,
 * `Debt/z-Error`, every `TextError`), so it is one short Indonesian sentence and
 * never the driver text: a locked or corrupt database used to read
 * `Gagal mengeksekusi query: \nnear "FROM": syntax error` on the POS screen.
 * `detail` carries the raw driver text and goes to the app log only.
 */
export class DbError extends Data.TaggedError("DbError")<{ message: string; detail: string }> {}

export type Binding = number | string | null;

export type Statement = { sql: string; bindings?: Binding[] };

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  {
    execute: (query: string, bindings: Binding[]) => Effect.Effect<void, DbError>;
    selectMany: <T>(query: string, bindings?: Binding[]) => Effect.Effect<T[], DbError>;
    selectOne: <T>(query: string, bindings?: Binding[]) => Effect.Effect<T, DbError | NotFound>;
    transaction: (statements: Statement[]) => Effect.Effect<void, DbError>;
  }
>() {}
