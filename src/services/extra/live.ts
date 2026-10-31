import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { ExtraError, ExtraService, type Extra, type ExtraInput } from ".";
import type { ValueKind } from "~/lib/constants";
import { DatabaseService, type DbError } from "../db";
import { generateId } from "~/lib/random";

type ExtraRow = {
  extra_id: string;
  extra_name: string;
  extra_value: number;
  extra_kind: ValueKind;
  extra_flag: number;
  extra_updated_at: number;
  extra_sync_at: number | null;
};

// The catalog is a handful of rows, so it fits the one-ref model. Ordering lives
// in SQL so every reader sees the same list.
const SELECT_EXTRAS = `
  SELECT extra_id, extra_name, extra_value, extra_kind, extra_flag,
         extra_updated_at, extra_sync_at
  FROM extras
  WHERE extra_deleted_at IS NULL
  ORDER BY extra_name COLLATE NOCASE ASC, extra_id ASC`;

const SELECT_EXTRA_ONE = `
  SELECT extra_id, extra_name, extra_value, extra_kind, extra_flag,
         extra_updated_at, extra_sync_at
  FROM extras
  WHERE extra_deleted_at IS NULL AND extra_id = $1`;

/** Mirrors `ORDER BY extra_name COLLATE NOCASE ASC, extra_id ASC`. */
function byExtraOrder(a: Extra, b: Extra): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

function dbErrorToExtraError(error: DbError): ExtraError {
  return new ExtraError({ message: error.message });
}

function rowToExtra(row: ExtraRow): Extra {
  return {
    id: row.extra_id,
    name: row.extra_name,
    value: row.extra_value,
    kind: row.extra_kind,
    flag: row.extra_flag,
    updatedAt: row.extra_updated_at,
    syncAt: row.extra_sync_at,
  };
}

export const ExtraLive = Layer.effect(
  ExtraService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Seeded empty so layer construction stays synchronous; the first
    // subscriber or read hydrates it.
    const extrasRef = yield* SubscriptionRef.make<Extra[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Extra[], ExtraError> {
      return db
        .selectMany<ExtraRow>(SELECT_EXTRAS)
        .pipe(Effect.mapError(dbErrorToExtraError), Effect.map((rows) => rows.map(rowToExtra)));
    }

    function hydrate(): Effect.Effect<void, ExtraError> {
      return Effect.gen(function* () {
        const extras = yield* load();
        yield* SubscriptionRef.set(extrasRef, extras);
        loaded = true;
      });
    }

    /**
     * Re-reads one charge after a write and folds it into the ref — a rename can
     * move it, so the list is re-sorted with the same rule SQL uses.
     */
    function refreshExtra(id: string): Effect.Effect<void, ExtraError> {
      return Effect.gen(function* () {
        const rows = yield* db
          .selectMany<ExtraRow>(SELECT_EXTRA_ONE, [id])
          .pipe(Effect.mapError(dbErrorToExtraError));
        const next = rows[0] === undefined ? undefined : rowToExtra(rows[0]);
        yield* SubscriptionRef.update(extrasRef, (current) => {
          const others = current.filter((extra) => extra.id !== id);
          if (next === undefined) return others;
          return [...others, next].sort(byExtraOrder);
        });
      });
    }

    function ensureLoaded(): Effect.Effect<void, ExtraError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: { sql: string; bindings: (string | number | null)[] }[]) {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToExtraError));
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(extrasRef))),
        // Hydrates on first subscribe, so `useStream` stays in `init` until the
        // rows arrive, then replays the catalog and every change.
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(extrasRef.changes))),
      },
      add(input: ExtraInput) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* commit([
            {
              sql: `INSERT INTO extras (
                  extra_id, extra_name, extra_value, extra_kind, extra_flag,
                  extra_updated_at, extra_sync_at, extra_deleted_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NULL)`,
              bindings: [id, input.name, input.value, input.kind, input.flag, now],
            },
          ]);
          yield* refreshExtra(id);
          return id;
        });
      },
      set: {
        info(id, input) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE extras SET
                    extra_name = $1, extra_value = $2, extra_kind = $3, extra_flag = $4,
                    extra_updated_at = $5, extra_sync_at = NULL
                  WHERE extra_id = $6`,
                bindings: [input.name, input.value, input.kind, input.flag, now, id],
              },
            ]);
            yield* refreshExtra(id);
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE extras SET
                    extra_deleted_at = $1, extra_updated_at = $1, extra_sync_at = NULL
                  WHERE extra_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* refreshExtra(id);
          });
        },
      },
      refresh: () => hydrate(),
    };
  }),
);
