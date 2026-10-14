import { Either, Effect } from "effect";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";
import { useUnselect } from "../use-selected";

export function useDelete({ id, onClose }: { id: string; onClose: () => void }) {
  const unselect = useUnselect();
  const { pending, error, mutate } = useMutation(service.record.delete.byId);

  async function handleDelete() {
    const either = await mutate(id);
    if (Either.isLeft(either)) return;
    // The service bumped its revision, so the list re-reads by itself; all that
    // is left is dropping the selection that pointed at the deleted record.
    unselect();
    onClose();
  }

  return { error: error?.message ?? null, loading: pending, handleDelete };
}

/**
 * Imperative form for the two rollback hooks that undo a committed cart
 * (`Shop/z-Complete`, `Stock-PENDING/z-Complete` — both still unmigrated). Kept
 * as a function rather than only a hook because both call it outside React.
 * Resolves with an error message, or `null` on success.
 */
export function programDeleteRecord(id: string): Effect.Effect<string | null> {
  return service.record.delete.byId(id).pipe(
    Effect.as(null),
    Effect.catchAll((error) => {
      log.error(error.message);
      return Effect.succeed(error.message);
    }),
  );
}
