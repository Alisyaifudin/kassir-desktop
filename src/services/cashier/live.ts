import { Effect, Layer } from "effect";
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

function compareByName(a: Cashier, b: Cashier): number {
  return a.name.localeCompare(b.name);
}

function dbErrorToCashierError(dbError: DbError): CashierError {
  return new CashierError({ message: dbError.message });
}

export const CashierLive = Layer.effect(
  CashierService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    let cashiers: Cashier[] | null = null;

    function updateCache(id: string, patch: Partial<Omit<Cashier, "id">>) {
      if (cashiers === null) return;
      cashiers = cashiers
        .map((cashier) => (cashier.id === id ? { ...cashier, ...patch } : cashier))
        .sort(compareByName);
    }

    function removeFromCache(id: string) {
      if (cashiers === null) return;
      cashiers = cashiers.filter((cashier) => cashier.id !== id);
    }

    function addToCache(cashier: CashierFull) {
      if (cashiers === null) return;
      const entry: Cashier = { id: cashier.id, name: cashier.name, role: cashier.role };
      cashiers = [...cashiers, entry].sort(compareByName);
    }

    function mutate(
      query: string,
      bindings: Binding[],
      onSuccess?: () => void,
    ): Effect.Effect<void, CashierError> {
      return db.execute(query, bindings).pipe(
        Effect.mapError(dbErrorToCashierError),
        Effect.tap(() => Effect.sync(() => onSuccess?.())),
      );
    }

    function getAll(): Effect.Effect<Cashier[], CashierError> {
      return Effect.gen(function* () {
        if (cashiers !== null) {
          return cashiers;
        }
        const rows = yield* db
          .selectMany<CashierRow>(
            "SELECT cashier_id, cashier_name, cashier_role FROM cashiers ORDER BY cashier_name COLLATE NOCASE ASC",
          )
          .pipe(Effect.mapError(dbErrorToCashierError));
        const result = rows.map(rowToCashier).sort(compareByName);
        cashiers = result;
        return result;
      });
    }

    return {
      get: {
        all: getAll,
        byId(id) {
          return db
            .selectOne<CashierWithHashRow>(
              "SELECT cashier_id, cashier_name, cashier_role, cashier_hash FROM cashiers WHERE cashier_id = $1",
              [id],
            )
            .pipe(
              Effect.catchTag("DbError", (error) =>
                Effect.fail(dbErrorToCashierError(error)),
              ),
              Effect.map(rowToCashierFull),
            );
        },
      },
      set: {
        name(id, name) {
          return mutate(
            "UPDATE cashiers SET cashier_name = $1 WHERE cashier_id = $2",
            [name, id],
            () => updateCache(id, { name }),
          );
        },
        password(id, password) {
          return mutate("UPDATE cashiers SET cashier_hash = $1 WHERE cashier_id = $2", [
            password,
            id,
          ]);
        },
        role(id, role) {
          return mutate(
            "UPDATE cashiers SET cashier_role = $1 WHERE cashier_id = $2",
            [role, id],
            () => updateCache(id, { role }),
          );
        },
      },
      delete(id) {
        return mutate(
          "DELETE FROM cashiers WHERE cashier_id = $1",
          [id],
          () => removeFromCache(id),
        );
      },
      add(cashier) {
        return mutate(
          "INSERT INTO cashiers (cashier_id, cashier_name, cashier_role, cashier_hash) VALUES ($1, $2, $3, $4)",
          [cashier.id, cashier.name, cashier.role, cashier.hash],
          () => addToCache(cashier),
        );
      },
    };
  }),
);
