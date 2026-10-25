import { Either } from "effect";
import { useNavigate } from "react-router";
import { useMutation } from "~/components/Loader";
import { useGetUrlBack } from "~/hooks/use-get-url-back";
import { log } from "~/lib/log";
import { service } from "~/services";

/** Soft-deletes the extra, then returns to the list it was opened from. */
export function useDel(id: string) {
  const navigate = useNavigate();
  const backUrl = useGetUrlBack("/extras");
  const { pending, error, mutate } = useMutation(service.extra.delete.byId);

  async function handleDelete() {
    const result = await mutate(id);
    if (Either.isLeft(result)) {
      log.error(result.left);
      return;
    }
    navigate(backUrl);
  }

  return { error: error?.message ?? null, loading: pending, handleDelete };
}
