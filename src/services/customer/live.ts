import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { CustomerError, CustomerService, type Customer } from ".";
import { type Binding, type DbError, DatabaseService } from "../db";
import { generateId } from "~/lib/random";

type CustomerRow = {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_updated_at: number;
  customer_sync_at: number | null;
};

// Internal state keeps sync bookkeeping even though the public contract only
// exposes `Customer`.
type CustomerState = Customer & { updatedAt: number; syncAt: number | null };

function rowToCustomerState(row: CustomerRow): CustomerState {
  return {
    id: row.customer_id,
    name: row.customer_name,
    phone: row.customer_phone,
    updatedAt: row.customer_updated_at,
    syncAt: row.customer_sync_at,
  };
}

function toCustomer({ id, name, phone }: CustomerState): Customer {
  return { id, name, phone };
}

function sortByName(customers: readonly CustomerState[]): CustomerState[] {
  return [...customers].sort((a, b) => a.name.localeCompare(b.name));
}

function dbErrorToCustomerError(dbError: DbError): CustomerError {
  return new CustomerError({ message: dbError.message });
}

const SELECT_ALL =
  "SELECT customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at FROM customers ORDER BY customer_name COLLATE NOCASE ASC";

export const CustomerLive = Layer.effect(
  CustomerService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Single source of truth for the list. Seeded empty so layer construction
    // stays synchronous; the first subscriber/read hydrates it.
    const customersRef = yield* SubscriptionRef.make<CustomerState[]>([]);
    let loaded = false;

    function loadAll(): Effect.Effect<CustomerState[], CustomerError> {
      return db
        .selectMany<CustomerRow>(SELECT_ALL)
        .pipe(
          Effect.mapError(dbErrorToCustomerError),
          Effect.map((rows) => sortByName(rows.map(rowToCustomerState))),
        );
    }

    function hydrate(): Effect.Effect<void, CustomerError> {
      return Effect.gen(function* () {
        const customers = yield* loadAll();
        yield* SubscriptionRef.set(customersRef, customers);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, CustomerError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function mutate(query: string, bindings: Binding[]): Effect.Effect<void, CustomerError> {
      return db.execute(query, bindings).pipe(Effect.mapError(dbErrorToCustomerError));
    }

    return {
      get: {
        all() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(customersRef)),
            Effect.map((customers) => customers.map(toCustomer)),
          );
        },
        unsync() {
          return ensureLoaded().pipe(
            Effect.zipRight(SubscriptionRef.get(customersRef)),
            Effect.map((customers) =>
              customers.filter((c) => c.syncAt === null).map(toCustomer),
            ),
          );
        },
        // Hydrates on first subscribe (so `useStream` stays in `init` until the
        // rows arrive), then replays the current list and every change.
        changes: Stream.unwrap(
          ensureLoaded().pipe(
            Effect.as(
              customersRef.changes.pipe(Stream.map((customers) => customers.map(toCustomer))),
            ),
          ),
        ),
      },
      add(name, phone) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* mutate(
            `INSERT INTO customers (customer_id, customer_name, customer_phone, customer_updated_at, customer_sync_at)
             VALUES ($1, $2, $3, $4, null)`,
            [id, name, phone, now],
          );
          yield* SubscriptionRef.update(customersRef, (customers) =>
            sortByName([...customers, { id, name, phone, updatedAt: now, syncAt: null }]),
          );
          return id;
        });
      },
      set: {
        info(id, info) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* mutate(
              `UPDATE customers SET customer_name = $1, customer_phone = $2,
               customer_sync_at = null, customer_updated_at = $3
               WHERE customer_id = $4`,
              [info.name, info.phone, now, id],
            );
            yield* SubscriptionRef.update(customersRef, (customers) =>
              sortByName(
                customers.map((c) =>
                  c.id === id
                    ? { ...c, name: info.name, phone: info.phone, updatedAt: now, syncAt: null }
                    : c,
                ),
              ),
            );
          });
        },
        sync(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* mutate("UPDATE customers SET customer_sync_at = $1 WHERE customer_id = $2", [
              now,
              id,
            ]);
            yield* SubscriptionRef.update(customersRef, (customers) =>
              customers.map((c) => (c.id === id ? { ...c, syncAt: now } : c)),
            );
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const graveId = generateId();
            const now = Date.now();
            yield* mutate(
              `BEGIN;
               DELETE FROM customers WHERE customer_id = $1;
               INSERT INTO graves (grave_item_id, grave_id, grave_kind, grave_timestamp)
               VALUES ($1, $2, 'customer', $3);
               COMMIT;`,
              [id, graveId, now],
            );
            yield* SubscriptionRef.update(customersRef, (customers) =>
              customers.filter((c) => c.id !== id),
            );
          });
        },
        sync(id) {
          return Effect.gen(function* () {
            yield* mutate(
              `BEGIN;
               DELETE FROM customers WHERE customer_id = $1;
               DELETE FROM graves WHERE grave_item_id = $1 AND grave_kind = 'customer';
               COMMIT;`,
              [id],
            );
            yield* SubscriptionRef.update(customersRef, (customers) =>
              customers.filter((c) => c.id !== id),
            );
          });
        },
      },
    };
  }),
);
