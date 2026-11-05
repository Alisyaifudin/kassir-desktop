import { Effect, Layer, Stream, SubscriptionRef } from "effect";
import {
  CategoryDuplicateName,
  CategoryError,
  CategoryService,
  type Category,
  type CategoryInput,
} from ".";
import { DatabaseService, type DbError } from "../db";
import { generateId } from "~/lib/random";

type CategoryRow = {
  category_id: string;
  category_name: string;
  category_updated_at: number;
  category_sync_at: number | null;
};

// A shop has a handful of categories, so the whole table fits the one-ref model.
// Ordering lives in SQL so every reader sees the same list, and it is the same
// order `category_name_unique` already holds the rows in.
const SELECT_CATEGORIES = `
  SELECT category_id, category_name, category_updated_at, category_sync_at
  FROM categories
  WHERE category_deleted_at IS NULL
  ORDER BY category_name COLLATE NOCASE ASC, category_id ASC`;

const SELECT_CATEGORY_ONE = `
  SELECT category_id, category_name, category_updated_at, category_sync_at
  FROM categories
  WHERE category_deleted_at IS NULL AND category_id = $1`;

/** Mirrors `ORDER BY category_name COLLATE NOCASE ASC, category_id ASC`. */
function byCategoryOrder(a: Category, b: Category): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

function dbErrorToCategoryError(error: DbError): CategoryError {
  return new CategoryError({ message: error.message });
}

/**
 * A name that is already taken is not a failure the shop can do nothing about —
 * it is the one thing the form can fix, so it gets its own error.
 *
 * `DbError.message` is the cashier-facing sentence; the driver text (where SQLite
 * names the failed index) lives in `detail`. Both are checked so this still works
 * against a layer that folds them together.
 */
function nameErrorToCategoryError(
  error: DbError,
  name: string,
): CategoryError | CategoryDuplicateName {
  const driver = `${error.message} ${error.detail}`;
  if (/UNIQUE constraint failed/i.test(driver) && /category_name/i.test(driver)) {
    return new CategoryDuplicateName({ value: name });
  }
  return new CategoryError({ message: error.message });
}

function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.category_id,
    name: row.category_name,
    updatedAt: row.category_updated_at,
    syncAt: row.category_sync_at,
  };
}

export const CategoryLive = Layer.effect(
  CategoryService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    // Seeded empty so layer construction stays synchronous; the first subscriber
    // or read hydrates it.
    const categoriesRef = yield* SubscriptionRef.make<Category[]>([]);
    let loaded = false;

    function load(): Effect.Effect<Category[], CategoryError> {
      return db
        .selectMany<CategoryRow>(SELECT_CATEGORIES)
        .pipe(
          Effect.mapError(dbErrorToCategoryError),
          Effect.map((rows) => rows.map(rowToCategory)),
        );
    }

    function hydrate(): Effect.Effect<void, CategoryError> {
      return Effect.gen(function* () {
        const categories = yield* load();
        yield* SubscriptionRef.set(categoriesRef, categories);
        loaded = true;
      });
    }

    /**
     * Re-reads one category after a write and folds it into the ref — a rename can
     * move it, so the list is re-sorted with the same rule SQL uses.
     */
    function refreshCategory(id: string): Effect.Effect<void, CategoryError> {
      return Effect.gen(function* () {
        const rows = yield* db
          .selectMany<CategoryRow>(SELECT_CATEGORY_ONE, [id])
          .pipe(Effect.mapError(dbErrorToCategoryError));
        const next = rows[0] === undefined ? undefined : rowToCategory(rows[0]);
        yield* SubscriptionRef.update(categoriesRef, (current) => {
          const others = current.filter((category) => category.id !== id);
          if (next === undefined) return others;
          return [...others, next].sort(byCategoryOrder);
        });
      });
    }

    function ensureLoaded(): Effect.Effect<void, CategoryError> {
      return Effect.gen(function* () {
        if (loaded) return;
        yield* hydrate();
      });
    }

    function commit(statements: { sql: string; bindings: (string | number | null)[] }[]) {
      return db.transaction(statements).pipe(Effect.mapError(dbErrorToCategoryError));
    }

    return {
      get: {
        all: () => ensureLoaded().pipe(Effect.zipRight(SubscriptionRef.get(categoriesRef))),
        // Hydrates on first subscribe, so `useStream` stays in `init` until the
        // rows arrive, then replays the catalogue and every change.
        changes: Stream.unwrap(ensureLoaded().pipe(Effect.as(categoriesRef.changes))),
      },
      add(input: CategoryInput) {
        return Effect.gen(function* () {
          const id = generateId();
          const now = Date.now();
          yield* db
            .transaction([
              {
                sql: `INSERT INTO categories (
                    category_id, category_name, category_updated_at, category_sync_at,
                    category_deleted_at
                  ) VALUES ($1, $2, $3, NULL, NULL)`,
                bindings: [id, input.name, now],
              },
            ])
            .pipe(Effect.mapError((error) => nameErrorToCategoryError(error, input.name)));
          yield* refreshCategory(id);
          return id;
        });
      },
      set: {
        name(id, name) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* db
              .transaction([
                {
                  sql: `UPDATE categories SET
                      category_name = $1,
                      category_updated_at = max($2, category_updated_at + 1),
                      category_sync_at = NULL
                    WHERE category_id = $3`,
                  bindings: [name, now, id],
                },
              ])
              .pipe(Effect.mapError((error) => nameErrorToCategoryError(error, name)));
            yield* refreshCategory(id);
          });
        },
      },
      delete: {
        byId(id) {
          return Effect.gen(function* () {
            const now = Date.now();
            yield* commit([
              {
                sql: `UPDATE categories SET
                    category_deleted_at = max($1, category_updated_at + 1),
                    category_updated_at = max($1, category_updated_at + 1),
                    category_sync_at = NULL
                  WHERE category_id = $2`,
                bindings: [now, id],
              },
            ]);
            yield* refreshCategory(id);
          });
        },
      },
      refresh: () => hydrate(),
    };
  }),
);
