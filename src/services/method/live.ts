import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import {
  MethodError,
  MethodService,
  type Method,
  type MethodCatalog,
  type MethodDefaults,
  type MethodInput,
} from ".";
import { DEFAULTABLE_KINDS, type DefaultableKind, type MethodKind } from "~/lib/constants";
import { DatabaseService } from "../db";
import { StoreService } from "../store";
import { generateId } from "~/lib/random";

type MethodRow = {
  method_id: string;
  method_name: string | null;
  method_kind: MethodKind;
  method_deleted_at: number | null;
};

// The catalog is a handful of rows. There is no `method_ordering` column, so
// SQLite's NULLS-first ordering puts each kind's base method (name IS NULL)
// ahead of its named variants.
const SELECT_METHODS = `
  SELECT method_id, method_name, method_kind, method_deleted_at
  FROM methods
  WHERE method_deleted_at IS NULL
  ORDER BY method_kind, method_name`;

// The defaults live in store.json rather than the table, one key per kind. It is
// a preference about how the POS pays, not a property of the method.
const DEFAULT_KEY = (kind: DefaultableKind) => `default-${kind}`;

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
    const store = yield* StoreService;

    // One ref holds both slices: the catalog lives in SQLite and the defaults in
    // store.json, and the page has to render them together.
    const ref = yield* SubscriptionRef.make<MethodCatalog>({ methods: [], defaults: {} });
    let loaded = false;

    function toMethodError(error: { message: string }): MethodError {
      return new MethodError({ message: error.message });
    }

    function loadMethods(): Effect.Effect<Method[], MethodError> {
      return db
        .selectMany<MethodRow>(SELECT_METHODS)
        .pipe(Effect.mapError(toMethodError), Effect.map((rows) => rows.map(rowToMethod)));
    }

    function loadDefaults(): Effect.Effect<MethodDefaults, MethodError> {
      return Effect.gen(function* () {
        const entries = yield* Effect.forEach(
          DEFAULTABLE_KINDS,
          (kind) =>
            store.get<unknown>(DEFAULT_KEY(kind)).pipe(
              // An unset default and one that was just cleared are the same thing.
              Effect.catchTag("NotFound", () => Effect.succeed(null)),
              Effect.mapError(toMethodError),
              Effect.map((id) => [kind, id] as const),
            ),
          { concurrency: "unbounded" },
        );
        const defaults: MethodDefaults = {};
        for (const [kind, id] of entries) {
          if (typeof id === "string" && id !== "") defaults[kind] = id;
        }
        return defaults;
      });
    }

    function load(): Effect.Effect<MethodCatalog, MethodError> {
      return Effect.all([loadMethods(), loadDefaults()], { concurrency: "unbounded" }).pipe(
        Effect.map(([methods, defaults]) => ({ methods, defaults })),
      );
    }

    function hydrate(): Effect.Effect<void, MethodError> {
      return Effect.gen(function* () {
        const catalog = yield* load();
        yield* SubscriptionRef.set(ref, catalog);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, MethodError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: { sql: string; bindings: (string | number | null)[] }[]) {
      return db.transaction(statements).pipe(Effect.mapError(toMethodError));
    }

    const snapshots = Stream.unwrap(ensureLoaded().pipe(Effect.as(ref.changes)));

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref)), Effect.map(all)),
        catalog: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(ref))),
        // Both views come off the one ref, so `changes` re-emits when only the
        // defaults moved; the method array keeps its identity, so readers that
        // only care about the catalog see the same list.
        changes: snapshots.pipe(Stream.map(all)),
        catalogChanges: snapshots,
      },
      add(input: MethodInput) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* commit([
            {
              sql: `INSERT INTO methods (
                  method_id, method_name, method_kind,
                  method_deleted_at, method_updated_at, method_sync_at
                ) VALUES ($1, $2, $3, NULL, $4, NULL)`,
              bindings: [id, input.name, input.kind, now],
            },
          ]);
          yield* hydrate();
          return id;
        });
      },
      set: {
        name(id, name) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE methods SET
                    method_name = $1, method_updated_at = $2, method_sync_at = NULL
                  WHERE method_id = $3`,
                bindings: [name, now, id],
              },
            ]);
            yield* hydrate();
          });
        },
        default(kind, id) {
          return Effect.gen(function* () {
            yield* (id === null
              ? store.remove(DEFAULT_KEY(kind))
              : store.set(DEFAULT_KEY(kind), id)
            ).pipe(Effect.mapError(toMethodError));
            yield* SubscriptionRef.update(ref, (catalog) => {
              const defaults = { ...catalog.defaults };
              if (id === null) delete defaults[kind];
              else defaults[kind] = id;
              return { ...catalog, defaults };
            });
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            // Soft delete: `record_methods` has a foreign key onto this row.
            yield* commit([
              {
                sql: `UPDATE methods SET
                    method_deleted_at = $1, method_updated_at = $1, method_sync_at = NULL
                  WHERE method_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* hydrate();
          });
        },
      },
    };
  }),
);

function all(catalog: MethodCatalog): Method[] {
  return catalog.methods;
}
