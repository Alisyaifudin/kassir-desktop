import { Either } from "effect";
import { useBack } from "~/services/route/react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * Soft-delete the record, then leave the screen it was showing.
 *
 * The record is gone, so its page is gone with it: `useBack` pops it off the stack
 * and returns to the list it was opened from — the day, the mode and the filters it
 * was left on — instead of pushing a new entry for a screen nobody is on any more.
 */
export function useDelete(id: string) {
  const back = useBack("/records");
  const { pending, error, mutate } = useMutation(service.record.delete.byId);

  async function remove() {
    const result = await mutate(id);
    if (Either.isRight(result)) back();
  }

  return { loading: pending, error: error?.message ?? null, remove };
}
