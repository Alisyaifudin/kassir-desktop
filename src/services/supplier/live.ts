import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { SupplierError, SupplierService, type Supplier, type SupplierInput } from ".";
import { type Binding, type DbError, DatabaseService } from "../db";
import { generateId } from "~/lib/random";

type SupplierRow = {
  supplier_id: string;
  supplier_name: string;
  supplier_note: string;
  supplier_updated_at: number;
  supplier_sync_at: number | null;
};

// Internal state keeps sync bookkeeping even though the public contract only
// exposes `Supplier`.
type SupplierState = Supplier & { updatedAt: number; syncAt: number | null };

function rowToSupplierState(row: SupplierRow): SupplierState {
  return {
    id: row.supplier_id,
    name: row.supplier_name,
    note: row.supplier_note,
    updatedAt: row.supplier_updated_at,
    syncAt: row.supplier_sync_at,
  };
}

function toSupplier({ id, name, note }: SupplierState): Supplier {
  return { id, name, note };
}

function sortByName(suppliers: readonly SupplierState[]): SupplierState[] {
  return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
}

function dbErrorToSupplierError(dbError: DbError): SupplierError {
  return new SupplierError({ message: dbError.message });
}

const SELECT_ALL =
  "SELECT supplier_id, supplier_name, supplier_note, supplier_updated_at, supplier_sync_at FROM suppliers WHERE supplier_deleted_at IS NULL ORDER BY supplier_name COLLATE NOCASE ASC";

export const SupplierLive = Layer.effect(
  SupplierService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Single source of truth for the list. Seeded empty so layer construction
    // stays synchronous; the first subscriber/read hydrates it.
    const suppliersRef = yield* SubscriptionRef.make<SupplierState[]>([]);
    let loaded = false;

    function loadAll(): Effect.Effect<SupplierState[], SupplierError> {
      return db
        .selectMany<SupplierRow>(SELECT_ALL)
        .pipe(
          Effect.mapError(dbErrorToSupplierError),
          Effect.map((rows) => sortByName(rows.map(rowToSupplierState))),
        );
    }

    function hydrate(): Effect.Effect<void, SupplierError> {
      return Effect.gen(function* () {
        const suppliers = yield* loadAll();
        yield* SubscriptionRef.set(suppliersRef, suppliers);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, SupplierError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function mutate(query: string, bindings: Binding[]): Effect.Effect<void, SupplierError> {
      return db.execute(query, bindings).pipe(Effect.mapError(dbErrorToSupplierError));
    }

    return {
      get: {
        all() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(suppliersRef)),
            Effect.map((suppliers) => suppliers.map(toSupplier)),
          );
        },
        unsync() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(suppliersRef)),
            Effect.map((suppliers) =>
              suppliers.filter((s) => s.syncAt === null).map(toSupplier),
            ),
          );
        },
        // Hydrates on first subscribe (so `useStream` stays in `init` until the
        // rows arrive), then replays the current list and every change.
        changes: Stream.unwrap(
          ensureLoaded().pipe(
            Effect.as(
              suppliersRef.changes.pipe(Stream.map((suppliers) => suppliers.map(toSupplier))),
            ),
          ),
        ),
      },
      add(name, note) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* mutate(
            `INSERT INTO suppliers (supplier_id, supplier_name, supplier_note, supplier_updated_at, supplier_sync_at, supplier_deleted_at)
             VALUES ($1, $2, $3, $4, null, null)`,
            [id, name, note, now],
          );
          yield* SubscriptionRef.update(suppliersRef, (suppliers) =>
            sortByName([...suppliers, { id, name, note, updatedAt: now, syncAt: null }]),
          );
          return id;
        });
      },
      set: {
        info(id, info: SupplierInput) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* mutate(
              `UPDATE suppliers SET supplier_name = $1, supplier_note = $2,
               supplier_sync_at = null, supplier_updated_at = $3
               WHERE supplier_id = $4`,
              [info.name, info.note, now, id],
            );
            yield* SubscriptionRef.update(suppliersRef, (suppliers) =>
              sortByName(
                suppliers.map((s) =>
                  s.id === id
                    ? { ...s, name: info.name, note: info.note, updatedAt: now, syncAt: null }
                    : s,
                ),
              ),
            );
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            // Soft delete, per migration-43: a tombstone rather than a row drop.
            yield* mutate(
              `UPDATE suppliers SET supplier_deleted_at = $1,
               supplier_updated_at = $1, supplier_sync_at = null
               WHERE supplier_id = $2`,
              [now, id],
            );
            yield* SubscriptionRef.update(suppliersRef, (suppliers) =>
              suppliers.filter((s) => s.id !== id),
            );
          });
        },
      },
      refresh: () => hydrate(),
    };
  }),
);
