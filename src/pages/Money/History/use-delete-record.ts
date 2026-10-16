import { Either } from "effect";
import { useMutation } from "~/components/Loader";
import { service } from "~/services";

export function useDeleteRecord(id: string, onClose: () => void) {
  const { pending, error, mutate } = useMutation(service.money.entries.delete.byId);

  async function handleDelete() {
    const result = await mutate(id);
    if (Either.isRight(result)) onClose();
  }

  return { loading: pending, error: error?.message ?? null, handleDelete };
}
