import { Either } from "effect";
import { useMutation } from "~/components/Loader";
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
