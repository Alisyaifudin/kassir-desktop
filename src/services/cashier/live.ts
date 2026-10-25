import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import { type Cashier, type CashierFull, CashierError, CashierService, type Role } from ".";
import { type Binding, type DbError, DatabaseService } from "../db";

type CashierRow = {
  cashier_id: string;
  cashier_name: string;
  cashier_role: Role;
};

type CashierWithHashRow = CashierRow & {
  cashier_hash: string;
};

function rowToCashier(row: CashierRow): Cashier {
  return {
    id: row.cashier_id,
    name: row.cashier_name,
    role: row.cashier_role,
  };
}

function rowToCashierFull(row: CashierWithHashRow): CashierFull {
  return {
    ...rowToCashier(row),
    hash: row.cashier_hash,
  };
}

function sortByName(cashiers: readonly Cashier[]): Cashier[] {
  return [...cashiers].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Store the canonical form of a name: trimmed, inner whitespace collapsed.
 *
 * Forms already trim the ends, but nothing collapsed "Budi  Santoso", which the
 * login picker, the day list and the receipt all have to render.
 */
function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function dbErrorToCashierError(dbError: DbError): CashierError {
  return new CashierError({ message: dbError.message });
}

const SELECT_ALL =
  "SELECT cashier_id, cashier_name, cashier_role FROM cashiers ORDER BY cashier_name COLLATE NOCASE ASC";

export const CashierLive = Layer.effect(
  CashierService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Single source of truth for the list. Seeded empty so layer construction
    // stays synchronous; the first subscriber/read hydrates it.
    const cashiersRef = yield* SubscriptionRef.make<Cashier[]>([]);
    let loaded = false;

    function loadAll(): Effect.Effect<Cashier[], CashierError> {
      return db
        .selectMany<CashierRow>(SELECT_ALL)
        .pipe(
          Effect.mapError(dbErrorToCashierError),
          Effect.map((rows) => sortByName(rows.map(rowToCashier))),
        );
    }

    function hydrate(): Effect.Effect<void, CashierError> {
      return Effect.gen(function* () {
        const cashiers = yield* loadAll();
        yield* SubscriptionRef.set(cashiersRef, cashiers);
        loaded = true;
      });
    }

    function ensureLoaded(): Effect.Effect<void, CashierError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function mutate(query: string, bindings: Binding[]): Effect.Effect<void, CashierError> {
      return db.execute(query, bindings).pipe(Effect.mapError(dbErrorToCashierError));
    }

    return {
      get: {
        all() {
          return ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(cashiersRef)));
        },
        byId(id) {
          return db
            .selectOne<CashierWithHashRow>(
              "SELECT cashier_id, cashier_name, cashier_role, cashier_hash FROM cashiers WHERE cashier_id = $1",
              [id],
            )
            .pipe(
              Effect.catchTag("DbError", (error) => Effect.fail(dbErrorToCashierError(error))),
              Effect.map(rowToCashierFull),
            );
        },
        // Hydrates on first subscribe (so `useStream` stays in `init` until the
        // rows arrive), then replays the current list and every change.
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(cashiersRef.changes))),
      },
      set: {
        name(id, name) {
          return Effect.gen(function* () {
            const next = normalizeName(name);
            yield* mutate("UPDATE cashiers SET cashier_name = $1 WHERE cashier_id = $2", [
              next,
              id,
            ]);
            yield* SubscriptionRef.update(cashiersRef, (cashiers) =>
              sortByName(cashiers.map((c) => (c.id === id ? { ...c, name: next } : c))),
            );
          });
        },
        password(id, password) {
          return mutate("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_id = $2", [
            password,
            id,
          ]);
        },
        role(id, role) {
          return Effect.gen(function* () {
            yield* mutate("UPDATE cashiers SET cashier_role = $1 WHERE cashier_id = $2", [
              role,
              id,
            ]);
            yield* SubscriptionRef.update(cashiersRef, (cashiers) =>
              cashiers.map((c) => (c.id === id ? { ...c, role } : c)),
            );
          });
        },
      },
      delete(id) {
        return Effect.gen(function* () {
          yield* mutate("DELETE FROM cashiers WHERE cashier_id = $1", [id]);
          yield* SubscriptionRef.update(cashiersRef, (cashiers) =>
            cashiers.filter((c) => c.id !== id),
          );
        });
      },
      add(cashier) {
        return Effect.gen(function* () {
          const name = normalizeName(cashier.name);
          yield* mutate(
            "INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3, $4)",
            [cashier.id, name, cashier.role, cashier.hash],
          );
          yield* SubscriptionRef.update(cashiersRef, (cashiers) =>
            sortByName([...cashiers, { id: cashier.id, name, role: cashier.role }]),
          );
        });
      },
    };
  }),
);
