import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { MethodError, MethodService, type Method } from ".";
import type { MethodKind } from "~/lib/constants";
import { DatabaseService } from "../db";

type MethodRow = {
  method_id: string;
  method_name: string | null;
  method_kind: MethodKind;
  method_deleted_at: number | null;
};

// The catalog is a handful of rows, so it fits the single-ref model. There is no
// `method_ordering` column, so SQLite's NULLS-first ordering puts each kind's
// base method (name IS NULL) ahead of its named variants.
const SELECT_METHODS = `
  SELECT method_id, method_name, method_kind, method_deleted_at
  FROM methods
  WHERE method_deleted_at IS NULL
  ORDER BY method_kind, method_name`;

function rowToMethod(row: MethodRow): Method {
  return {
    id: row.method_id,
    name: row.method_name,
    kind: row.method_kind,
    deletedAt: row.method_deleted_at,
  };
}

export const MethodLive = Layer.effect(
  MethodService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    const ref = yield* SubscriptionRef.make<Method[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Method[], MethodError> {
      return db.selectMany<MethodRow>(SELECT_METHODS).pipe(
        Effect.mapError((error) => new MethodError({ message: error.message })),
        Effect.map((rows) => rows.map(rowToMethod)),
      );
    }

    function hydrate(): Effect.Effect<void, MethodError> {
      return Effect.gen(function* () {
        const methods = yield* load();
        yield* SubscriptionRef.set(ref, methods);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, MethodError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes))),
      },
    };
  }),
);
