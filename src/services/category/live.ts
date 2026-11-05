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
// Ordering lives in SQL so every reader sees the same list, over the same
// `category_name_idx` (name, `COLLATE NOCASE`) the list and the duplicate check
// share. `category_id` breaks the tie so two same-named rows stay put.
const SELECT_CATEGORIES = `
  SELECT category_id, category_name, category_updated_at, category_sync_at
  FROM categories
  WHERE category_deleted_at IS NULL
  ORDER BY category_name COLLATE NOCASE ASC, category_id ASC`;

const SELECT_CATEGORY_ONE = `
  SELECT category_id, category_name, category_updated_at, category_sync_at
  FROM categories
  WHERE category_deleted_at IS NULL AND category_id = $1`;

/**
 * Does a live row other than `exceptId` already carry this name?
 *
 * `$2 IS NULL` is the "no row to exclude" case (a create), so one statement
 * serves both `add` and `set.name`. `COLLATE NOCASE` is the same comparison the
 * form makes: "Minuman" and "minuman" are one category to a human.
 */
const SELECT_CATEGORY_BY_NAME = `
  SELECT category_id FROM categories
  WHERE category_deleted_at IS NULL
    AND category_name = $1 COLLATE NOCASE
    AND ($2 IS NULL OR category_id <> $2)
  LIMIT 1`;

/** Mirrors `ORDER BY category_name COLLATE NOCASE ASC, category_id ASC`. */
function byCategoryOrder(a: Category, b: Category): number {
  const byName = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  return byName !== 0 ? byName : a.id.localeCompare(b.id);
}

function dbErrorToCategoryError(error: DbError): CategoryError {
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

    /**
     * The one-live-row-per-name rule, asked before a write.
     *
     * It lives here rather than in the schema because it is a rule of the picker,
     * not of the wire: `migration-55` dropped `category_name_unique` when a
     * category named the same on two devices became a legal row that a pull page
     * must store (`SYNC-V2.md` §8.7, migration-55). A rename is the same question
     * with its own row excluded.
     */
    function nameTaken(
      name: string,
      exceptId: string | null,
    ): Effect.Effect<boolean, CategoryError> {
      return db
        .selectMany<{ category_id: string }>(SELECT_CATEGORY_BY_NAME, [name, exceptId])
        .pipe(
          Effect.mapError(dbErrorToCategoryError),
          Effect.map((rows) => rows.length > 0),
        );
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
          const taken = yield* nameTaken(input.name, null);
          if (taken) return yield* Effect.fail(new CategoryDuplicateName({ value: input.name }));

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
            .pipe(Effect.mapError(dbErrorToCategoryError));
          yield* refreshCategory(id);
          return id;
        });
      },
      set: {
        name(id, name) {
          return Effect.gen(function* () {
            const taken = yield* nameTaken(name, id);
            if (taken) return yield* Effect.fail(new CategoryDuplicateName({ value: name }));

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
              .pipe(Effect.mapError(dbErrorToCategoryError));
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
