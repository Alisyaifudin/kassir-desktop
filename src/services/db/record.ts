import { Effect } from "effect";
import type { DbError } from ".";

export type RecordDb = {
  count: {
    total: (start: number, end: number, mode: DBNamespace.Mode) => Effect.Effect<number, DbError>;
    record: (start: number, end: number) => Effect.Effect<{ in: number; out: number }, DbError>;
  };
};
