import { Either } from "effect";
import { useBack } from "~/services/route/react";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

/**
 * Soft-delete the pocket (and its entries), then leave the screen it was on.
 *
 * The pocket is gone, so its history screen is: `useBack` pops it off the stack and
 * returns to the grid it was opened from, rather than pushing an entry for a screen
 * nobody is on any more.
 */
export function useDeletePocket(pocketId: string, onClose: () => void) {
  const back = useBack("/money");
  const { pending, error, mutate } = useMutation(service.money.pockets.delete.byId);

  async function handleDelete() {
    const result = await mutate(pocketId);
    if (Either.isRight(result)) {
      onClose();
      back();
    }
  }

  return { loading: pending, error: error?.message ?? null, handleDelete };
}
