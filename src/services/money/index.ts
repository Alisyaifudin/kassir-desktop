import { Effect, Context, Data, Stream } from "effect";
import type { DuplicateError } from "~/lib/effect-error";

export class MoneyError extends Data.TaggedError("MoneyError")<{ message: string }> {}

/** `absolute` stores the balance as entered; `change` stores a running total. */
export type PocketType = "absolute" | "change";

/** A money pocket ("kantong"): a named ledger the entries hang off. */
export type Pocket = {
  id: string;
  name: string;
  type: PocketType;
  ordering: number;
  updatedAt: number;
  syncAt: number | null;
  deletedAt: number | null;
};

/** One line in a pocket's ledger. `value` is always the absolute balance. */
export type MoneyEntry = {
  id: string;
  pocketId: string;
  timestamp: number;
  value: number;
  note: string;
  updatedAt: number;
  syncAt: number | null;
  deletedAt: number | null;
};

/** A pocket with its most recent entry — what the `/money` grid renders. */
export type PocketSummary = {
  pocket: Pocket;
  latest: { timestamp: number; value: number } | null;
};

export type NewEntry = {
  pocketId: string;
  timestamp: number;
  value: number;
  note: string;
};

export class MoneyService extends Context.Tag("MoneyService")<
  MoneyService,
  {
    pockets: {
      get: {
        /** The catalog, oldest `ordering` first. */
        summary: () => Effect.Effect<PocketSummary[], MoneyError>;
        /** Tracks the catalog and every pocket's latest entry. */
        changes: Stream.Stream<PocketSummary[], MoneyError>;
      };
      add: (input: { name: string; type: PocketType }) => Effect.Effect<string, MoneyError>;
      set: {
        name: (id: string, name: string) => Effect.Effect<void, MoneyError>;
        type: (id: string, type: PocketType) => Effect.Effect<void, MoneyError>;
        /** Reassigns `order` across the given pockets in one write. */
        ordering: (items: { id: string; order: number }[]) => Effect.Effect<void, MoneyError>;
      };
      /** Soft-deletes the pocket and, with it, every entry it holds. */
      delete: { byId: (id: string) => Effect.Effect<void, MoneyError> };
    };
    entries: {
      get: {
        /** Entries in `[start, end)`, newest first. */
        byRange: (
          pocketId: string,
          start: number,
          end: number,
        ) => Effect.Effect<MoneyEntry[], MoneyError>;
        /** Every entry in a pocket, newest first — the JSON export. */
        all: (pocketId: string) => Effect.Effect<MoneyEntry[], MoneyError>;
        /** The value in force before `timestamp`; 0 when nothing precedes it. */
        last: (pocketId: string, timestamp: number) => Effect.Effect<number, MoneyError>;
        /** Bumps on every entry write; a queried history re-reads on it. */
        revision: Stream.Stream<number, MoneyError>;
      };
      add: {
        one: (input: NewEntry) => Effect.Effect<string, MoneyError>;
        /** Skips an entry whose pocket already holds one at the same instant. */
        imported: (input: NewEntry) => Effect.Effect<void, MoneyError | DuplicateError>;
      };
      delete: { byId: (id: string) => Effect.Effect<void, MoneyError> };
    };
  }
>() {}
