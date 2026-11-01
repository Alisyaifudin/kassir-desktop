import { Either } from "effect";
import { useBack } from "~/services/route/react";
import { useMutation } from "~/components/Loader";
import { log } from "~/lib/log";
import { service } from "~/services";

/**
 * Soft-deletes the extra, then leaves the screen it was on.
 *
 * The extra is gone, so its page is: `useBack` pops it off the stack and returns
 * to the list it was opened from, rather than pushing an entry for a screen nobody
 * is on any more.
 */
export function useDel(id: string) {
  const back = useBack("/extras");
  const { pending, error, mutate } = useMutation(service.extra.delete.byId);

  async function handleDelete() {
    const result = await mutate(id);
    if (Either.isLeft(result)) {
      log.error(result.left);
      return;
    }
    back();
  }

  return { error: error?.message ?? null, loading: pending, handleDelete };
}
