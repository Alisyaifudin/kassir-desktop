import { Effect } from "effect";
import { sizeLoader } from "~/layouts/root";
import { log } from "~/lib/log";
import { store } from "~/store";
import type { StoreError } from "~/store/error";
import type { Size } from "~/store/size/get";

export type { Size };

/** Reads the persisted UI size loaded once by the root layout. */
export function useSize() {
  return sizeLoader.useData();
}

/**
 * Shows the new size immediately and persists it in the background. On failure
 * the loader rolls back to the previous size. Returns an error message or `null`.
 */
export async function setSize(size: Size): Promise<null | string> {
  const error = await sizeLoader.setOptimistic(size, persist);
  return error === null ? null : error.e.message;
}

/** Writes the size to the store, reporting failure as a value (`null | StoreError`). */
function persist(size: Size): Effect.Effect<null | StoreError> {
  return store.size.set(size).pipe(
    Effect.as(null),
    Effect.catchTag("StoreError", (error) => {
      log.error(error.e);
      return Effect.succeed(error);
    }),
  );
}
