import { Effect, Context, Data, Stream } from "effect";

export class CategoryError extends Data.TaggedError("CategoryError")<{ message: string }> {}

/**
 * A live category name was taken. The table holds one live row per name,
 * case-insensitively (`category_name_unique`), so "Minuman" and "minuman" are the
 * same category and the second one is refused rather than shown twice in the
 * product form's picker.
 */
export class CategoryDuplicateName extends Data.TaggedError("CategoryDuplicateName")<{
  value: string;
}> {}

/**
 * A label a product can be filed under. A product belongs to zero or more
 * categories (`product_category`), so this is a name and nothing else — no
 * ordering, no colour, no nesting.
 */
export type Category = {
  id: string;
  name: string;
  updatedAt: number;
  syncAt: number | null;
};

/** The editable fields of a category — everything but its id and bookkeeping. */
export type CategoryInput = {
  name: string;
};

export class CategoryService extends Context.Tag("CategoryService")<
  CategoryService,
  {
    /**
     * Re-reads the table after a sync merge. The ref the UI reads is hydrated
     * once and patched by the write paths, so a row that arrived from the server
     * is invisible until this runs. Cheap: the table is a handful of rows.
     */
    refresh: () => Effect.Effect<void, CategoryError>;
    get: {
      all: () => Effect.Effect<Category[], CategoryError>;
      /** Tracks the catalogue by name, so a write reaches every reader. */
      changes: Stream.Stream<Category[], CategoryError>;
    };
    add: (input: CategoryInput) => Effect.Effect<string, CategoryError | CategoryDuplicateName>;
    set: {
      name: (
        id: string,
        name: string,
      ) => Effect.Effect<void, CategoryError | CategoryDuplicateName>;
    };
    /** Soft-deletes the category; rows stay for sync. */
    delete: { byId: (id: string) => Effect.Effect<void, CategoryError> };
  }
>() {}
