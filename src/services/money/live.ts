import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import {
  MoneyError,
  MoneyService,
  type MoneyEntry,
  type NewEntry,
  type Pocket,
  type PocketSummary,
  type PocketType,
} from ".";
import { DatabaseService, type DbError, type Statement } from "../db";
import { DuplicateError } from "~/lib/effect-error";
import { generateId } from "~/lib/random";

type SummaryRow = {
  pocket_id: string;
  pocket_name: string;
  pocket_type: PocketType;
  pocket_ordering: number;
  pocket_updated_at: number;
  pocket_sync_at: number | null;
  pocket_deleted_at: number | null;
  latest_timestamp: number | null;
  latest_value: number | null;
};

type EntryRow = {
  money_id: string;
  pocket_id: string;
  timestamp: number;
  money_value: number;
  money_note: string;
  money_updated_at: number;
  money_sync_at: number | null;
  money_deleted_at: number | null;
};

// The catalog is a handful of rows, so it fits the one-ref model — but a pocket
// card needs its latest balance too, and that comes from `money`. The ref
// therefore holds pockets joined to their most recent entry, so a reorder, a
// rename or a new entry all reach subscribers through one stream.
//
// `timestamp DESC, money_id DESC` is the tiebreak the in-memory patch below
// mirrors: entries can share an instant (an import), and the card must show the
// same row the next hydrate will.
const SUMMARY_COLUMNS = `
  SELECT
    p.pocket_id, p.pocket_name, p.pocket_type, p.pocket_ordering,
    p.pocket_updated_at, p.pocket_sync_at, p.pocket_deleted_at,
    m.timestamp AS latest_timestamp,
    m.money_value AS latest_value
  FROM pockets p
  LEFT JOIN money m ON m.money_id = (
    SELECT money_id FROM money
    WHERE pocket_id = p.pocket_id AND money_deleted_at IS NULL
    ORDER BY timestamp DESC, money_id DESC
    LIMIT 1
  )
  WHERE p.pocket_deleted_at IS NULL`;

/** Every pocket's card — the first read, and an explicit refresh. */
const SELECT_SUMMARY = `${SUMMARY_COLUMNS}
  ORDER BY p.pocket_ordering ASC, p.pocket_id ASC`;

/** One pocket's card, for the write paths that only moved one pocket. */
const SELECT_SUMMARY_ONE = `${SUMMARY_COLUMNS} AND p.pocket_id = $1`;

/** The ref's order, mirrored locally so a patch cannot reorder the screen. */
function byPocketOrder(a: PocketSummary, b: PocketSummary): number {
  return a.pocket.ordering - b.pocket.ordering || a.pocket.id.localeCompare(b.pocket.id);
}

const ENTRY_COLUMNS = `
  money_id, pocket_id, timestamp, money_value, money_note,
  money_updated_at, money_sync_at, money_deleted_at`;

const SELECT_ENTRIES_BY_RANGE = `
  SELECT ${ENTRY_COLUMNS} FROM money
  WHERE pocket_id = $1 AND money_deleted_at IS NULL
    AND timestamp >= $2 AND timestamp < $3
  ORDER BY timestamp DESC, money_id DESC`;

const SELECT_ENTRIES = `
  SELECT ${ENTRY_COLUMNS} FROM money
  WHERE pocket_id = $1 AND money_deleted_at IS NULL
  ORDER BY timestamp DESC, money_id DESC`;

const SELECT_LAST = `
  SELECT money_value FROM money
  WHERE pocket_id = $1 AND money_deleted_at IS NULL AND timestamp < $2
  ORDER BY timestamp DESC, money_id DESC
  LIMIT 1`;

const SELECT_DUPLICATE = `
  SELECT timestamp FROM money
  WHERE pocket_id = $1 AND timestamp = $2 AND money_deleted_at IS NULL
  LIMIT 1`;

const SELECT_POCKET_OF_ENTRY =
  "SELECT pocket_id FROM money WHERE money_id = $1 AND money_deleted_at IS NULL";

const COUNT_POCKETS =
  "SELECT COUNT(*) AS count FROM pockets WHERE pocket_deleted_at IS NULL";

function dbErrorToMoneyError(error: DbError): MoneyError {
  return new MoneyError({ message: error.message });
}

function rowToPocket(row: SummaryRow): Pocket {
  return {
    id: row.pocket_id,
    name: row.pocket_name,
    type: row.pocket_type,
    ordering: row.pocket_ordering,
    updatedAt: row.pocket_updated_at,
    syncAt: row.pocket_sync_at,
    deletedAt: row.pocket_deleted_at,
  };
}

function rowToSummary(row: SummaryRow): PocketSummary {
  return {
    pocket: rowToPocket(row),
    latest:
      row.latest_timestamp === null
        ? null
        : { timestamp: row.latest_timestamp, value: row.latest_value ?? 0 },
  };
}

function rowToEntry(row: EntryRow): MoneyEntry {
  return {
    id: row.money_id,
    pocketId: row.pocket_id,
    timestamp: row.timestamp,
    value: row.money_value,
    note: row.money_note,
    updatedAt: row.money_updated_at,
    syncAt: row.money_sync_at,
    deletedAt: row.money_deleted_at,
  };
}

function insertEntryStatement(id: string, input: NewEntry, now: number): Statement {
  return {
    sql: `INSERT INTO money (
        money_id, timestamp, money_value, pocket_id, money_note,
        money_updated_at, money_sync_at, money_deleted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
    bindings: [id, input.timestamp, input.value, input.pocketId, input.note, now],
  };
}

export const MoneyLive = Layer.effect(
  MoneyService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const ref = yield* SubscriptionRef.make<PocketSummary[]>([]);
    // Bumped on every entry write; a queried history re-reads on it.
    const revisionRef = yield* SubscriptionRef.make<number>(0);
    let loaded = false;

    function load(): Effect.Effect<PocketSummary[], MoneyError> {
      return db
        .selectMany<SummaryRow>(SELECT_SUMMARY)
        .pipe(Effect.mapError(dbErrorToMoneyError), Effect.map((rows) => rows.map(rowToSummary)));
    }

    function hydrate(): Effect.Effect<void, MoneyError> {
      return Effect.gen(function* () {
        const summaries = yield* load();
        yield* SubscriptionRef.set(ref, summaries);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, MoneyError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: Statement[]): Effect.Effect<void, MoneyError> {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToMoneyError));
    }

    function bumpRevision(): Effect.Effect<void> {
      return SubscriptionRef.update(revisionRef, (current) => current + 1);
    }

    /** Folds a freshly written entry into its pocket's card, without a re-read. */
    function noteLatest(input: NewEntry): Effect.Effect<void> {
      return SubscriptionRef.update(ref, (current) =>
        current.map((summary) => {
          if (summary.pocket.id !== input.pocketId) return summary;
          if (summary.latest !== null && input.timestamp < summary.latest.timestamp) {
            return summary;
          }
          return { ...summary, latest: { timestamp: input.timestamp, value: input.value } };
        }),
      );
    }

    /**
     * Re-reads one pocket's card — a deleted entry can promote an older one, so
     * the answer cannot be patched from the write. Narrow on purpose: one pocket
     * with its latest entry, not the whole journal, which only grows.
     */
    function refreshPocket(pocketId: string): Effect.Effect<void, MoneyError> {
      return Effect.gen(function* () {
        const rows = yield* db
          .selectMany<SummaryRow>(SELECT_SUMMARY_ONE, [pocketId])
          .pipe(Effect.mapError(dbErrorToMoneyError));
        const next = rows[0] === undefined ? undefined : rowToSummary(rows[0]);
        if (next === undefined) return;
        yield* SubscriptionRef.update(ref, (current) =>
          current
            .map((summary) => (summary.pocket.id === pocketId ? next : summary))
            .sort(byPocketOrder),
        );
      });
    }

    /** Append a pocket created by this write, in the ref's order. */
    function notePocket(summary: PocketSummary): Effect.Effect<void> {
      return SubscriptionRef.update(ref, (current) => [...current, summary].sort(byPocketOrder));
    }

    /** Patch one pocket's card from what the write already knows. */
    function patchPocket(
      pocketId: string,
      patch: (summary: PocketSummary) => PocketSummary,
    ): Effect.Effect<void> {
      return SubscriptionRef.update(ref, (current) =>
        current
          .map((summary) => (summary.pocket.id === pocketId ? patch(summary) : summary))
          .sort(byPocketOrder),
      );
    }

    return {
      pockets: {
        get: {
          summary: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
          changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes))),
        },
        add({ name, type }) {
          return Effect.gen(function* () {
            const id = generateId();
            const now = Date.now();
            const count = yield* db
              .selectMany<{ count: number }>(COUNT_POCKETS)
              .pipe(
                Effect.mapError(dbErrorToMoneyError),
                Effect.map((rows) => rows[0]?.count ?? 0),
              );
            yield* commit([
              {
                sql: `INSERT INTO pockets (
                    pocket_id, pocket_name, pocket_type, pocket_ordering,
                    pocket_updated_at, pocket_sync_at, pocket_deleted_at
                  ) VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
                bindings: [id, name, type, count, now],
              },
            ]);
            yield* notePocket({
              pocket: { id, name, type, ordering: count, updatedAt: now, syncAt: null, deletedAt: null },
              latest: null,
            });
            return id;
          });
        },
        set: {
          name(id, name) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: `UPDATE pockets SET
                      pocket_name = $1, pocket_updated_at = $2, pocket_sync_at = NULL
                    WHERE pocket_id = $3`,
                  bindings: [name, now, id],
                },
              ]);
              yield* patchPocket(id, (summary) => ({
                ...summary,
                pocket: { ...summary.pocket, name, updatedAt: now, syncAt: null },
              }));
            });
          },
          type(id, type) {
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit([
                {
                  sql: `UPDATE pockets SET
                      pocket_type = $1, pocket_updated_at = $2, pocket_sync_at = NULL
                    WHERE pocket_id = $3`,
                  bindings: [type, now, id],
                },
              ]);
              yield* patchPocket(id, (summary) => ({
                ...summary,
                pocket: { ...summary.pocket, type, updatedAt: now, syncAt: null },
              }));
            });
          },
          ordering(items) {
            if (items.length === 0) return Effect.void;
            return Effect.gen(function* () {
              const now = Date.now();
              yield* commit(
                items.map(({ id, order }) => ({
                  sql: `UPDATE pockets SET
                      pocket_ordering = $1, pocket_updated_at = $2, pocket_sync_at = NULL
                    WHERE pocket_id = $3`,
                  bindings: [order, now, id],
                })),
              );
              const next = new Map(items.map(({ id, order }) => [id, order]));
              yield* SubscriptionRef.update(ref, (current) =>
                current
                  .map((summary) => {
                    const order = next.get(summary.pocket.id);
                    if (order === undefined) return summary;
                    return {
                      ...summary,
                      pocket: { ...summary.pocket, ordering: order, updatedAt: now, syncAt: null },
                    };
                  })
                  .sort(byPocketOrder),
              );
            });
          },
        },
        delete: {
          byId(id) {
            return Effect.gen(function* () {
              const now = Date.now();
              // The FK cascade only fires on a physical delete; a soft delete has
              // to take the pocket's entries with it explicitly.
              yield* commit([
                {
                  sql: `UPDATE money SET
                      money_deleted_at = $1, money_updated_at = $1, money_sync_at = NULL
                    WHERE pocket_id = $2 AND money_deleted_at IS NULL`,
                  bindings: [now, id],
                },
                {
                  sql: `UPDATE pockets SET
                      pocket_deleted_at = $1, pocket_updated_at = $1, pocket_sync_at = NULL
                    WHERE pocket_id = $2`,
                  bindings: [now, id],
                },
              ]);
              yield* SubscriptionRef.update(ref, (current) =>
                current.filter((summary) => summary.pocket.id !== id),
              );
              yield* bumpRevision();
            });
          },
        },
      },
      entries: {
        get: {
          byRange(pocketId, start, end) {
            return db
              .selectMany<EntryRow>(SELECT_ENTRIES_BY_RANGE, [pocketId, start, end])
              .pipe(Effect.mapError(dbErrorToMoneyError), Effect.map((rows) => rows.map(rowToEntry)));
          },
          all(pocketId) {
            return db.selectMany<EntryRow>(SELECT_ENTRIES, [pocketId]).pipe(
              Effect.mapError(dbErrorToMoneyError),
              Effect.map((rows) => rows.map(rowToEntry)),
            );
          },
          last(pocketId, timestamp) {
            return db.selectMany<{ money_value: number }>(SELECT_LAST, [pocketId, timestamp]).pipe(
              Effect.mapError(dbErrorToMoneyError),
              Effect.map((rows) => rows[0]?.money_value ?? 0),
            );
          },
          revision: revisionRef.changes,
        },
        add: {
          one(input) {
            return Effect.gen(function* () {
              const id = generateId();
              const now = Date.now();
              yield* commit([insertEntryStatement(id, input, now)]);
              yield* noteLatest(input);
              yield* bumpRevision();
              return id;
            });
          },
          imported(input) {
            return Effect.gen(function* () {
              const duplicate = yield* db
                .selectMany<{ timestamp: number }>(SELECT_DUPLICATE, [
                  input.pocketId,
                  input.timestamp,
                ])
                .pipe(Effect.mapError(dbErrorToMoneyError));
              if (duplicate.length > 0) {
                return yield* Effect.fail(new DuplicateError(String(duplicate[0].timestamp)));
              }
              const id = generateId();
              const now = Date.now();
              yield* commit([insertEntryStatement(id, input, now)]);
              yield* noteLatest(input);
              yield* bumpRevision();
            });
          },
        },
        delete: {
          byId(id) {
            return Effect.gen(function* () {
              const rows = yield* db
                .selectMany<{ pocket_id: string }>(SELECT_POCKET_OF_ENTRY, [id])
                .pipe(Effect.mapError(dbErrorToMoneyError));
              if (rows.length === 0) return;
              const now = Date.now();
              yield* commit([
                {
                  sql: `UPDATE money SET
                      money_deleted_at = $1, money_updated_at = $1, money_sync_at = NULL
                    WHERE money_id = $2`,
                  bindings: [now, id],
                },
              ]);
              yield* refreshPocket(rows[0].pocket_id);
              yield* bumpRevision();
            });
          },
        },
      },
      refresh: () => hydrate(),
    };
  }),
);
