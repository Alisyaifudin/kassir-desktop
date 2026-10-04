import { Effect, Context, Data } from "effect";
import { NotFound } from "~/lib/effect-error";

export class DbError extends Data.TaggedError("DbError")<{ message: string }> {}

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
