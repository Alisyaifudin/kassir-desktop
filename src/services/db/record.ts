import { Effect } from "effect";
import { DbError } from "~/database/sqlx/instance";

export type RecordDb = {
  count: {
    total: (start: number, end: number, mode: DBNamespace.Mode) => Effect.Effect<number, DbError>;
    record: (start: number, end: number) => Effect.Effect<{ in: number; out: number }, DbError>;
  };
};
