import { Either } from "effect";
import { useNavigate } from "react-router";
import { useMutation } from "~/components/Loader";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { service } from "~/services";

/** Soft-delete the pocket (and its entries), then return to the grid. */
export function useDeletePocket(pocketId: string, onClose: () => void) {
  const urlBack = useGetUrlBack("/money");
  const navigate = useNavigate();
  const { pending, error, mutate } = useMutation(service.money.pockets.delete.byId);

  async function handleDelete() {
    const result = await mutate(pocketId);
    if (Either.isRight(result)) {
      onClose();
      navigate(urlBack);
    }
  }

  return { loading: pending, error: error?.message ?? null, handleDelete };
}
